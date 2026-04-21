import json
import os
import re
import time

import matplotlib.pyplot as plt
import pandas as pd
import requests

# Configuration
DATASET_PATH = "dataset.json"
OUTPUT_DIR = "outputs"
RAG_URL = "http://localhost:8010/phase3/rag"
HYDE_URL = "http://localhost:8010/chat"
HEADERS = {"Content-Type": "application/json"}

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_documents_from_trace(trace):
    """
    Extracts document titles from the nested tool_result string in the trace.
    Handles the specific JSON-in-string formatting of the provided API.
    """
    for step in trace:
        if (
            step.get("role") == "tool"
            and step.get("tool_name") == "rag_retrieve_context"
        ):
            content = step.get("content", "")
            # Extract the JSON string between <tool_result> tags
            match = re.search(
                r"<tool_result>\n(.*?)\n</tool_result>", content, re.DOTALL
            )
            if match:
                try:
                    tool_json = json.loads(match.group(1))
                    docs = tool_json.get("result", {}).get("documents", [])
                    # Extract just the title (first line before \nURL:)
                    titles = [doc.split("\n")[0].strip() for doc in docs]
                    return titles
                except json.JSONDecodeError:
                    print("Error parsing tool_result JSON.")
    return []


def calculate_mrr(retrieved_titles, target_topic):
    """Calculates Reciprocal Rank. 1 if first, 0.5 if second, 0.33 if third, 0 if missing."""
    for i, title in enumerate(retrieved_titles):
        # Case-insensitive partial match to account for minor formatting differences
        if target_topic.lower() in title.lower():
            return 1.0 / (i + 1)
    return 0.0


def run_evaluation():
    with open(DATASET_PATH, "r") as f:
        dataset = json.load(f)

    results = []

    print(f"Starting evaluation of {len(dataset)} queries...\n")

    for item in dataset:
        print(
            f"[{item['id']}/{len(dataset)}] Category: {item['category']} | Target: {item['target_topic']}"
        )

        payload = {"prompt": item["query"]}

        # 1. Test Classical RAG
        print("  -> Running Classical RAG...")
        start_time = time.time()
        try:
            rag_res = requests.post(
                RAG_URL, json=payload, headers=HEADERS, timeout=60
            ).json()
            rag_docs = extract_documents_from_trace(rag_res.get("trace", []))
        except Exception as e:
            print(f"     Error: {e}")
            rag_docs = []
        rag_time = time.time() - start_time
        rag_mrr = calculate_mrr(rag_docs, item["target_topic"])

        # 2. Test HyDE
        print("  -> Running HyDE...")
        start_time = time.time()
        try:
            hyde_res = requests.post(
                HYDE_URL, json=payload, headers=HEADERS, timeout=60
            ).json()
            hyde_docs = extract_documents_from_trace(hyde_res.get("trace", []))
        except Exception as e:
            print(f"     Error: {e}")
            hyde_docs = []
        hyde_time = time.time() - start_time
        hyde_mrr = calculate_mrr(hyde_docs, item["target_topic"])

        # 3. Store Results
        results.append(
            {
                "id": item["id"],
                "category": item["category"],
                "query": item["query"],
                "target_topic": item["target_topic"],
                "rag_retrieved": ", ".join(rag_docs),
                "hyde_retrieved": ", ".join(hyde_docs),
                "rag_hit": 1 if rag_mrr > 0 else 0,
                "hyde_hit": 1 if hyde_mrr > 0 else 0,
                "rag_mrr": rag_mrr,
                "hyde_mrr": hyde_mrr,
                "rag_time_sec": round(rag_time, 2),
                "hyde_time_sec": round(hyde_time, 2),
            }
        )

    return pd.DataFrame(results)


def generate_reports(df):
    print("\nGenerating reports and visualizations in /outputs...")

    # 1. Save Raw Data
    df.to_csv(f"{OUTPUT_DIR}/full_results.csv", index=False)

    # 2. Save Markdown Table (For your project report)
    md_df = df[
        [
            "category",
            "query",
            "target_topic",
            "rag_hit",
            "hyde_hit",
            "rag_mrr",
            "hyde_mrr",
        ]
    ]
    with open(f"{OUTPUT_DIR}/results_table.md", "w") as f:
        f.write("# RAG vs HyDE Evaluation Results\n\n")
        f.write(md_df.to_markdown(index=False))

    # 3. Compute Aggregate Metrics
    summary = (
        df.groupby("category")
        .agg(
            rag_hit_rate=("rag_hit", "mean"),
            hyde_hit_rate=("hyde_hit", "mean"),
            rag_mrr=("rag_mrr", "mean"),
            hyde_mrr=("hyde_mrr", "mean"),
        )
        .reset_index()
    )

    # Overall summary row
    overall = pd.DataFrame(
        [
            {
                "category": "OVERALL",
                "rag_hit_rate": df["rag_hit"].mean(),
                "hyde_hit_rate": df["hyde_hit"].mean(),
                "rag_mrr": df["rag_mrr"].mean(),
                "hyde_mrr": df["hyde_mrr"].mean(),
            }
        ]
    )
    summary = pd.concat([summary, overall], ignore_index=True)

    with open(f"{OUTPUT_DIR}/summary_metrics.md", "w") as f:
        f.write("# Aggregate Metrics by Category\n\n")
        f.write(summary.to_markdown(index=False))

    # 4. Generate Visualizations
    categories = summary["category"]
    x = range(len(categories))
    width = 0.35

    # Plot 1: Hit Rate Comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(
        [i - width / 2 for i in x],
        summary["rag_hit_rate"],
        width,
        label="Classic RAG",
        color="#e74c3c",
    )
    ax.bar(
        [i + width / 2 for i in x],
        summary["hyde_hit_rate"],
        width,
        label="HyDE",
        color="#2ecc71",
    )
    ax.set_ylabel("Hit Rate @ 3 (Percentage)")
    ax.set_title("Hit Rate Comparison: Classic RAG vs HyDE")
    ax.set_xticks(x)
    ax.set_xticklabels(categories, rotation=45)
    ax.set_ylim(0, 1.1)
    ax.legend()
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/hit_rate_comparison.png", dpi=300)
    plt.savefig(f"{OUTPUT_DIR}/hit_rate_comparison.pdf")
    plt.close()

    # Plot 2: MRR Comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(
        [i - width / 2 for i in x],
        summary["rag_mrr"],
        width,
        label="Classic RAG",
        color="#3498db",
    )
    ax.bar(
        [i + width / 2 for i in x],
        summary["hyde_mrr"],
        width,
        label="HyDE",
        color="#9b59b6",
    )
    ax.set_ylabel("Mean Reciprocal Rank (MRR)")
    ax.set_title("MRR Comparison: Classic RAG vs HyDE")
    ax.set_xticks(x)
    ax.set_xticklabels(categories, rotation=45)
    ax.set_ylim(0, 1.1)
    ax.legend()
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/mrr_comparison.png", dpi=300)
    plt.savefig(f"{OUTPUT_DIR}/mrr_comparison.pdf")
    plt.close()

    print("Done! Check the 'outputs' folder.")


if __name__ == "__main__":
    df_results = run_evaluation()
    generate_reports(df_results)
