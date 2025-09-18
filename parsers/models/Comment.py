from pydantic import BaseModel
from typing import Dict, List, Literal
import datetime


class RawComment(BaseModel):
    date: datetime.datetime
    comment: str
    name: str
    rating: float
    bank: str
    service: str
    source: Literal["parsing", "uploading"]


class Comment(RawComment):
    tags: Dict[str, int]
    keywords: List[str]
