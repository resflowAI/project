from datetime import datetime
from typing import Annotated, Any, List

from fastapi import APIRouter, Depends

from api.src.clickhouse import get_clickhouse

from pydantic import BaseModel

router = APIRouter(prefix="/import")

class KeyRateValue(BaseModel):
    date: datetime
    rate: float

@router.post("/key_rate_import")
def import_key_rate_data(
    connection: Annotated[Any, Depends(get_clickhouse)],
    items: List[KeyRateValue],
):
    if not items:
        return {"status": "no data to import"}

    # очищаем таблицу
    connection.query("TRUNCATE TABLE key_rate")

    # формируем список значений в виде строки для одного INSERT
    values_str = ", ".join(
        f"('{item.date.strftime('%Y-%m-%d')}', {item.rate})" for item in items
    )

    # выполняем bulk insert
    connection.query(f"INSERT INTO key_rate (date, rate) VALUES {values_str}")

    return {"status": "success", "inserted_rows": len(items)}
