import datetime
import os

import aio_pika
from prefect import flow, task
import requests
from bs4 import BeautifulSoup

from parsers.models import RawComment
from parsers.dao import fetch_last_parsing_date


@task
async def parse_comments(last_parsing_date):
    dataset = []
    for p in range(1, 4):
        cont = requests.post(
            f"https://brobank.ru/banki/gazprombank/comments/comment-page-{p}/#comments"
        ).content
        soup = BeautifulSoup(cont, "html.parser")
        comms = soup.find_all(class_="comment", attrs={"itemprop": "comment"})
        for rev in comms:
            try:
                comment, date, rating, name = (
                    rev.find("p").get_text(),
                    rev.find("time", {"itemprop": "datePublished"}).get_text(),
                    rev.find("span", "new-card__rating_num").get("data-count"),
                    rev.find("cite", {"itemprop": "creator"}).get_text(),
                )
                date = date.replace("Отзыв от", "").replace("в", "").strip()
                date = datetime.datetime.strptime(date.split()[0], "%d.%m.%Y")
                if date < last_parsing_date:
                    return
                msg = RawComment(
                    comment=comment,
                    date=date,
                    name=name,
                    rating=rating,
                    bank="газпромбанк",
                    service="brobank",
                    source="parsing",
                )
                dataset.append(msg)
            except:
                continue
    return dataset


@flow(
    name="brobank.ru",
    log_prints=True,
)
async def parse_brobank_ru():
    last_parsing_date = await fetch_last_parsing_date("brobank")
    comments = await parse_comments(last_parsing_date)

    print(f"brobank.ru parsed {len(comments)} comments")

    connection = await aio_pika.connect_robust(os.getenv("AMQP_DSN"))
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue("comments", durable=True)

        for comm in comments:
            await channel.default_exchange.publish(
                aio_pika.Message(body=comm.model_dump_json().encode()),
                routing_key=queue.name,
            )
