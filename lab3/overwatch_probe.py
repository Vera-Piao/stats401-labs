import requests

BASE_URL = "https://overfast-api.tekrop.fr"

headers = {
    "User-Agent": "STATS401-Class-Exercise/1.0"
}

params = {
    "name": "a",
    "limit": 20
}

try:
    response = requests.get(
        f"{BASE_URL}/players",
        headers=headers,
        params=params,
        timeout=15
    )

    response.raise_for_status()

    data = response.json()

    print("Status:", response.status_code)
    print("Type:", type(data))
    print("\nResponse:")
    # print(data)

except requests.RequestException as error:
    print("Request failed:", error)

print("\nTotal matching players:", data["total"])
print("Players returned:", len(data["results"]))

print("\nFirst players:")

for player in data["results"][:10]:
    print(
        player["name"],
        "| public:",
        player["is_public"]
    )

# if data["results"]:

#     player = data["results"][0]

#     player_id = player["player_id"]

#     print("\nSelected player:")
#     print("Name:", player["name"])
#     print("Player ID:", player_id)
#     print("Public:", player["is_public"])

#     stats_url = (
#         f"{BASE_URL}/players/"
#         f"{player_id}/stats/summary"
#     )

#     try:
#         stats_response = requests.get(
#             stats_url,
#             headers=headers,
#             timeout=30
#         )

#         stats_response.raise_for_status()

#         stats_data = stats_response.json()

#         print("\nStats status:", stats_response.status_code)
#         print("Stats type:", type(stats_data))

#         print("\nTop-level keys:")
#         print(stats_data.keys())

#     except requests.RequestException as error:
#         print("Stats request failed:", error)

# heroes = stats_data.get("heroes", {})

# print("\nHeroes type:")
# print(type(heroes))

# print("\nNumber of heroes:")
# print(len(heroes))

# print("\nHero keys:")
# print(list(heroes.keys())[:10])