from pydantic import BaseModel
from typing import List
from api.models.Component import Component


class TreemapNode(BaseModel):
    name: str
    size: float
    sentimentScore: float
    color: str


class TreemapResponse(Component):
    data: List[TreemapNode]
