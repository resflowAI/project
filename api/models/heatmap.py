from pydantic import BaseModel
from typing import List
from api.models.Component import Component


class HeatmapCell(BaseModel):
    xTag: str
    yTag: str
    value: float


class HeatmapResponse(Component):
    tags: List[str]
    data: List[HeatmapCell]
    valueRange: List[float]

