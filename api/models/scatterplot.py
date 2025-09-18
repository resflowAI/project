from pydantic import BaseModel
from typing import List, Optional
from api.models.Component import Component


class ScatterPoint(BaseModel):
    x: float
    y: float
    color: str
    label: Optional[str]
    mentions: float
    sentiment: float


class ScatterLegendItem(BaseModel):
    color: str
    label: str


class ScatterplotResponse(Component):
    xLabel: str
    yLabel: str
    avgSentiment: Optional[float] = None
    points: List[ScatterPoint]
    legend: List[ScatterLegendItem]
