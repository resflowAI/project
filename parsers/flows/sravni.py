import asyncio
from datetime import datetime
import os

import aio_pika
from playwright.async_api import async_playwright
from prefect import task, flow
from bs4 import BeautifulSoup

from parsers.dao import fetch_last_parsing_date
from parsers.models import RawComment
from parsers.utils.date_converter import custom_proc_file_topbanki

banks = {
    # "сбербанк": "sberbank-rossii",
    # "втб": "vtb",
    # "альфабанк": "alfa-bank",
    # "совкомбанк": "sovkombank",
    # "тбанк": "t-bank",
    # "россельхозбанк": "rosselkhozbank",
    # "райффайзен": "rajffajzenbank"
    "газпромбанк": "gazprombank"
}


@task
async def parse_data(last_update_date):
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
        for bank, bank_url in banks.items():
            all_attrs = set()

            count = 0
            k = 0
            await page.goto(
                f"https://www.sravni.ru/bank/{bank_url}/otzyvy/?orderby=byDate",
                timeout=100_000,
                wait_until="domcontentloaded",
            )
            for i in range(30):
                print(f"iteration {i}")
                await page.evaluate("window.scrollBy(0, 350)")
                await asyncio.sleep(0.4)

                soup = await page.content()
                soup = BeautifulSoup(soup, "html.parser")
                attrs = soup.find_all("div", attrs={"data-id": True})
                all_attrs.update(set([x["data-id"] for x in attrs]))
                if len(all_attrs) == count:
                    k += 1
                else:
                    k = 0
                    count = len(all_attrs)
                if k > 50:
                    break

            for id_ in list(all_attrs):
                print(f"comment {id_}/{len(list(all_attrs))}")
                try:
                    await page.goto(
                        f"https://www.sravni.ru/bank/{bank_url}/otzyvy/{id_}",
                        timeout=100_000,
                        wait_until="commit",
                    )
                    await page.locator("div.page_mainColumn__oogxd").first.wait_for(
                        timeout=10_000, state="visible"
                    )
                    try:
                        soup = BeautifulSoup(await page.content(), "html.parser")
                        comment = soup.find(
                            "div",
                            class_=[
                                "review-card_text__jTUSq",
                                "articleTypography_article-comment__Px4n0",
                                "h-mt-8",
                                "h-mb-16",
                            ],
                        ).get_text()
                        date_array = soup.find_all(
                            "div", class_=["h-color-D30", "_1aja02n" "_1w66l1f"]
                        )
                        if date_array[0].get_text() == ", клиент Сравни":
                            date = date_array[1].get_text()
                        else:
                            date = date_array[0].get_text()
                        name = soup.find(
                            "div",
                            class_=["h-color-D100", "_1f90nza", "_1aja02n", "_1w66l1f"],
                        ).get_text()

                        if "202" not in date:
                            date = date + " 2025"
                        date = datetime.strptime(
                            custom_proc_file_topbanki(date), "%d.%m.%Y"
                        ).date()
                        if date < last_update_date:
                            continue
                        rating = soup.find("div", attrs={"data-qa": "Rate"})
                        rating = len(
                            rating.find_all(
                                "span",
                                class_=[
                                    "_87qanl _4czyoq _vb279g _f6lbfc _mlr4fp _1itxi70 _7e2q16"
                                ],
                            )
                        )
                        tags = [
                            x.get_text()
                            for x in soup.find_all(
                                "div", class_="h-color-D30 h-mr-16 _1w66l1f"
                            )
                        ]
                        msg = RawComment(
                            date=date,
                            comment=comment,
                            rating=rating,
                            name=name,
                            bank=bank,
                            service="sravni",
                            source="parsing",
                        )
                        dataset.append(msg)
                    except:
                        continue
                except:
                    continue

    await browser.close()
    return dataset


@flow(
    name="sravni.ru",
    log_prints=True,
)
async def parse_sravni_ru():
    last_parsing_date = await fetch_last_parsing_date("sravni")
    comments = await parse_data(last_parsing_date)

    print(f"sravni.ru parsed {len(comments)} comments")

    connection = await aio_pika.connect_robust(os.getenv("AMQP_DSN"))
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue("comments", durable=True)

        for comm in comments:
            await channel.default_exchange.publish(
                aio_pika.Message(body=comm.model_dump_json().encode()),
                routing_key=queue.name,
            )
