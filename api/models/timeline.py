from typing import List, Literal, Optional, Tuple, Union, Any, Dict
from datetime import date
from pydantic import BaseModel
from api.models.Component import Component


class TsPoint(BaseModel):
    t: date
    value: Dict[str, Union[int, float]]


class TsSeriesDef(BaseModel):
    key: str
    label: str
    yAxis: Optional[Literal["left", "right"]] = None


class LineTimeseriesResponse(Component):
    data: List[TsPoint]
    series: List[TsSeriesDef]
    yLeftDomain: Optional[Tuple[float, float]] = None
    yRightDomain: Optional[Tuple[float, float]] = None


class MultilineTimelinePoint(BaseModel):
    t: date
    value: Dict[str, Union[int, float]]


class MultilineTimeline(Component):
    data: List[MultilineTimelinePoint]
    series: List[TsSeriesDef]
    yLeftDomain: Optional[Tuple[float, float]] = None
    yRightDomain: Optional[Tuple[float, float]] = None

