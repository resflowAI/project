from collections import defaultdict
from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends

from api.models.Filter import Filters, get_filters
from api.models.timeline import TsPoint, TsSeriesDef, LineTimeseriesResponse, MultilineTimelinePoint, MultilineTimeline
from api.src.clickhouse import get_clickhouse
from api.utils.clauses_generation import generate_where_clause

router = APIRouter(prefix="/timeline")


@router.get("/count_timeline", response_model=LineTimeseriesResponse)
async def count_timeline(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters)
):
    query = f"""
        SELECT
            date,
            floor(AVG(count(*)) OVER (ORDER BY date ROWS BETWEEN 3 PRECEDING AND CURRENT ROW), 0)
        FROM comments
        WHERE {generate_where_clause(filters)}
        GROUP BY date
        ORDER BY date
    """
    rows = connection.query(query).result_rows

    points = [
        TsPoint(t=row[0], value={"metricKey_1": row[1]})
        for row in rows
    ]

    series = [
        TsSeriesDef(
            key="metricKey_1",
            label="Количество отзывов",
            yAxis="left"
        )
    ]

    response = LineTimeseriesResponse(
        title="Динамика количества отзывов",
        data=points,
        series=series
    )

    return response


@router.get("/rating_timeline", response_model=LineTimeseriesResponse)
async def rating_timeline(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters)
):
    query = f"""
        WITH daily AS (
            SELECT
                date,
                avg(rating) AS daily_avg
            FROM comments
            WHERE {generate_where_clause(filters)}
            GROUP BY date
        )
        SELECT
            date,
            round(avg(daily_avg) OVER (
                ORDER BY date
                ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
            ), 2) AS moving_avg
        FROM daily
        ORDER BY date
    """
    rows = connection.query(query).result_rows

    points = [
        TsPoint(t=row[0], value={"metricKey_1": round(row[1], 2)})
        for row in rows
    ]

    series = [
        TsSeriesDef(
            key="metricKey_1",
            label="Средний рейтинг",
            yAxis="left"
        )
    ]

    response = LineTimeseriesResponse(
        title="Динамика среднего рейтинга",
        data=points,
        series=series
    )

    return response


@router.get("/tags_count_timeline", response_model=MultilineTimeline)
async def tags_count_timeline(
        connection: Any = Depends(get_clickhouse),
        filters: Filters = Depends(get_filters),
):
    rows = connection.query(
        f"""
        SELECT
            date,
            key,
            COUNT(*) AS cnt
        FROM comments
        ARRAY JOIN mapKeys(tags) AS key
        WHERE {generate_where_clause(filters)}
        GROUP BY date, key
        ORDER BY date
        """
    ).result_rows
    data_by_date = defaultdict(dict)
    for t, key, cnt in rows:
        if (filters.tags and key in filters.tags) or not filters.tags:
            data_by_date[t][key] = cnt

    unique_keys = sorted({key for _, key, _ in rows if (filters.tags and key in filters.tags) or not filters.tags})
    series_defs = [
        TsSeriesDef(key=f"metricKey_{i}", label=key, yAxis="left")
        for i, key in enumerate(unique_keys)
    ]

    data_points = []
    for t in sorted(data_by_date):
        value_dict = {
            f"metricKey_{unique_keys.index(k)}": v
            for k, v in data_by_date[t].items()
        }
        data_points.append(MultilineTimelinePoint(t=t, value=value_dict))

    return MultilineTimeline(
        data=data_points,
        series=series_defs
    )


@router.get("/avg_tags_mark", response_model=MultilineTimeline)
async def avg_tag_mark(
        connection: Any = Depends(get_clickhouse),
        filters: Filters = Depends(get_filters),
):
    rows = connection.query(
        f"""
        SELECT
            date,
            key,
            round(
                AVG(value) OVER (
                    PARTITION BY key
                    ORDER BY date
                    ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
                ) * 50 + 50,
                3
            ) AS avg_val
        FROM comments
        ARRAY JOIN
            mapKeys(tags) AS key,
            mapValues(tags) AS value
        WHERE {generate_where_clause(filters)}
        ORDER BY date, key
        """
    ).result_rows

    unique_keys = sorted({key for _, key, _ in rows if (filters.tags and key in filters.tags) or not filters.tags})
    series_defs = [
        TsSeriesDef(key=f"metricKey_{i}", label=key, yAxis="left")
        for i, key in enumerate(unique_keys)
    ]

    data_by_date = defaultdict(dict)
    for t, key, avg_mark in rows:
        if (filters.tags and key in filters.tags) or not filters.tags:
            data_by_date[t][f"metricKey_{unique_keys.index(key)}"] = avg_mark

    data_points = [
        MultilineTimelinePoint(t=t, value=value_dict)
        for t, value_dict in sorted(data_by_date.items())
    ]

    return MultilineTimeline(
        data=data_points,
        series=series_defs
    )


@router.get("/key_rate_tags_mark_correlation")
async def key_rate_tags_mark_correlation(
        connection: Any = Depends(get_clickhouse),
        filters: Filters = Depends(get_filters),
):

    def generate_where_date_clause(filt: Filters):
        expr = []
        if filt.start_date:
            expr.append(f"toDate(date) >= '{filt.start_date}'")
        if filt.end_date:
            expr.append(f"toDate(date) <= '{filt.end_date}'")
        return " AND ".join(expr) if len(expr) > 0 else "True"

    clickhouse_rows = connection.query(
        f"""
            SELECT
                date,
                'Средний сентимент' AS metric,
                FLOOR(
                    AVG(avg_val) OVER (
                        ORDER BY date
                        ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
                    ), 3
                ) AS val
            FROM (
                SELECT
                    date,
                    AVG(value * 50 + 50) AS avg_val
                FROM comments
                ARRAY JOIN
                    mapKeys(tags) AS key,
                    mapValues(tags) AS value
                WHERE {generate_where_clause(filters)}
                GROUP BY date
            ) t
            ORDER BY date
            UNION ALL
            SELECT date, 'Ключевая ставка', rate FROM key_rate WHERE {generate_where_date_clause(filters)}
            """
    ).result_rows

    rows = [
        {'date': data[0].strftime('%Y-%m-%d'), 'value': data[2], 'source': data[1]}
        for data in clickhouse_rows
    ]
    data_by_date = defaultdict(dict)
    for row in rows:
        data_by_date[row['date']][row['source']] = row['value']

    data_points = [
        MultilineTimelinePoint(t=key, value=value_dict)
        for key, value_dict in data_by_date.items()
    ]
    data_points.sort(key=lambda x: x.t)

    series_defs = [
        TsSeriesDef(key=i, label=i, yAxis="left")
        for i in set(map(lambda x: x['source'], rows))
    ]

    return MultilineTimeline(
        data=data_points,
        series=series_defs
    )
