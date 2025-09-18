from fastapi import Query
from pydantic import BaseModel
from typing import Optional, List, Literal


class Filters(BaseModel):
    service: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    text: Optional[str] = None
    tags: Optional[List[str]] = None
    source: Optional[List[str]] = None
    comment_ids: Optional[List[str]] = None
    concurrent: str = None


def get_filters(
    service: Optional[List[str]] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_rating: Optional[float] = Query(None),
    text: Optional[str] = Query(None),
    tags: List[str] = Query(None),
    concurrent: str = Query("газпромбанк"),
    source: List[Literal["uploading", "parsing"]] = Query(["parsing"]),
    comment_ids: Optional[List[str]] = Query(None)
) -> Filters:
    return Filters(
        service=service, start_date=start_date,
        end_date=end_date, min_rating=min_rating,
        max_rating=max_rating, text=text, tags=tags,
        source=source, concurrent=concurrent,
        comment_ids=comment_ids
    )
