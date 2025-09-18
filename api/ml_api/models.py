from pydantic import BaseModel
from typing import List, Literal


class InferenceComment(BaseModel):
    id: int
    text: str


class InferenceRequest(BaseModel):
    data: List[InferenceComment]


class ProcessedComment(BaseModel):
    id: int
    topics: List[str]
    sentiments: List[Literal["положительно", "нейтрально", "отрицательно"]]


class InferenceResponse(BaseModel):
    predictions: List[ProcessedComment]
