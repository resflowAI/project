from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends
from fastapi.params import Query

from api.models.Filter import Filters, get_filters
from api.models.table import TableRow
from api.src.clickhouse import get_clickhouse
from api.utils.clauses_generation import generate_where_clause

tables = APIRouter(prefix="/table")


@tables.get("/comment_table_rows")
def get_table_rows(
        connection: Annotated[Any, Depends(get_clickhouse)],
        filters: Filters = Depends(get_filters),
        limit: int = Query(100),
        offset: int = Query(0),
        date_order: Optional[str] = Query(None),
        rating_order: Optional[str] = Query(None)
):
    order_parts = []
    if date_order:
        order_parts.append(f"date {date_order}")
    if rating_order:
        order_parts.append(f"rating {rating_order}")

    order_clause = f"ORDER BY {', '.join(order_parts)}" if order_parts else ""

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
        {order_clause}
        LIMIT {limit} OFFSET {offset}
    """
    rows = connection.query(query).result_rows

    return [
        TableRow(
            text=row[1],
            rating = row[3],
            service=row[5],
            date=row[0],
            name=row[2],
            tags=dict(row[6]),
        )
        for row in rows
    ]
