from pydantic import BaseModel
from typing import Optional, List
from api.models.Component import Component


class ClusterBarRow(BaseModel):
    name: str
    mentions: Optional[int] = None
    positive: Optional[int] = None
    neutral: Optional[int] = None
    negative: Optional[int] = None


class ClusterBarsResponse(Component):
    data: List[ClusterBarRow]
    stacked: Optional[bool] = False
    normalize100: Optional[bool] = False

