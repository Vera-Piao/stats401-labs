import requests
import pandas as pd


url = "https://jsonplaceholder.typicode.com/posts"

response = requests.get(
    url,
    timeout=10
)

response.raise_for_status()

data = response.json()

print(type(data))
print(len(data))
print(data[0])


first_post = data[0]

print(first_post["id"])
print(first_post["title"])


records = []

for post in data:

    records.append({
        "id": post["id"],
        "user_id": post["userId"],
        "title": post["title"]
    })


df = pd.DataFrame(records)

df.to_csv(
    "data/posts.csv",
    index=False
)


params = {
    "userId": 1
}

filtered_response = requests.get(
    "https://jsonplaceholder.typicode.com/posts",
    params=params,
    timeout=10
)

filtered_response.raise_for_status()

filtered_data = filtered_response.json()

print(
    "Posts for user 1:",
    len(filtered_data)
)