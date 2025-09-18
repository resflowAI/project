from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from api.models.Filter import Filters, get_filters
from api.utils.clauses_generation import generate_where_clause
from api.src.clickhouse import get_clickhouse
from typing import Annotated, Any
import csv
import io

router = APIRouter(prefix="/csv")


@router.get("/tags_statistic")
async def download_tags_statistic(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters),
):
    query = f"""
        SELECT
            tag,
            count(*) AS mentions,
            sum(if(sentiment = 1, 1, 0)) AS positive,
            sum(if(sentiment = 0, 1, 0)) AS neutral,
            sum(if(sentiment = -1, 1, 0)) AS negative,
            floor(AVG(rating), 2) AS avg_rating
        FROM
        (
            SELECT
                arrayJoin(mapKeys(tags)) AS tag,
                arrayJoin(mapValues(tags)) AS sentiment,
                rating
            FROM comments
            WHERE {generate_where_clause(filters)}
        )
        GROUP BY tag
        ORDER BY mentions DESC
    """
    rows = connection.query(query).result_rows
    for i in range(len(rows)):
        rows[i] = list(rows[i])
        rows[i].append(100 * round(rows[i][2] / rows[i][1], 2))
    columns = ["сервис/услуга", "кол-во упоминаний", "позитивных упоминаний", "нейтральных упоминаний",
               "негативных упоминаний", "ср. рейтинг", "ср. сентимент"]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(columns)
    writer.writerows(rows)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tags_statistic.csv"}
    )


@router.get("/timeline")
async def download_timeline(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters),
):
    query = f"""
        SELECT
            date,
            count() AS reviews_count,
            round(AVG(rating), 2) AS avg_rating,
            round(AVG(sentiment * 50 + 50), 2) AS avg_sentiment
        FROM comments
        ARRAY JOIN mapValues(tags) AS sentiment
        WHERE {generate_where_clause(filters)}
        GROUP BY date
        ORDER BY date
    """
    rows = connection.query(query).result_rows
    columns = ["дата", "кол-во отзывов", "ср. рейтинг", "ср. сентимент"]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(columns)
    writer.writerows(rows)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=timeline.csv"}
    )


@router.get("/data_table")
async def data_table(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters),
):
    query = f"""
        SELECT
            date,
            comment,
            name,
            rating,
            bank,
            service,
            tags,
            source
        FROM comments
        WHERE {generate_where_clause(filters)}
        ORDER BY date DESC
        LIMIT 5000
    """
    rows = connection.query(query).result_rows
    columns = ["дата", "отзыв", "имя", "рейтинг", "банк", "сервис", "продукты/услуги", "источник получения"]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(columns)
    writer.writerows(rows)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=timeline.csv"}
    )

