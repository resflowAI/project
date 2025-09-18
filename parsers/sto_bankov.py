import asyncio
import os
import json

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

        for i in tqdm(range(1, 46)):
            await page.goto(
                f"https://1000bankov.ru/bank/354/otzyvy/?p={i}", timeout=100_000
            )
            await page.wait_for_selector("section.section.zag")
            text = page.locator("div.review")
            count = await text.count()
            for j in range(count):
                html = await text.nth(j).inner_html()
                try:
                    soup = BeautifulSoup(html, "html.parser")
                    cont = soup.find(class_="review__name-sub0").get_text()
                    name = cont.split("\n")[0].split()[0]
                    cont = cont.split("\n")[1].split()
                    rating = soup.find("div", class_="rating").get_text().split()[1]
                    if len(cont) > 2:
                        tag = " ".join(cont[2:])
                        date = cont[0]
                    else:
                        tag = None
                        date = cont[0]
                    comment = soup.find("p", class_="review__text").get_text()
                    dataset.append(
                        {
                            "date": date,
                            "comment": comment,
                            "tag": tag,
                            "name": name,
                            "rating": rating,
                        }
                    )
                except:
                    continue
            print(len(dataset))
        await browser.close()
        json.dump(dataset, open("100bankov.json", "w"))


if __name__ == "__main__":
    asyncio.run(main())
