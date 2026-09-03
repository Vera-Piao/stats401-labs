import requests
import pandas as pd
import time

BASE_URL = "https://overfast-api.tekrop.fr"

headers = {
    "User-Agent": "STATS401-Class-Exercise/1.0"
}

regions = [
    "americas",
    "europe",
    "asia"
]

divisions = [
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "master",
    "grandmaster"
]

records = []

for region in regions:

    for division in divisions:

        print(
            f"Collecting {region} - {division}"
        )

        params = {
            "platform": "pc",
            "gamemode": "competitive",
            "region": region,
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

            for hero in data:

                records.append({
                    "hero": hero["hero"],
                    "region": region,
                    "division": division,
                    "pickrate": hero["pickrate"],
                    "winrate": hero["winrate"],
                    "banrate": hero["banrate"]
                })

            print(
                f"  Added {len(data)} records"
            )

        except requests.RequestException as error:

            print(
                f"  Request failed: {error}"
            )

        time.sleep(1)

print(
    "\nTotal records:",
    len(records)
)

df = pd.DataFrame(records)

df.to_csv(
    "data/lab3_data.csv",
    index=False
)

print(
    "Saved data/lab3_data.csv"
)

print("\nFirst five rows:")
print(df.head())