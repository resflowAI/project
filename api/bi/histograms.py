from fastapi import APIRouter, Depends, Query
from typing import Annotated, Any, Optional
from api.src.clickhouse import get_clickhouse
from api.models.histogram import ClusterBarsResponse, ClusterBarRow
from api.models.Filter import Filters, get_filters
from api.utils.clauses_generation import generate_where_clause


router = APIRouter(prefix="/histograms")


@router.get("/tags_sentiment_histogram", response_model=ClusterBarsResponse)
async def tags_sentiment_histogram(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters),
    top_n: Optional[int] = Query(None)
):
    query = f"""
        SELECT
            tag,
            sum(if(sentiment = 1, 1, 0)) AS positive,
            sum(if(sentiment = 0, 1, 0)) AS neutral,
            sum(if(sentiment = -1, 1, 0)) AS negative,
            count(*) AS mentions
        FROM
        (
            SELECT arrayJoin(mapKeys(tags)) AS tag, arrayJoin(mapValues(tags)) AS sentiment
            FROM comments
            WHERE {generate_where_clause(filters)}
        )
        GROUP BY tag
        ORDER BY mentions DESC
        {'LIMIT ' + str(top_n) if top_n else ''}
    """
    rows = connection.query(query).result_rows

    data = [
        ClusterBarRow(
            name=row[0],
            mentions=row[4],
            positive=row[1],
            neutral=row[2],
            negative=row[3]
        )
        for row in rows
    ]

    response = ClusterBarsResponse(
        data=data,
        stacked=True,
        normalize100=True
    )
    return response


@router.get("/fin_tags_sentiment_histogram", response_model=ClusterBarsResponse)
async def financial_sentiment_histogram(
    connection: Annotated[Any, Depends(get_clickhouse)],
    filters: Filters = Depends(get_filters)
):
    query = f"""
         SELECT
	        key,
	        sum(if(value = 1, 1, 0)),
	        sum(if(value = 0, 1, 0)),
	        sum(if(value = -1, 1, 0)),
	        count(*)
        FROM comments
	        ARRAY JOIN
		        mapKeys(tags) AS key,
		        mapValues(tags) AS value
        WHERE key in (SELECT category FROM financial_categories) AND {generate_where_clause(filters)}
        GROUP BY key
     """
    rows = connection.query(query).result_rows

    data = [
        ClusterBarRow(
            name=row[0],
            mentions=row[4],
            positive=row[1],
            neutral=row[2],
            negative=row[3]
        )
        for row in rows
    ]

    response = ClusterBarsResponse(
        data=data,
        stacked=True,
        normalize100=True
    )
    return response
