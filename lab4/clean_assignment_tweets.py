# Lab 4 Assignment
# Clean and analyze a dataset of Trump tweets from 2017

import pandas as pd


# 1. Load and inspect the raw data
df = pd.read_json(
    "../data/condensed_2017.json"
)

print("Original shape:", df.shape)
print("\nColumns:")
print(df.columns.tolist())

print("\nFirst five rows:")
print(df.head())

print("\nData types:")
print(df.info())

print("\nMissing values:")
print(df.isna().sum())

print("\nDuplicate tweet IDs:")
print(df.duplicated(subset=["id_str"]).sum())

print("\nDuplicate text:")
print(df.duplicated(subset=["text"]).sum())

print("\nRetweet distribution:")
print(df["is_retweet"].value_counts())

print("\nTweet sources:")
print(df["source"].value_counts())

# 2. Clean structured fields

# Preserve the original tweet text
df["tweet_text_raw"] = df["text"].astype("string")

# Tweet IDs are identifiers, not quantities
df["tweet_id"] = df["id_str"].astype("string")

# Parse dates explicitly
df["created_at"] = pd.to_datetime(
    df["created_at"],
    errors="coerce",
    utc=True
)

# Convert engagement variables to numeric values
df["retweet_count"] = pd.to_numeric(
    df["retweet_count"],
    errors="coerce"
)

df["favorite_count"] = pd.to_numeric(
    df["favorite_count"],
    errors="coerce"
)

# Remove records missing fields required for the analysis
df = df.dropna(
    subset=[
        "tweet_id",
        "tweet_text_raw",
        "created_at",
        "retweet_count",
        "favorite_count"
    ]
)

# Remove impossible engagement values
df = df[
    (df["retweet_count"] >= 0)
    & (df["favorite_count"] >= 0)
].copy()

# Remove duplicate tweet IDs
df = df.drop_duplicates(
    subset=["tweet_id"],
    keep="first"
)

# Keep only tweets posted during 2017
df = df[
    df["created_at"].dt.year == 2017
].copy()

# Exclude retweets so repeated content does not dominate the analysis
df = df[
    ~df["is_retweet"]
].copy()

# Record whether a tweet was a reply before dropping the reply ID
df["is_reply"] = (
    df["in_reply_to_user_id_str"].notna()
)

# Standardize source names
source_map = {
    "Twitter for iPhone": "iPhone",
    "Twitter for Android": "Android",
    "Twitter Web Client": "Web",
    "Twitter for iPad": "iPad",
    "Media Studio": "Media Studio",
    "Twitter Ads": "Twitter Ads"
}

df["source_clean"] = (
    df["source"]
    .astype("string")
    .str.strip()
    .replace(source_map)
)

# Normalize whitespace while preserving punctuation and capitalization
df["tweet_text"] = (
    df["tweet_text_raw"]
    .str.replace(r"\s+", " ", regex=True)
    .str.strip()
)

# Create useful date and text attributes
df["date"] = df["created_at"].dt.strftime("%Y-%m-%d")
df["month"] = df["created_at"].dt.strftime("%Y-%m")
df["weekday"] = df["created_at"].dt.day_name()
df["hour"] = df["created_at"].dt.hour
df["tweet_length"] = df["tweet_text"].str.len()
df["word_count"] = df["tweet_text"].str.split().str.len()


# 3. Validate the cleaned data
print("\nCleaned shape:", df.shape)

print("\nCleaned date range:")
print(df["created_at"].min())
print(df["created_at"].max())

print("\nMissing values in required fields:")
print(
    df[[
        "tweet_id",
        "tweet_text",
        "created_at",
        "retweet_count",
        "favorite_count"
    ]].isna().sum()
)

print("\nDuplicate tweet IDs after cleaning:")
print(df.duplicated(subset=["tweet_id"]).sum())

print("\nSource distribution:")
print(df["source_clean"].value_counts())

print("\nReply distribution:")
print(df["is_reply"].value_counts())

# 4. Prepare text for RoBERTa sentiment analysis

import re
from transformers import pipeline


def prepare_for_roberta(text):
    """
    Lightly normalize Twitter-specific text while preserving
    capitalization, punctuation, emoji, and negation.
    """
    text = str(text)
    text = re.sub(r"@\w+", "@user", text)
    text = re.sub(
        r"https?://\S+|www\.\S+",
        "http",
        text
    )
    return text.strip()


df["sentiment_text"] = (
    df["tweet_text_raw"]
    .fillna("")
    .apply(prepare_for_roberta)
)


# 5. Estimate sentiment with a RoBERTa model

sentiment_model = pipeline(
    "sentiment-analysis",
    model=(
        "cardiffnlp/"
        "twitter-roberta-base-sentiment-latest"
    ),
    top_k=None
)

print(
    "\nRunning RoBERTa sentiment analysis on",
    len(df),
    "tweets..."
)

results = sentiment_model(
    df["sentiment_text"].tolist(),
    truncation=True,
    batch_size=16
)


def scores_to_dict(scores):
    return {
        item["label"].lower(): item["score"]
        for item in scores
    }


score_dicts = [
    scores_to_dict(scores)
    for scores in results
]

df["sentiment_negative"] = [
    scores.get("negative", 0)
    for scores in score_dicts
]

df["sentiment_neutral"] = [
    scores.get("neutral", 0)
    for scores in score_dicts
]

df["sentiment_positive"] = [
    scores.get("positive", 0)
    for scores in score_dicts
]


def predicted_label(scores):
    return max(
        scores,
        key=scores.get
    ).capitalize()


df["sentiment"] = [
    predicted_label(scores)
    for scores in score_dicts
]

# Continuous sentiment score: approximately -1 = negative, 0 = neutral, 1 = positive
df["sentiment_score"] = (
    df["sentiment_positive"]
    - df["sentiment_negative"]
)


# 6. Validate sentiment results

print("\nSentiment distribution:")
print(df["sentiment"].value_counts())

print("\nSentiment-score summary:")
print(df["sentiment_score"].describe())

probability_sum = (
    df["sentiment_negative"]
    + df["sentiment_neutral"]
    + df["sentiment_positive"]
)

print("\nProbability-sum summary:")
print(probability_sum.describe())

print("\nSample predictions:")
print(
    df[[
        "tweet_text",
        "sentiment",
        "sentiment_score",
        "sentiment_negative",
        "sentiment_neutral",
        "sentiment_positive"
    ]].head()
)

# 7. Create tidy visualization-ready data

vis_df = df[[
    "tweet_id",
    "created_at",
    "date",
    "month",
    "weekday",
    "hour",
    "source_clean",
    "is_reply",
    "tweet_text",
    "favorite_count",
    "retweet_count",
    "tweet_length",
    "word_count",
    "sentiment_negative",
    "sentiment_neutral",
    "sentiment_positive",
    "sentiment_score",
    "sentiment"
]].copy()

vis_df = vis_df.rename(
    columns={
        "source_clean": "source"
    }
)

vis_df = vis_df.sort_values(
    "created_at"
).reset_index(drop=True)

vis_df.to_csv(
    "../data/lab4_assignment_clean_tweets.csv",
    index=False
)


# 8. Aggregate monthly sentiment for D3

sentiment_by_month = (
    vis_df
    .groupby(
        ["month", "sentiment"]
    )
    .size()
    .reset_index(name="count")
)

sentiment_by_month["monthly_total"] = (
    sentiment_by_month
    .groupby("month")["count"]
    .transform("sum")
)

sentiment_by_month["proportion"] = (
    sentiment_by_month["count"]
    / sentiment_by_month["monthly_total"]
)

sentiment_by_month.to_csv(
    "../data/sentiment_by_month.csv",
    index=False
)


# 9. Final validation

print("\nFinal visualization dataset:")
print(vis_df.head())
print("Shape:", vis_df.shape)

print("\nFinal missing values:")
print(vis_df.isna().sum())

print("\nMonthly sentiment data:")
print(sentiment_by_month)

print(
    "\nMonthly totals:",
    sentiment_by_month
    .groupby("month")["count"]
    .sum()
    .sum()
)

print("\nFiles created:")
print("../data/lab4_assignment_clean_tweets.csv")
print("../data/sentiment_by_month.csv")