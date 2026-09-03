# import requests
# from bs4 import BeautifulSoup
# import pandas as pd

# url = "https://books.toscrape.com/"

# headers = {
#     "User-Agent": "STATS401-Class-Exercise/1.0"
# }

# response = requests.get(
#     url,
#     headers=headers,
#     timeout=10
# )

# response.raise_for_status()

# response.encoding = response.apparent_encoding

# soup = BeautifulSoup(
#     response.text,
#     "html.parser"
# )

# books = soup.select("article.product_pod")

# print("Books on page:", len(books))

# book = books[0]

# title = book.select_one("h3 a")["title"]

# print(title)

# price = book.select_one(
#     ".price_color"
# ).get_text(strip=True)

# print(price)

# records = []

# for book in books:

#     title = book.select_one("h3 a")["title"]

#     price_text = book.select_one(
#         ".price_color"
#     ).get_text(strip=True)

#     price = float(
#         price_text.replace("£", "")
#     )

#     records.append({
#         "title": title,
#         "price": price
#     })

# print(records[:3])

# df = pd.DataFrame(records)

# df.to_csv(
#     "data/books.csv",
#     index=False
# )

# df.to_json(
#     "data/books.json",
#     orient="records",
#     indent=2
# )

# print(df.head())

# # url = "https://example.com"

# # headers = {
# #     "User-Agent": "STATS401-Class-Exercise/1.0"
# # }

# # response = requests.get(
# #     url,
# #     headers=headers,
# #     timeout=10
# # )

# # # response = requests.get(url, timeout=10)

# # print(response)
# # print(response.status_code)

# # response.raise_for_status()

# # print("Request successful")
# # #print(response.text)

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time

headers = {
    "User-Agent": "STATS401-Class-Exercise/1.0"
}


def scrape_page(page_number):

    url = (
        "https://books.toscrape.com/"
        f"catalogue/page-{page_number}.html"
    )

    try:

        response = requests.get(
            url,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()

    except requests.RequestException as error:

        print(
            f"Error scraping {url}:",
            error
        )

        return []

    response.encoding = response.apparent_encoding

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )

    books = soup.select(
        "article.product_pod"
    )

    records = []

    for book in books:

        title = book.select_one(
            "h3 a"
        )["title"]

        price_text = book.select_one(
            ".price_color"
        ).get_text(strip=True)

        price = float(
            price_text.replace("£", "")
        )

        records.append({
            "title": title,
            "price": price
        })

    return records

all_records = []

for page in range(1, 6):

    print(f"Scraping page {page}")

    page_records = scrape_page(page)

    all_records.extend(
        page_records
    )

    time.sleep(1)

print(
    "Total records:",
    len(all_records)
)

df = pd.DataFrame(
    all_records
)

df.to_csv(
    "data/books.csv",
    index=False
)

df.to_json(
    "data/books.json",
    orient="records",
    indent=2
)

print(df.head())