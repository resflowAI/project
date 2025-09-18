from pydantic import BaseModel
from api.models.Component import Component
from typing import List, Union


class PieSlice(BaseModel):
    name: str
    value: float


class CentralValue(BaseModel):
    label: str
    value: Union[str, float]


class PieResponse(Component):
    data: List[PieSlice]
    centralValue: CentralValue

