from pydantic import BaseModel
from api.models.Component import Component
from typing import List, Optional


class ParetoRow(BaseModel):
    name: str
    negative: float
    cumulative: float


class ParetoResponse(Component):
    data: List[ParetoRow]
    cumulativeAsPercent: Optional[bool] = True
    threshold: float = 0.8
