import json
import os
import re
import time

import matplotlib as mpl
import matplotlib.pyplot as plt
import pandas as pd
import requests

# Configuration
DATASET_PATH = "data/dataset.json"
OUTPUT_DIR = "outputs"
RAG_URL = "http://10.245.0.12:8010/phase3/rag"
HYDE_URL = "http://10.245.0.12:8010/chat"
HEADERS = {"Content-Type": "application/json"}

TIMEOUT_SECONDS = 240  # Max time to wait for API responses

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
            match = re.search(
                r"<tool_result>\s*(.*?)\s*</tool_result>", content, re.DOTALL
            )
            if match:
                try:
                    tool_json = json.loads(match.group(1))
                    docs = tool_json.get("result", {}).get("documents", [])
                    titles = [doc.split("\n")[0].strip() for doc in docs]
                    return titles
                except json.JSONDecodeError:
                    print("Error parsing tool_result JSON.")
    return []


def calculate_mrr(retrieved_titles, target_topic):
    """Calculates Reciprocal Rank. 1 if first, 0.5 if second, 0.33 if third, 0 if missing."""
    for i, title in enumerate(retrieved_titles):
        if target_topic.lower() in title.lower():
            return 1.0 / (i + 1)
    return 0.0


def get_token_count(response_json):
    """
    Attempts to extract exact token count if provided by the API.
    Otherwise, estimates tokens based on the full trace and response
    to capture HyDE's extra internal reasoning steps.
    """
    # 1. Check if your API returns standard usage stats
    if "usage" in response_json and "total_tokens" in response_json["usage"]:
        return response_json["usage"]["total_tokens"]

    # 2. Fallback estimation (1 word ≈ 1.3 tokens)
    trace_str = json.dumps(response_json.get("trace", []))
    final_response = response_json.get("response", "")
    full_text = trace_str + " " + final_response

    return int(len(full_text.split()) * 1.3)


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
                RAG_URL, json=payload, headers=HEADERS, timeout=TIMEOUT_SECONDS
            ).json()
            rag_docs = extract_documents_from_trace(rag_res.get("trace", []))
            rag_tokens = get_token_count(rag_res)
        except Exception as e:
            print(f"     Error: {e}")
            rag_docs = []
            rag_res = {}
            rag_tokens = 0

        rag_time = time.time() - start_time
        rag_mrr = calculate_mrr(rag_docs, item["target_topic"])

        # 2. Test HyDE
        print("  -> Running HyDE...")
        start_time = time.time()
        try:
            hyde_res = requests.post(
                HYDE_URL, json=payload, headers=HEADERS, timeout=TIMEOUT_SECONDS
            ).json()
            hyde_docs = extract_documents_from_trace(hyde_res.get("trace", []))
            hyde_tokens = get_token_count(hyde_res)
        except Exception as e:
            print(f"     Error: {e}")
            hyde_docs = []
            hyde_res = {}
            hyde_tokens = 0

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
                "rag_tokens": rag_tokens,
                "hyde_tokens": hyde_tokens,
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
            "rag_time_sec",
            "hyde_time_sec",
            "rag_tokens",
            "hyde_tokens",
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
            rag_time_mean=("rag_time_sec", "mean"),
            hyde_time_mean=("hyde_time_sec", "mean"),
            rag_tokens_mean=("rag_tokens", "mean"),
            hyde_tokens_mean=("hyde_tokens", "mean"),
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
                "rag_time_mean": df["rag_time_sec"].mean(),
                "hyde_time_mean": df["hyde_time_sec"].mean(),
                "rag_tokens_mean": df["rag_tokens"].mean(),
                "hyde_tokens_mean": df["hyde_tokens"].mean(),
            }
        ]
    )
    summary = pd.concat([summary, overall], ignore_index=True)

    with open(f"{OUTPUT_DIR}/summary_metrics.md", "w") as f:
        f.write("# Aggregate Metrics by Category\n\n")
        f.write(summary.to_markdown(index=False))

    # ---------------------------------------------------------
    # 4. Generate Visualizations (ICML Paper Style)
    # ---------------------------------------------------------

    # Configure Matplotlib for academic paper standards
    mpl.rcParams.update(
        {
            "font.family": "serif",
            "font.size": 10,
            "axes.labelsize": 10,
            "legend.fontsize": 9,
            "xtick.labelsize": 9,
            "ytick.labelsize": 9,
            "axes.linewidth": 0.8,
            "lines.linewidth": 1.5,
            "pdf.fonttype": 42,  # Ensures fonts are embedded properly for conferences
            "ps.fonttype": 42,
        }
    )

    categories = summary["category"]
    x = range(len(categories))
    width = 0.35
    fig_size = (5, 3.5)  # Scales well to column widths in LaTeX

    # Colorblind friendly, professional palette
    color_rag = "#0072B2"  # Deep Blue
    color_hyde = "#D55E00"  # Vermillion
    edge_style = {"edgecolor": "black", "linewidth": 0.7}

    # Helper function to format axes
    def format_ax(ax, ylabel, ylim=None):
        ax.set_ylabel(ylabel)
        ax.set_xticks(x)
        # ha='right' aligns the rotated text properly with the tick
        ax.set_xticklabels(categories, rotation=45, ha="right")
        if ylim:
            ax.set_ylim(ylim)
        ax.legend(frameon=False)
        ax.grid(axis="y", linestyle="--", alpha=0.5)
        ax.set_axisbelow(True)  # Put grid behind bars

    # Plot 1: Hit Rate Comparison
    fig, ax = plt.subplots(figsize=fig_size)
    ax.bar(
        [i - width / 2 for i in x],
        summary["rag_hit_rate"],
        width,
        label="Classic RAG",
        color=color_rag,
        **edge_style,
    )
    ax.bar(
        [i + width / 2 for i in x],
        summary["hyde_hit_rate"],
        width,
        label="HyDE",
        color=color_hyde,
        **edge_style,
    )
    format_ax(ax, "Hit Rate @ 3", ylim=(0, 1.1))
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/1_hit_rate_comparison.png", dpi=300, bbox_inches="tight")
    plt.savefig(f"{OUTPUT_DIR}/1_hit_rate_comparison.pdf", bbox_inches="tight")
    plt.close()

    # Plot 2: MRR Comparison
    fig, ax = plt.subplots(figsize=fig_size)
    ax.bar(
        [i - width / 2 for i in x],
        summary["rag_mrr"],
        width,
        label="Classic RAG",
        color=color_rag,
        **edge_style,
    )
    ax.bar(
        [i + width / 2 for i in x],
        summary["hyde_mrr"],
        width,
        label="HyDE",
        color=color_hyde,
        **edge_style,
    )
    format_ax(ax, "Mean Reciprocal Rank (MRR)", ylim=(0, 1.1))
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/2_mrr_comparison.png", dpi=300, bbox_inches="tight")
    plt.savefig(f"{OUTPUT_DIR}/2_mrr_comparison.pdf", bbox_inches="tight")
    plt.close()

    # Plot 3: Time Comparison
    fig, ax = plt.subplots(figsize=fig_size)
    ax.bar(
        [i - width / 2 for i in x],
        summary["rag_time_mean"],
        width,
        label="Classic RAG",
        color=color_rag,
        **edge_style,
    )
    ax.bar(
        [i + width / 2 for i in x],
        summary["hyde_time_mean"],
        width,
        label="HyDE",
        color=color_hyde,
        **edge_style,
    )
    format_ax(ax, "Generation Time (s)")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/3_time_comparison.png", dpi=300, bbox_inches="tight")
    plt.savefig(f"{OUTPUT_DIR}/3_time_comparison.pdf", bbox_inches="tight")
    plt.close()

    # Plot 4: Token Usage Comparison
    fig, ax = plt.subplots(figsize=fig_size)
    ax.bar(
        [i - width / 2 for i in x],
        summary["rag_tokens_mean"],
        width,
        label="Classic RAG",
        color=color_rag,
        **edge_style,
    )
    ax.bar(
        [i + width / 2 for i in x],
        summary["hyde_tokens_mean"],
        width,
        label="HyDE",
        color=color_hyde,
        **edge_style,
    )
    format_ax(ax, "Total Tokens Used")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/4_token_comparison.png", dpi=300, bbox_inches="tight")
    plt.savefig(f"{OUTPUT_DIR}/4_token_comparison.pdf", bbox_inches="tight")
    plt.close()

    print("Done! Check the 'outputs' folder.")


if __name__ == "__main__":
    df_results = run_evaluation()
    generate_reports(df_results)
