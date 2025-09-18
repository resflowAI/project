from fastapi import APIRouter, Depends
from typing import Annotated, Any
from api.src.clickhouse import get_clickhouse
from api.utils.clauses_generation import generate_where_clause
from api.models.Filter import Filters, get_filters
import uuid

router = APIRouter(prefix="/filter")


@router.get("/available_filter_values")
async def available_filter_values(
        connection: Annotated[Any, Depends(get_clickhouse)]
):
    banks = connection.query("SELECT DISTINCT bank FROM comments").result_rows
    services = connection.query("SELECT DISTINCT service FROM comments").result_rows
    ratings = connection.query("SELECT MIN(rating), MAX(rating) FROM comments").result_rows
    dates = connection.query("SELECT MIN(date), MAX(date) FROM comments").result_rows

    return {
        "id": str(uuid.uuid4()),
        "value": {
            "banks": [
                {
                    "label": "Мои банки",
                    "options": [
                        {"label": "газпромбанк", "value": 'газпромбанк'}
                    ]
                },
                {
                    "label": "Конкуренты",
                    "options": [
                        {"label": b[0], "value": b[0]} for b in banks if b != "газпромбанк"
                    ]
                }
            ],
            "services": [
                {
                    "label": "Источники",
                    "options": [
                        {"label": b[0], "value": b[0]} for b in services
                    ]
                }
            ],
            "ratings": {"min": ratings[0][0], "max": ratings[0][1]},
            "dates": {"min": dates[0][0], "max": dates[0][1], "default_min": "01-01-2024", "default_max": "31-05-2025"}
        }
    }


@router.get("/distinct_tags")
async def dist_tags(connection: Annotated[Any, Depends(get_clickhouse)],
                    filters: Filters = Depends(get_filters)):
    rows = connection.query(
        f"""
            SELECT DISTINCT key
            FROM comments
            ARRAY JOIN mapKeys(tags) AS key
            WHERE {generate_where_clause(filters)}
            """
    ).result_columns
    return {"tags": rows[0]}
