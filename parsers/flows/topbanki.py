import re
from datetime import datetime
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from prefect import flow, task
import os
from parsers.models import RawComment
from parsers.utils.date_converter import custom_proc_file_topbanki
from parsers.dao import fetch_last_parsing_date
import aio_pika

BASE_URL = "https://topbanki.ru"
START_URL = "https://topbanki.ru/banks/gazprombank/page"
RE_RESPONSE = re.compile(r"^/response/\d+/?$")
PAGE_COUNT = 11
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36"
}
RABBITMQ_URL = os.getenv("AMQP_DSN")
QUEUE_NAME = "comments"


def fetch_html(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    r.encoding = r.apparent_encoding
    return r.text


def parse_main_page(html: str, date_until):
    soup = BeautifulSoup(html, "lxml")
    results = []

    for block in soup.select(".response_table__block"):
        name_div = block.select_one("div.name")
        if not name_div:
            continue

        a = name_div.find("a", href=True)
        if a and RE_RESPONSE.match(a["href"].strip()):
            url = urljoin(BASE_URL, a["href"].strip())
            title = a.get_text(strip=True)
        else:
            url = None
            title = name_div.get_text(strip=True)

        author_span = block.select_one(".author .bold.orange.mr10")
        author = author_span.get_text(strip=True) if author_span else ""

        rating_span = block.select_one(".author span.mark")
        rating = rating_span.get_text(strip=True) if rating_span else ""

        tags = [
            span.get_text(strip=True) for span in block.select(".mt5.mb5 span.tag-mini")
        ]

        text_p = block.select_one("p.text")
        text = text_p.get_text(" ", strip=True) if text_p else ""

        date_div = block.select_one("div.date")
        date_str = (
            custom_proc_file_topbanki(date_div.get_text(strip=True)) if date_div else ""
        )
        date = datetime.strptime(date_str, "%d.%m.%Y").date()
        if date_until and date < date_until.date():
            break
        results.append(
            {
                "url": url,
                "name": author,
                "rating": rating,
                "tag": tags[0] if len(tags) > 0 else None,
                "date": date.isoformat(),
                "comment": text,
            }
        )

    return results


def parse_detail_page(html: str, url: str):
    """Парсим отдельную страницу отзыва"""
    soup = BeautifulSoup(html, "lxml")

    h3 = soup.select_one("h3")
    title = h3.get_text(strip=True) if h3 else ""

    author_span = soup.select_one(".author .bold.orange.mr10")
    author = author_span.get_text(strip=True) if author_span else ""

    rating_span = soup.select_one(".author span.mark")
    rating = rating_span.get_text(strip=True) if rating_span else ""
    if len(rating) == 0:
        rating = None

    tags = [span.get_text(strip=True) for span in soup.select(".author span.tag-mini")]

    text_p = soup.select_one("p.text")
    text = text_p.get_text(" ", strip=True) if text_p else ""

    date_text = ""
    actions = soup.select_one(".actions")
    if actions:
        raw = actions.get_text(" ", strip=True)
        m = re.search(r"\d{1,2}\s+\S+\s+\d{4},\s+\d{2}:\d{2}", raw)
        if m:
            date_text = m.group(0)

    return {
        "title": title,
        "url": url,
        "author": author,
        "rating": rating,
        "tags": ", ".join(tags),
        "date": date_text,
        "text": text,
    }


@task
def parse_comments(last_parsing_date):
    all_reviews = []
    data = []
    print("Собираем список отзывов...")

    for page_num in range(1, PAGE_COUNT + 1):
        print(f"parsing page {page_num}")
        cur_url = f"{START_URL}{page_num}"
        html = fetch_html(cur_url)
        reviews = parse_main_page(html, last_parsing_date)
        all_reviews.extend(reviews)

    enriched = []
    print("Обогащаем данными с детальных страниц...")
    for r in all_reviews:
        if r["url"] is None:
            continue
        try:
            detail_html = fetch_html(r["url"])
            if last_parsing_date and r["date"] < last_parsing_date.date():
                continue
            detail = parse_detail_page(detail_html, r["url"])
            enriched.append(detail)
        except Exception as e:
            print(f"[!] Ошибка при обработке {r['url']}: {e}")

    for r in enriched:
        if r["rating"] is None:
            continue
        msg = RawComment(
            comment=r["text"],
            date=datetime.strptime(
                custom_proc_file_topbanki(r["date"]), "%d.%m.%Y"
            ).date(),
            name=r["author"],
            rating=r["rating"],
            bank="газпромбанк",
            service="topbanki",
            source="parsing",
        )
        data.append(msg)
    return data


@flow(
    name="topbanki.ru",
    log_prints=True,
)
async def parse_topbanki_ru():
    last_parsing_date = await fetch_last_parsing_date("topbanki")
    comments = await parse_comments(last_parsing_date)

    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)

        for comm in comments:
            await channel.default_exchange.publish(
                aio_pika.Message(body=comm.model_dump_json().encode()),
                routing_key=queue.name,
            )
