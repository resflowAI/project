from typing import Dict, List, Optional, Any
import datetime
from pydantic import BaseModel
import uuid


class RawComment(BaseModel):
    date: datetime.date
    comment: str
    name: str
    rating: float
    bank: str
    service: str
    source: str = "parsing"


class Comment(RawComment):
    tags: Dict[str, int]
    keywords: List[str]
    comment_id: Optional[str] = None

    def model_post_init(self, context: Any, /) -> None:
        if self.comment_id is None:
            self.comment_id = str(uuid.uuid4())
        return self


class InferenceComment(BaseModel):
    id: int
    text: str


class InferenceRequest(BaseModel):
    data: List[InferenceComment]
