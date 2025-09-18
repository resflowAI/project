import os
from datetime import datetime

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from prefect import flow, task
import aio_pika

from parsers.models import RawComment
from parsers.dao import fetch_last_parsing_date

QUEUE_NAME = "comments"


@task
async def parse_data(last_parsing_date):
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            proxy={
                "server": os.getenv("PROXY_HOST"),
                "username": os.getenv("PROXY_USER"),
                "password": os.getenv("PROXY_PASSWORD"),
            },
        )
        page = await browser.new_page()
        dataset = []

        await page.goto(
            f"https://ru.myfin.by/bank/gazprombank/otzyvy?limit=50",
            timeout=100_000,
            wait_until="domcontentloaded",
        )
        await page.wait_for_selector("div.reviews-list__item")
        text = page.locator("div.reviews-list__item")
        count = await text.count()

        for i in range(count):
            html = await text.nth(i).inner_html()
            soup = BeautifulSoup(html, "html.parser")
            name = soup.find(class_="review-author__name").get_text()
            comment = soup.find(class_="review-block__text").get_text()
            date = soup.find(class_="review-info__date").get_text().strip()
            date = datetime.strptime(date, "%d.%m.%Y")
            if date < last_parsing_date:
                return dataset

            rating = soup.find(class_="star-rating__text").get_text()
            dataset.append(
                RawComment(
                    comment=comment,
                    date=date,
                    name=name,
                    rating=rating,
                    bank="газпромбанк",
                    service="myfin",
                    source="parsing",
                )
            )
    await browser.close()
    return dataset


@flow(
    name="ru.myfin.by",
    log_prints=True,
)
async def parse_ru_myfin_by():
    last_parsing_date = await fetch_last_parsing_date("myfin")
    comments = await parse_data(last_parsing_date)

    print(f"ru.myfin.by parsed {len(comments)} comments")

    connection = await aio_pika.connect_robust(os.getenv("AMQP_DSN"))
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)

        for comm in comments:
            await channel.default_exchange.publish(
                aio_pika.Message(body=comm.model_dump_json().encode()),
                routing_key=queue.name,
            )
