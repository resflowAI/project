import re
import json
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

BASE_URL = "https://topbanki.ru"
START_URL = "https://topbanki.ru/banks/gazprombank/page"
RE_RESPONSE = re.compile(r"^/response/\d+/?$")
PAGE_COUNT = 11
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0 Safari/537.36"
}


def fetch_html(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    r.encoding = r.apparent_encoding
    return r.text


def parse_main_page(html: str):
    """Парсим список отзывов на странице списка"""
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

        tags = [span.get_text(strip=True)
                for span in block.select(".mt5.mb5 span.tag-mini")]

        text_p = block.select_one("p.text")
        text = text_p.get_text(" ", strip=True) if text_p else ""

        date_div = block.select_one("div.date")
        date_str = date_div.get_text(strip=True) if date_div else ""

        results.append({
            # "title": title,
            "url": url,
            "name": author,
            "rating": rating,
            "tag": tags[0] if len(tags) > 0 else None,
            "date": date_str,
            "comment": text,
        })

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


def main():
    all_reviews = []
    print("Собираем список отзывов...")

    for page_num in tqdm(range(1, PAGE_COUNT + 1)):
        cur_url = f"{START_URL}{page_num}"
        html = fetch_html(cur_url)
        reviews = parse_main_page(html)
        all_reviews.extend(reviews)

    enriched = []
    print("Обогащаем данными с детальных страниц...")
    for r in tqdm(all_reviews):
        if r["url"]:
            try:
                detail_html = fetch_html(r["url"])
                detail = parse_detail_page(detail_html, r["url"])
                enriched.append(detail)
            except Exception as e:
                print(f"[!] Ошибка при обработке {r['url']}: {e}")
                enriched.append(r)
        else:
            enriched.append(r)

    # Вывод в консоль
    # for i, item in enumerate(enriched, 1):
    #     print(f"{i}. {item['title']}")
    #     print(f"   author: {item['author']}")
        #     print(f"   rating: {item['rating']}")
    #     print(f"   date:   {item['date']}")
    #     print(f"   tags:   {item['tags']}")
    #     print(f"   text:   {item['text'][:160]}{'...' if len(item['text'])>160 else ''}")
    #     print()

    # Сохраняем в JSON
    with open("topbanki.json", "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=4)

    # print(f"Собрано отзывов: {len(enriched)}. Файл: topbanki.json")


if __name__ == "__main__":
    main()
