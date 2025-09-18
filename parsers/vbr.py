import asyncio
import json
import os

from playwright.async_api import async_playwright
from tqdm import tqdm
from bs4 import BeautifulSoup


async def main():
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

        for i in tqdm(range(1, 107)):
            await page.goto(
                f"https://www.vbr.ru/banki/gazprombank/otzivy/{i}/", timeout=100_000
            )
            await page.wait_for_selector("div.reviews-list")
            text = page.locator("div.reviews-list div.reviews-card.-emoji")
            count = await text.count()
            for i in range(count):
                html = await text.nth(i).inner_html()
                soup = BeautifulSoup(html, "html.parser")
                name = soup.find(class_="avatar-title").get_text()
                date = soup.find(class_="avatar-title-date").get_text()
                tag = soup.find(class_="avatar-title-text").get_text()
                comment = soup.find(class_="reviews-text").get_text() + (
                    soup.find(class_="full hidden").get_text()
                    if soup.find(class_="full hidden") is not None
                    else ""
                )
                rating = soup.find(class_="rating-star-simple").get_text()
                dataset.append(
                    {
                        "date": date,
                        "comment": comment,
                        "rating": rating,
                        "name": name,
                        "tag": tag,
                    }
                )
            print(len(dataset))
        json.dump(dataset, open("vbr.json", "w"))
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
