import requests
import time

BASE_URL = "https://overfast-api.tekrop.fr"

headers = {
    "User-Agent": "STATS401-Class-Exercise/1.0"
}

divisions = [
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond"
]

for division in divisions:

    params = {
        "platform": "pc",
        "gamemode": "competitive",
        "region": "americas",
        "competitive_division": division
    }

    try:
        response = requests.get(
            f"{BASE_URL}/heroes/stats",
            headers=headers,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        data = response.json()

        print(f"\nDivision: {division}")
        print("Number of records:", len(data))

        if data:
            print("First record:", data[0])

    except requests.RequestException as error:
        print(
            f"Request failed for {division}:",
            error
        )

    time.sleep(1)