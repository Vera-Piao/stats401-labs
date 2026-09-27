import pandas as pd

df = pd.read_csv(
    "../data/bulletin_passages.csv"
)

raw_passage_count = len(df)

df = df.dropna(
    subset=["text"]
)

df = df.drop_duplicates(
    subset=["text"]
)

df = df.reset_index(drop=True)

df["text_clean"] = (
    df["text"]
    .str.replace(
        r"\s+",
        " ",
        regex=True
    )
    .str.strip()
)

print(df.head())
print(df.shape)

clean_passage_count = len(df)

# Task 4 Basic Corpus Analysis

df["word_count"] = (
    df["text_clean"]
    .str.split()
    .str.len()
)

print("\nPassage Length:")
print(
    df["word_count"].describe()
)

print("\nPassages by Section:")
print(
    df["section"].value_counts()
)

corpus_summary_df = pd.DataFrame([{
    "raw_passages": raw_passage_count,
    "clean_passages": clean_passage_count,
    "average_words": round(df["word_count"].mean(), 2),
    "formal_sections": df["section"].nunique()
}])

corpus_summary_df.to_csv(
    "../data/lab8_corpus_summary.csv",
    index=False
)

section_summary_df = (
    df
    .groupby("section")
    .agg(
        passage_count=("passage_id", "count"),
        average_words=("word_count", "mean")
    )
    .reset_index()
)

section_summary_df["average_words"] = (
    section_summary_df["average_words"]
    .round(2)
)

section_summary_df.to_csv(
    "../data/lab8_section_summary.csv",
    index=False
)

# Task 6 Generate Semantic Embeddings

from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

embeddings = model.encode(
    df["text_clean"].tolist(),
    normalize_embeddings=True
)

print("\nEmbeddings shape:")
print(embeddings.shape)

# Task 7 Semantic Similarity

from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

similarity = cosine_similarity(
    embeddings
)

scores = similarity[0].copy()

# cosine similarity with itself will always be 1, so argmax will always return 1, that's why we need to encode the first similarity (passage0 compares with passage 0) to -1
scores[0] = -1 

index = np.argmax(scores)

print("\nOriginal Passage:")
print(df.iloc[0]["text"])

print("\nMost Similar Passage:")
print(df.iloc[index]["text"])

print(
    "\nSimilarity:",
    scores[index]
)

# Task 13: store the five nearest neighbors in the original embedding space.
# This supports Task 13 without shipping the full embedding vectors
# to the browser.

neighbor_scores = similarity.copy()
np.fill_diagonal(neighbor_scores, -np.inf)

neighbor_indices = np.argsort(
    neighbor_scores,
    axis=1
)[:, -5:][:, ::-1]

df["neighbor_ids"] = [
    "|".join(
        df.iloc[neighbor_index]["passage_id"]
        for neighbor_index in row
    )
    for row in neighbor_indices
]

# Task 8 UMAP Projection

import umap

reducer = umap.UMAP(
    n_components=2, # 2-dimentional
    n_neighbors=15, # the size of local neighborhood of each point
    min_dist=0.15,
    metric="cosine",
    random_state=401
)

coords = reducer.fit_transform(
    embeddings
)

df["x"] = coords[:, 0]
df["y"] = coords[:, 1]

print("\nUMAP Coordinates:")
print(
    df[["x", "y"]].head()
)

# Task 9 Cluster Semantic Topics

from sklearn.cluster import KMeans

kmeans = KMeans(
    n_clusters=8,
    random_state=401,
    n_init="auto"
)

df["cluster"] = (
    kmeans.fit_predict(
        embeddings
    )
)

print("\nCluster Counts:")
print(
    df["cluster"]
    .value_counts()
    .sort_index()
)

for c in sorted(df["cluster"].unique()):

    print("\nCLUSTER", c)

    subset = df[
        df["cluster"] == c
    ]

    for text in subset[
        "text_clean"
    ].head(10):

        print("-", text)

# TF-IDF terms for each cluster

from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(
    stop_words="english",
    max_features=2000
)

tfidf = vectorizer.fit_transform(
    df["text_clean"]
)

terms = np.array(
    vectorizer.get_feature_names_out()
)

print(
    "\nTop TF-IDF Terms by Cluster:"
)

cluster_terms = {}

for c in sorted(
    df["cluster"].unique()
):

    mask = (
        df["cluster"] == c
    ).to_numpy()

    mean_scores = (
        tfidf[mask]
        .mean(axis=0)
        .A1
    )

    top_indices = (
        mean_scores
        .argsort()[-10:]
        [::-1]
    )

    top_terms = terms[
        top_indices
    ]

    cluster_terms[c] = top_terms.tolist()

    print(
        f"Cluster {c}:",
        ", ".join(top_terms)
    )

cluster_names = {
    0: "STEM Courses and Prerequisites",
    1: "Academic Credit and Procedures",
    2: "Degree Requirements and Electives",
    3: "Politics, History, and Global Studies",
    4: "Media, Arts, and Culture",
    5: "Chinese Language and China Studies",
    6: "Health, Society, and Research",
    7: "University Policies and Student Life"
}

df["cluster_name"] = (
    df["cluster"]
    .map(cluster_names)
)

overall_scores = tfidf.mean(axis=0).A1
overall_indices = overall_scores.argsort()[-15:][::-1]

top_terms_df = pd.DataFrame({
    "term": terms[overall_indices],
    "mean_tfidf": overall_scores[overall_indices]
})

top_terms_df.to_csv(
    "../data/lab8_top_terms.csv",
    index=False
)

cluster_summary_df = pd.DataFrame([
    {
        "cluster": cluster,
        "cluster_name": cluster_names[cluster],
        "passage_count": int((df["cluster"] == cluster).sum()),
        "top_terms": ", ".join(cluster_terms[cluster])
    }
    for cluster in sorted(cluster_names)
])

cluster_summary_df.to_csv(
    "../data/lab8_cluster_summary.csv",
    index=False
)

output_columns = [
    "passage_id",
    "chapter",
    "section",
    "subsection",
    "page",
    "text",
    "word_count",
    "cluster",
    "cluster_name",
    "neighbor_ids",
    "x",
    "y"
]

df[
    output_columns
].to_csv(
    "../data/lab8_embedding_map.csv",
    index=False
)

print(
    "\nExported:",
    "../data/lab8_embedding_map.csv"
)

print(
    df[output_columns].head()
)

print(
    "\nShape:",
    df[output_columns].shape
)

# Task 14: export the Topic x Bulletin Section matrix.

matrix_df = (
    df
    .groupby(
        ["section", "cluster_name"]
    )
    .size()
    .reset_index(name="count")
)

matrix_df.to_csv(
    "../data/lab8_topic_section_matrix.csv",
    index=False
)

print(
    "\nExported:",
    "../data/lab8_topic_section_matrix.csv"
)
