"""Tool implementations, output formatters, and registry for ReAct tool use."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import requests

from agent.src.rag.rag_engine import retrieve_context


@dataclass(frozen=True)
class ToolSpec:
    """Registered tool definition with execution and output formatting logic."""

    func: Callable[..., Any]
    formatter: Callable[[Any], dict[str, Any]]


def _raw_success(tool_name: str, result: Any) -> dict[str, Any]:
    return {"status": "success", "tool_name": tool_name, "result": result}


def _raw_error(tool_name: str, message: str) -> dict[str, Any]:
    return {"status": "error", "tool_name": tool_name, "message": message}


def _raw_not_found(tool_name: str, message: str) -> dict[str, Any]:
    return {"status": "not_found", "tool_name": tool_name, "message": message}


def _format_standard_tool_output(tool_name: str, raw_result: Any) -> dict[str, Any]:
    """Normalize raw tool output into the standard tool_result contract."""
    if not isinstance(raw_result, dict):
        return {
            "status": "error",
            "tool_name": tool_name,
            "message": f"Tool '{tool_name}' returned a non-dict response.",
        }

    status = raw_result.get("status")
    if status not in {"success", "error", "not_found"}:
        return {
            "status": "error",
            "tool_name": tool_name,
            "message": f"Tool '{tool_name}' returned invalid status '{status}'.",
        }

    if status == "success":
        return {
            "status": "success",
            "tool_name": tool_name,
            "result": raw_result.get("result", {}),
        }

    message = raw_result.get("message")
    if not isinstance(message, str) or not message:
        message = f"Tool '{tool_name}' failed without an error message."

    return {
        "status": status,
        "tool_name": tool_name,
        "message": message,
    }


# --- Tool 1: Cockcroft-Gault Creatinine Clearance Calculator ---


def calculate_creatinine_cockcroft(
    age: int,
    weight_kg: float,
    scr: float,
    sex: str,
) -> dict[str, Any]:
    """Calculate creatinine clearance (CrCl) using the Cockcroft-Gault equation."""
    tool_name = "calculate_creatinine_cockcroft"

    sex_lower = str(sex).strip().lower()
    if sex_lower not in ("male", "female"):
        return _raw_error(
            tool_name, f"Invalid sex '{sex}'. Must be 'male' or 'female'."
        )

    try:
        age_i, weight_f, scr_f = int(age), float(weight_kg), float(scr)
    except (TypeError, ValueError):
        return _raw_error(tool_name, "Age, weight_kg, and scr must be numeric values.")

    if scr_f <= 0:
        return _raw_error(tool_name, f"Serum creatinine must be positive, got {scr}.")
    if age_i <= 0 or weight_f <= 0:
        return _raw_error(tool_name, "Age and weight must be positive values.")

    crcl = ((140 - age_i) * weight_f) / (72 * scr_f)
    if sex_lower == "female":
        crcl *= 0.85

    return _raw_success(
        tool_name,
        {
            "creatinine_clearance_ml_min": round(crcl, 2),
            "unit": "mL/min",
        },
    )


def format_calculate_creatinine_cockcroft_result(raw_result: Any) -> dict[str, Any]:
    return _format_standard_tool_output("calculate_creatinine_cockcroft", raw_result)


# --- Tool 2: OpenFDA Drug Search ---

_FDA_BASE_URL = "https://api.fda.gov/drug/label.json"
_FDA_TIMEOUT = 10


def fda_drug_search(drug_name: str) -> dict[str, Any]:
    """Search OpenFDA labeling data with brand-name and generic-name fallbacks."""
    tool_name = "fda_drug_search"

    query = str(drug_name).strip()
    if not query:
        return _raw_error(tool_name, "Drug name must not be empty.")

    search_attempts = [
        ("brand_name", f'openfda.brand_name:"{query}"'),
        ("generic_name", f'openfda.generic_name:"{query}"'),
    ]
    last_request_error: str | None = None

    for match_type, search_query in search_attempts:
        try:
            resp = requests.get(
                _FDA_BASE_URL,
                params={"search": search_query, "limit": 1},
                timeout=_FDA_TIMEOUT,
            )
            resp.raise_for_status()
        except requests.exceptions.Timeout:
            last_request_error = (
                f"FDA API request timed out while searching by {match_type}."
            )
            continue
        except requests.exceptions.RequestException as exc:
            last_request_error = (
                f"FDA API request failed while searching by {match_type}: {exc}"
            )
            continue

        try:
            data = resp.json()
        except ValueError:
            last_request_error = (
                f"FDA API returned invalid JSON while searching by {match_type}."
            )
            continue

        results = data.get("results")
        if not results:
            continue

        record = results[0]
        openfda = record.get("openfda", {})

        def _first(field: str, max_len: int = 500) -> str:
            val = record.get(field, [])
            if isinstance(val, list) and val:
                text = str(val[0])
            elif isinstance(val, str):
                text = val
            else:
                text = "Not available"
            return text[:max_len]

        return _raw_success(
            tool_name,
            {
                "query": query,
                "match_type": match_type,
                "brand_name": ", ".join(openfda.get("brand_name", ["Not available"])),
                "generic_name": ", ".join(
                    openfda.get("generic_name", ["Not available"])
                ),
                "indications_and_usage": _first("indications_and_usage"),
                "warnings": _first("warnings"),
                "dosage_and_administration": _first("dosage_and_administration"),
            },
        )

    if last_request_error is not None:
        return _raw_error(tool_name, last_request_error)

    return _raw_not_found(
        tool_name, f"No FDA results found for '{query}' by brand or generic name."
    )


def format_fda_drug_search_result(raw_result: Any) -> dict[str, Any]:
    return _format_standard_tool_output("fda_drug_search", raw_result)


# --- Tool 3: RAG Context Retrieval ---


def rag_retrieve_context(
    query: str,
    k: int = 3,
    metadata_filter: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Retrieve relevant context documents from the vector database."""
    tool_name = "rag_retrieve_context"

    query_text = str(query).strip()
    if not query_text:
        return _raw_error(tool_name, "Query must not be empty.")

    try:
        k_int = int(k)
    except (TypeError, ValueError):
        return _raw_error(tool_name, "k must be an integer.")
    if k_int <= 0:
        return _raw_error(tool_name, "k must be greater than 0.")

    if metadata_filter is not None and not isinstance(metadata_filter, dict):
        return _raw_error(
            tool_name,
            "metadata_filter must be an object/dictionary if provided.",
        )

    try:
        documents = retrieve_context(
            query=query_text,
            k=k_int,
            metadata_filter=metadata_filter,
        )
    except (
        Exception
    ) as exc:  # pragma: no cover - defensive wrapper around external deps
        return _raw_error(tool_name, f"RAG retrieval failed: {exc}")

    if not documents:
        return _raw_not_found(tool_name, "No relevant context documents were found.")

    return _raw_success(
        tool_name,
        {
            "query": query_text,
            "k": k_int,
            "count": len(documents),
            "documents": documents,
        },
    )


def format_rag_retrieve_context_result(raw_result: Any) -> dict[str, Any]:
    return _format_standard_tool_output("rag_retrieve_context", raw_result)


# --- Registry ---

AVAILABLE_TOOLS: dict[str, ToolSpec] = {
    "calculate_creatinine_cockcroft": ToolSpec(
        func=calculate_creatinine_cockcroft,
        formatter=format_calculate_creatinine_cockcroft_result,
    ),
    "fda_drug_search": ToolSpec(
        func=fda_drug_search,
        formatter=format_fda_drug_search_result,
    ),
    "rag_retrieve_context": ToolSpec(
        func=rag_retrieve_context,
        formatter=format_rag_retrieve_context_result,
    ),
}

# --- JSON Schemas for Qwen2.5 apply_chat_template(tools=...) ---

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "calculate_creatinine_cockcroft",
            "description": (
                "Calculate estimated creatinine clearance (kidney function) "
                "using the Cockcroft-Gault equation. Use this for questions about "
                "GFR, kidney function, or creatinine clearance."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "age": {
                        "type": "integer",
                        "description": "Patient age in years",
                    },
                    "weight_kg": {
                        "type": "number",
                        "description": "Patient weight in kilograms",
                    },
                    "scr": {
                        "type": "number",
                        "description": "Serum creatinine level in mg/dL",
                    },
                    "sex": {
                        "type": "string",
                        "enum": ["male", "female"],
                        "description": "Patient biological sex",
                    },
                },
                "required": ["age", "weight_kg", "scr", "sex"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fda_drug_search",
            "description": (
                "Retrieve official OpenFDA drug labeling information for a specific drug. "
                "Use this to verify drug indications, warnings, dosage, contraindications, "
                "or adverse effects from FDA label data."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "drug_name": {
                        "type": "string",
                        "description": (
                            "A specific single drug name, either brand or generic."
                        ),
                    },
                },
                "required": ["drug_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rag_retrieve_context",
            "description": (
                "Retrieve relevant contextual documents from the vector database "
                "to help answer domain-specific or knowledge-based questions. "
                "Use this when additional background knowledge is required."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The user question or search query.",
                    },
                    "k": {
                        "type": "integer",
                        "description": "Number of top similar documents to retrieve.",
                        "default": 3,
                        "minimum": 1,
                        "maximum": 20,
                    },
                    "metadata_filter": {
                        "type": "object",
                        "description": (
                            "Optional metadata filter in Mongo-style query format "
                            "to restrict results (e.g., by document type, source, or category)."
                        ),
                    },
                },
                "required": ["query"],
            },
        },
    },
]
