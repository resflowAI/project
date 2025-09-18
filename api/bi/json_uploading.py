import os
from typing import List
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
import aio_pika

router = APIRouter(prefix="/data_uploading")

QUEUE_NAME = "comments"


class InferenceComment(BaseModel):
    id: int
    text: str


class RawComment(BaseModel):
    date: datetime
    comment: str
    name: str
    rating: float
    bank: str
    service: str
    source: str


@router.post("/upload_json")
async def upload_json(msg: List[InferenceComment], uploading_date: datetime):
    try:
        connection = await aio_pika.connect_robust(os.getenv("AMQP_DSN"))
        async with connection:
            channel = await connection.channel()
            queue = await channel.declare_queue(QUEUE_NAME, durable=True)

            for comm in msg:
                await channel.default_exchange.publish(
                    aio_pika.Message(
                        body=RawComment(
                            date=uploading_date,
                            comment=comm.text,
                            name="",
                            rating=0,
                            bank="газпромбанк",
                            service="внешняя загрузка",
                            source="uploading",
                        )
                        .model_dump_json()
                        .encode()
                    ),
                    routing_key=queue.name,
                )
        return {"status": "successfull", "detail": ""}
    except Exception as exc:
        return {"status": "error", "detail": exc}
