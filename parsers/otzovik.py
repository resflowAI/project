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

        for i in tqdm(range(1, 48)):
            await page.goto(
                f"https://otzovik.com/reviews/bank_gazprombank_russia/{i}/",
                timeout=100_000,
            )
            await page.wait_for_selector("div.otz_product_reviews_left")
            text = page.locator("div.item.status4.mshow0")
            count = await text.count()
            for i in range(count):
                html = await text.nth(i).inner_html()
                soup = BeautifulSoup(html, "html.parser")
                name = soup.find(class_="user-login").get_text()
                date = soup.find(class_="review-postdate").get_text()
                comment = soup.find(class_="review-body-wrap").get_text()
                rating = soup.find(class_="rating-score tooltip-right").get_text()
                dataset.append(
                    {
                        "date": date,
                        "comment": comment,
                        "rating": rating,
                        "name": name,
                    }
                )
            print(len(dataset))
        json.dump(dataset, open("otzovik.json", "w"))
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
