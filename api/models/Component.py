from pydantic import BaseModel
from typing import Any
from typing import Optional
import uuid


class Component(BaseModel):
    id: Optional[str] = None

    def model_post_init(self, context: Any, /) -> None:
        if self.id is None:
            self.id = str(uuid.uuid4())
        return self
