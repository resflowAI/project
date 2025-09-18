import asyncio
from datetime import datetime
import os

import aio_pika
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from prefect import flow, task

from parsers.dao import fetch_last_parsing_date
from parsers.models import RawComment


@task
async def task_workflow(last_parsing_date):
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            proxy={
                "server": os.getenv("PROXY_HOST"),
                "username": os.getenv("PROXY_USER"),
                "password": os.getenv("PROXY_PASSWORD"),
            },
        )

        page = await browser.new_page()

        dataset = []

        await page.goto(
            f"https://mainfin.ru/bank/gazprombank/otzyvy",
            timeout=100_000,
            wait_until="domcontentloaded",
        )

        count = 0
        while True:
            await page.evaluate("window.scrollBy(0, 250)")
            await asyncio.sleep(1)
            button = page.locator(
                "a.load-more-reviews.btn.btn--transparent-blue.btn--min-width.btn--margin-t"
            )
            await asyncio.sleep(1)
            if await button.is_visible():
                print("next")
                await button.click()
                count = 0
            else:
                await page.evaluate("window.scrollBy(0, -500)")
                count += 1
            if count > 3:
                break

        text = page.locator("div.reviews-item")
        count = await text.count()

        for i in range(count):
            html = await text.nth(i).inner_html()
            soup = BeautifulSoup(html, "html.parser")
            comment = soup.find(class_="reviews-item__text").get_text()
            rating = soup.find("div", class_="reviews-item__rate").get_text()
            date = (
                soup.find("div", class_="reviews-item__info-desc").get_text().split()[0]
            )
            name = soup.find("div", class_="reviews-item__info").get_text().split()[0]
            tag = soup.find("a", class_="tag").get_text()
            parsed_date = datetime.strptime(date, "%d.%m.%Y")
            if parsed_date.date() < last_parsing_date:
                print("already parsed")
                break

            dataset.append(
                RawComment(
                    date=parsed_date,
                    comment=comment,
                    name=name,
                    rating=rating,
                    bank="газпромбанк",
                    service="mainfin",
                    source="parsing",
                )
            )

        return dataset

    await browser.close()


@flow(
    name="mainfin.ru",
    log_prints=True,
)
async def parse_mainfin_ru():
    last_parsing_date = await fetch_last_parsing_date("mainfin")
    comments = await task_workflow(last_parsing_date)

    print(f"mainfin.ru parsed {len(comments)} comments")

    connection = await aio_pika.connect_robust(os.getenv("AMQP_DSN"))
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue("comments", durable=True)

        for comm in comments:
            await channel.default_exchange.publish(
                aio_pika.Message(body=comm.model_dump_json().encode()),
                routing_key=queue.name,
            )
