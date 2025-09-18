import json
import csv
from datetime import datetime

import requests
from bs4 import BeautifulSoup

URL = "https://www.cbr.ru/hd_base/keyrate/?UniDbQuery.Posted=True&UniDbQuery.From=17.09.2013&UniDbQuery.To=26.09.2025"

resp = requests.get(URL)
resp.raise_for_status()

soup = BeautifulSoup(resp.text, "html.parser")

# таблица с историей ставок
table = soup.find("table", {"class": "data"})

data = []
for row in table.find_all("tr")[1:]:  # пропускаем заголовок
    cols = [c.get_text(strip=True) for c in row.find_all("td")]
    if len(cols) >= 2:
        date_str, rate_str = cols[0], cols[1]
        try:
            date = datetime.strptime(date_str, "%d.%m.%Y").date().isoformat()
            rate = float(rate_str.replace(",", "."))
            data.append({"date": date, "rate": rate})
        except Exception:
            continue

# Сохраняем в JSON
with open("../key_rate.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Сохраняем в CSV
with open("../key_rate.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["date", "rate"])
    writer.writeheader()
    writer.writerows(data)

print("Скачано записей:", len(data))
print("Последняя ставка:", data[-1])
