from fastapi import APIRouter, Depends
from typing import Annotated, Any
from api.src.clickhouse import get_clickhouse
from api.models.treemap import TreemapNode, TreemapResponse
from api.models.pareto import ParetoRow, ParetoResponse
from api.models.scatterplot import ScatterPoint, ScatterLegendItem, ScatterplotResponse
from api.models.heatmap import HeatmapResponse, HeatmapCell
from api.models.Wordcloud import Wordcloud, Word
from api.utils.clauses_generation import generate_where_clause
from api.models.Filter import Filters, get_filters
from api.utils.other import sentiment_to_color, ratings_to_hex


router = APIRouter(prefix="/unusual_graphics")


@router.get("/tags_treemap", response_model=TreemapResponse)
async def tags_treemap(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = """
        SELECT
            tag,
            count(*) AS mentions,
            (avg(sentiment) * 50) + 50 AS sentiment_score
        FROM
        (
            SELECT arrayJoin(mapKeys(tags)) AS tag,
                   arrayJoin(mapValues(tags)) AS sentiment
            FROM comments
        )
        GROUP BY tag
        ORDER BY mentions DESC
    """
    rows = connection.query(query).result_rows

    total_mentions = sum(row[1] for row in rows) or 1

    data = []
    for row in rows:
        sz = round(row[1] / total_mentions, 4)
        if sz > 0:
            data.append(
                TreemapNode(
                    name=row[0],
                    size=sz,
                    sentimentScore=round(row[2], 4),
                    color=sentiment_to_color(row[2] / 100)
                )
            )

    response = TreemapResponse(
        title="Объём и сентимент тэгов",
        data=data
    )
    return response


@router.get("/pareto", response_model=ParetoResponse)
async def negative_pareto(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = f"""
        SELECT
            tag,
            sum(if(sentiment = -1, 1, 0)) AS negative_count
        FROM
        (
            SELECT arrayJoin(mapKeys(tags)) AS tag,
                   arrayJoin(mapValues(tags)) AS sentiment
            FROM comments WHERE {generate_where_clause(filters)}
        )
        GROUP BY tag
        HAVING negative_count > 0
        ORDER BY negative_count DESC
        LIMIT 5
    """
    rows = connection.query(query).result_rows

    cumulative = 0.0
    data = []
    for name, negative_count in rows:
        cumulative += negative_count
        data.append(
            ParetoRow(
                name=name,
                negative=negative_count,
                cumulative=cumulative
            )
        )

    response = ParetoResponse(
        title="Pareto-анализ негатива (80/20)",
        data=data,
        cumulativeAsPercent=True,
        threshold=0.8
    )

    return response


@router.get("/tags_scatter", response_model=ScatterplotResponse)
async def tags_scatter(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = f"""
        SELECT
            tag,
            count(*) AS mentions,
            avg(sentiment) AS avg_sent
        FROM
        (
            SELECT arrayJoin(mapKeys(tags)) AS tag,
                   arrayJoin(mapValues(tags)) AS sentiment
            FROM comments WHERE {generate_where_clause(filters)}
        )
        GROUP BY tag
        ORDER BY mentions DESC
    """
    rows = connection.query(query).result_rows

    total_mentions = sum(r[1] for r in rows) or 1
    avg_sentiment = (
        sum(((r[2] or 0) * 50 + 50) * r[1] for r in rows) / total_mentions
    )

    points = []
    mentions = [row[1] for row in rows]
    mean_m = sum(mentions) / len(mentions)
    mentions_std = (sum([(mentions[i] - mean_m)**2 for i in range(len(mentions))]) / len(mentions)) ** 0.5
    mentions_scaled = [(mentions[i] - mean_m) / mentions_std for i in range(len(mentions))]
    mentions_scaled = [abs(min(mentions_scaled)) * 2 + mentions_scaled[i] for i in range(len(mentions_scaled))]

    for i, (tag, _, avg_sent) in enumerate(rows):
        sentiment_norm = (avg_sent or 0) * 50 + 50

        if sentiment_norm >= avg_sentiment*1.5:
            color = "green"
        elif sentiment_norm <= avg_sentiment*0.7:
            color = "red"
        else:
            color = "orange"

        points.append(
            ScatterPoint(
                x=round(mentions_scaled[i], 2),
                y=round(sentiment_norm, 2),
                color=color,
                label=tag,
                mentions=mentions[i],
                sentiment=round(sentiment_norm, 2),
            )
        )

    legend = [
        ScatterLegendItem(color="green", label="Лояльность выше среднего"),
        ScatterLegendItem(color="orange", label="Средняя лояльность"),
        ScatterLegendItem(color="red", label="Лояльность меньше среднего"),
    ]

    return ScatterplotResponse(
        title="Распределение кластеров по объёму и сентименту",
        xLabel="Вес кластера",
        yLabel="Сентимент",
        avgSentiment=avg_sentiment,
        points=points,
        legend=legend,
    )


@router.get("/tags_correlation", response_model=HeatmapResponse)
async def tags_correlation(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = f"""
        WITH expanded AS (
            SELECT
                row_number() OVER () AS rid,
                arrayJoin(mapKeys(tags)) AS tag,
                arrayJoin(mapValues(tags)) AS sentiment
            FROM comments WHERE {generate_where_clause(filters)}
        )
        SELECT
            x.tag AS tag_x,
            y.tag AS tag_y,
            coalesce(corr(x.sentiment, y.sentiment), 0) AS correlation
        FROM expanded AS x
        INNER JOIN expanded AS y
            ON x.rid = y.rid
        WHERE x.tag < y.tag
        GROUP BY tag_x, tag_y
        ORDER BY tag_x, tag_y
    """
    rows = connection.query(query).result_rows

    tags = sorted(set([r[0] for r in rows] + [r[1] for r in rows]))

    data = [
        HeatmapCell(xTag=row[0], yTag=row[1], value=round(row[2], 3) if row[2] > 0 else 0)
        for row in rows
    ]
    return HeatmapResponse(
        title="Корреляции между характеристиками",
        tags=tags,
        data=data,
        valueRange=[0, 1.0],
    )


@router.get("/wordcloud", response_model=Wordcloud)
async def word_cloud(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = f"""
    SELECT
        keyword,
        count() AS keyword_count,
        avg(rating) AS avg_rating
    FROM comments
    ARRAY JOIN keywords AS keyword
    WHERE {generate_where_clause(filters)}
    GROUP BY keyword
    ORDER BY keyword_count DESC
    LIMIT 100
    """
    rows = connection.query(query).result_rows
    colors = ratings_to_hex([row[2] for row in rows])
    return Wordcloud(words=[Word(word=row[0], mentions=row[1], avg_rating=round(row[2], 3),
                                 color=colors[i]) for i, row in enumerate(rows)])

