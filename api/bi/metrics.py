from fastapi import APIRouter, Depends
from typing import Annotated, Any
from api.src.clickhouse import get_clickhouse
import uuid
from api.utils.clusters import get_cluster_info
from api.utils.clauses_generation import generate_where_clause
from api.models.Filter import Filters, get_filters

router = APIRouter(prefix="/metrics")


@router.get("/count_comments")
async def count_comments(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters)
):
    data = connection.query(f"SELECT COUNT(*) FROM comments WHERE {generate_where_clause(filters)}").result_rows
    return {
        'id': str(uuid.uuid4()),
        'value': str(data[0][0])
    }


@router.get('/average_sentiment')
async def average_sentiment(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters)
):
    data = connection.query(f"""
    SELECT
        floor(AVG(val * 50 + 50)) AS value
    FROM comments
        ARRAY JOIN mapValues(tags) AS val
        WHERE {generate_where_clause(filters)}
    """).result_rows
    return {
        'id': str(uuid.uuid4()),
        'value': str(int(data[0][0]))
    }


@router.get('/average_mark')
async def average_mark(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters)
):
    data = connection.query(f"""
        SELECT floor(AVG(rating), 2) FROM comments WHERE {generate_where_clause(filters)}
    """).result_rows
    return {
        'id': str(uuid.uuid4()),
        'value': str(data[0][0])
    }


@router.get('/most_liked_cluster')
async def most_liked_cluster(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters)
):
    return {
        'id': str(uuid.uuid4()),
        'value': get_cluster_info(connection, filters)[0]['cluster'],
    }


@router.get('/most_disliked_cluster')
async def most_disliked_cluster(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters)
):
    return {
        'id': str(uuid.uuid4()),
        'value': get_cluster_info(connection, filters, reversed=False)[0]['cluster'],
    }
