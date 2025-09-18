from fastapi import APIRouter, Depends
from typing import Annotated, Any
from api.src.clickhouse import get_clickhouse
from api.models.piechart import PieSlice, PieResponse, CentralValue
from api.utils.clauses_generation import generate_where_clause
from api.models.Filter import Filters, get_filters

router = APIRouter(prefix="/pie")


@router.get("/sentiment_distribution", response_model=PieResponse)
async def sentiment_distribution(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = f"""
        SELECT
            sentiment,
            count(*) AS cnt
        FROM
        (
            SELECT arrayJoin(mapValues(tags)) AS sentiment
            FROM comments
            WHERE {generate_where_clause(filters)}
        )
        GROUP BY sentiment
    """
    rows = connection.query(query).result_rows

    mean_sentiment = connection.query("""
        SELECT
            floor((SELECT COUNT(*) FROM comments WHERE rating > 3) / (SELECT COUNT(*) FROM comments) * 100)
    """).result_rows[0][0]

    mapping = {-1: "Негативная", 0: "Нейтральная", 1: "Позитивная"}
    data = [
        PieSlice(name=mapping.get(row[0], str(row[0])), value=row[1])
        for row in rows
    ]

    return PieResponse(
        title="Распределение тональностей",
        data=data,
        centralValue=CentralValue(
            label="Сентимент",
            value=str(round(mean_sentiment, 2)) + "%"
        )
    )


@router.get("/service_distribution", response_model=PieResponse)
async def service_distribution(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = f"""
        SELECT service, count(*) AS cnt
        FROM comments
        WHERE {generate_where_clause(filters)}
        GROUP BY service
        ORDER BY cnt DESC
    """
    rows = connection.query(query).result_rows

    data = [PieSlice(name=row[0], value=row[1]) for row in rows]

    return PieResponse(
        title="Распределение источников",
        data=data,
        centralValue=CentralValue(
            label="Всего",
            value=str(sum([x[1] for x in rows])) + " шт."
        )
    )
