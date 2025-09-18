from api.models.Component import Component
from pydantic import BaseModel
from typing import List


class Word(BaseModel):
    word: str
    mentions: int
    avg_rating: float
    color: str


class Wordcloud(Component):
    words: List[Word]
