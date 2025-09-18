import asyncio
import os

import aio_pika
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from api.events.models import RealtimeStatisticsEvent

router = APIRouter(prefix="/events")

POLLING_RATE = 10


@router.get("/sse")
async def events_stream(request: Request):
    async def event_generator():
        async def get_messages_count(queue: str) -> int:
            connection = await aio_pika.connect_robust(os.getenv("AMQP_DSN"))
            async with connection:
                channel = await connection.channel()
                queue = await channel.declare_queue(queue, durable=True, passive=True)
                return queue.declaration_result.message_count

        while True:
            if await request.is_disconnected():
                break

            yield RealtimeStatisticsEvent(
                in_progress=await get_messages_count("comments"),
            )

            await asyncio.sleep(POLLING_RATE)

    return EventSourceResponse(event_generator())
