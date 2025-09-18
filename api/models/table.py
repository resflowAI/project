from datetime import datetime
from typing import Dict

from pydantic import BaseModel


class TableRow(BaseModel):
    text: str
    rating: int
    tags: Dict[str, int]
    service: str
    date: datetime
    name: str
