from pydantic import BaseModel


class RealtimeStatisticsEvent(BaseModel):
    in_progress: int = 0
