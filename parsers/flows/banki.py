import datetime
import json
import os

from prefect import flow, task
import requests
from bs4 import BeautifulSoup
import aio_pika

from parsers.models import RawComment
from parsers.dao import fetch_last_parsing_date


# move to env
RABBITMQ_URL = os.getenv("AMQP_DSN")
QUEUE_NAME = "comments"


@task
async def parse_comments(last_parsing_date):
    comments = []
    for page in range(1, 30):
        cont = requests.post(
            f"https://www.banki.ru/services/responses/bank/gazprombank/?page={page}&is_countable=on"
        ).content
        soup = BeautifulSoup(cont, "html.parser")
        scripts = soup.find_all("script", {"type": "application/ld+json"})
        for rev in json.loads(scripts[0].text.strip())["review"]:
            date, comment, rating, name = (
                rev["datePublished"],
                rev["description"],
                rev["reviewRating"]["ratingValue"],
                rev["name"],
            )
            date = datetime.datetime.strptime(date.split()[0], "%Y-%m-%d").date()
            rating = float(rating) if rating is not None else 4
            if date < last_parsing_date:
                return comments
            msg = RawComment(
                comment=comment,
                date=date,
                name=name,
                rating=rating,
                bank="газпромбанк",
                service="banki",
                source="parsing",
            )
            comments.append(msg)
    return comments


@flow(
    name="banki.ru",
    log_prints=True,
)
async def parse_banki_ru():
    last_parsing_date = await fetch_last_parsing_date("banki")
    comments = await parse_comments(last_parsing_date)

    print(f"banki.ru parsed {len(comments)} comments")

    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)

        for comm in comments:
            await channel.default_exchange.publish(
                aio_pika.Message(body=comm.model_dump_json().encode()),
                routing_key=queue.name,
            )
