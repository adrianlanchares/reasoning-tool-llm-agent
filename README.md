# Reasoning Tool LLM Agent

This repository contains a complete pipeline for building an autonomous reasoning agent on top of a base language model. The project combines supervised fine-tuning, reinforcement learning, tool calling, retrieval-augmented generation, and a final ReAct loop exposed through a FastAPI backend and a React frontend.

## Project Goal

The system is designed to answer questions by reasoning step by step, calling tools when needed, retrieving private knowledge from a vector store, and exposing the full interaction trace for evaluation.

## Repository Structure

- `agent/`: Python backend, model loading, training scripts, tools, RAG, and API.
- `frontend/`: React + Vite chat interface for interacting with the agent.
- `docs/`: report and presentation material.
- `query.sh`: helper script for running queries locally.

## Main Phases

The backend is organized into four cumulative phases.

### Phase 1: RLM

Location: `agent/src/rlm/`

This phase turns a base model into a reasoning language model. It includes:

- `train_sft.py`: supervised fine-tuning on GSM8K with a strict `<think>...</think><answer>...</answer>` format.
- `train_grpo.py`: a simple GRPO-style reinforcement learning loop with reward shaping based on output structure and numeric correctness.
- `load_model.py`: loads the base model and applies the LoRA adapter.

### Phase 2: Tool Use

Location: `agent/src/tool_use/`

This phase adds function calling. The registered tools are:

- `calculate_creatinine_cockcroft`: Cockcroft-Gault creatinine clearance.
- `fda_drug_search`: OpenFDA drug label lookup.
- `rag_retrieve_context`: semantic retrieval from the vector database.

Tool calls are parsed from `<tool_call>...</tool_call>` blocks and executed in a loop until the model returns a final answer.

### Phase 3: RAG

Location: `agent/src/rag/`

This phase ingests documents into a Chroma vector store and retrieves relevant context during inference.

- `ingest_data.py` handles `.txt` and `.xml` documents.
- `rag_engine.py` queries the vector database.
- `config.py` defines the data and vectorstore locations and the embedding model.

### Phase 4: ReAct Agent

Location: `agent/src/react/agent.py`

This is the final integrated agent. It:

1. Builds a chat history with the system prompt.
2. Generates a model response.
3. Detects whether the model produced a final answer or a tool call.
4. Executes the tool if needed.
5. Appends the observation and repeats until completion.

For RAG queries, the agent also generates a hypothetical document before retrieval to improve semantic search.

## Backend API

The FastAPI application lives in [agent/src/api/app.py](agent/src/api/app.py). On startup it:

- selects the GPU with the most free memory when NVIDIA tooling is available,
- loads the RLM model,
- initializes the ReAct agent.

Available endpoints:

- `POST /phase1/reasoning`
- `POST /phase2/tools`
- `POST /phase3/rag`
- `POST /phase4/agent`
- `POST /chat`

The `/chat` endpoint is what the frontend uses. Requests include a `prompt` plus optional prior `context` messages.

## Frontend

Location: `frontend/`

The frontend is a lightweight chat interface built with React and Vite. It provides:

- a conversation sidebar with create, rename, and delete actions,
- a main chat window,
- a multiline input box with enter-to-send behavior,
- a collapsible reasoning trace viewer for assistant responses.

The frontend sends messages to the backend `/chat` endpoint and renders both the final answer and the trace returned by the agent.

## Training and Inference

The backend is containerized and intended to run on a GPU machine.

- `agent/docker-compose.yml` defines services for SFT training, GRPO training, backend inference, and an interactive shell.
- `agent/Dockerfile` installs Python and the ML stack needed for model training and inference.
- `frontend/docker-compose.yml` and `frontend/Dockerfile` build and serve the UI through Nginx.

Expected model artifact paths are controlled by environment variables such as `SFT_MODEL_PATH` and `FINAL_MODEL_PATH`.

## RAG Configuration

The RAG code reads these environment variables:

- `RAG_DATA_DIR`: directory with source documents.
- `RAG_VECTORSTORE_DIR`: Chroma persistence directory.
- `RAG_EMBEDDING_MODEL`: sentence-transformer embedding model.

If the variables are not set, the code falls back to local default paths inside the repository.

## Data Flow

1. A user sends a message from the frontend.
2. The frontend posts the current prompt and prior context to `/chat`.
3. The backend loads the ReAct agent and runs the model.
4. The model may answer directly or request a tool.
5. If a tool is called, the result is fed back into the model.
6. The final answer and trace are returned to the UI.

## Key Design Notes

- The project uses a structured `<think>`, `<tool_call>`, and `<answer>` protocol.
- Tool outputs are normalized into a consistent JSON shape before being returned to the model.
- The frontend shows the full reasoning trace, which is useful for debugging and evaluation.
- The code is oriented around one shared backend model instance to avoid reloading weights on each request.

## Known Gaps

- The repository documentation and the current RAG environment variable names are not fully aligned in every place.
- The report under `docs/report/` appears to be incomplete and partially unrelated to the current agent project.

## Glossary

- CoT: Chain of Thought, intermediate reasoning before the final answer.
- SFT: Supervised Fine-Tuning.
- GRPO: Group Relative Policy Optimization.
- RAG: Retrieval-Augmented Generation.
- ReAct: Reason + Act, a reasoning-action-observation agent loop.

---
---
---

# Prácticas MIA 2o Cuatrimestre

Este repositorio contiene el esqueleto para la práctica final del máster. El objetivo es construir, paso a paso, un agente de IA autónomo capaz de razonar, usar herramientas y consultar documentación externa, partiendo de un modelo de lenguaje base.

## Estructura de la Práctica

La práctica se divide en 4 fases acumulativas. Cada fase tiene su propio directorio con instrucciones específicas (README.md) y código base.

* **FASE 1 (`rlm`): De LM a RLM (Reasoning Language Model).**
  * Entrenamiento supervisado (SFT) para seguir instrucciones y formato de pensamiento.
  * Alineación con Aprendizaje por Refuerzo usando GRPO (Group Relative Policy Optimization).
* **FASE 2 (`tool_use`): Uso de Herramientas.**
  * Dotar al modelo de la capacidad de invocar funciones externas (calculadora, búsqueda).
* **FASE 3 (`rag`): RAG (Retrieval Augmented Generation).**
  * Conectar el modelo a una base de conocimiento documental privada.
* **FASE 4 (`react`): Agente ReAct.**
  * Integrar todo en un bucle autónomo de Razonamiento-Acción-Observación.

## Configuración RAG (Variables de Entorno)

La fase RAG ahora admite configuración por entorno para rutas y embeddings:

- `RAG_BASE_DIR`: carpeta base de datos RAG (por defecto: `rag_data`).
- `RAG_DOCS_DIR`: carpeta con documentos fuente (por defecto: `<RAG_BASE_DIR>/documents`).
- `RAG_VECTORSTORE_DIR`: carpeta del vectorstore Chroma (por defecto: `<RAG_BASE_DIR>/vectorstore`).
- `RAG_EMBEDDING_MODEL`: modelo de embeddings (por defecto: `all-MiniLM-L6-v2`).

Si no defines ninguna variable, se mantienen los valores por defecto.

## Evaluación

La evaluación se realizará exponiendo la funcionalidad de cada fase a través de una API REST.

1. Debes completar el código en cada carpeta de fase.
2. Debes conectar tus implementaciones en el archivo `api/app.py`.
3. Para la entrega, levantarás la API y usarás `ngrok` (en caso de levantar la API localmente) para dar acceso al profesor a los endpoints.

## Links importantes

APIs

- https://aws.amazon.com/what-is/api/#:~:text=API%20stands%20for%20Application%20Programming,other%20using%20requests%20and%20responses.
- https://fastapi.tiangolo.com/features/#editor-support
- https://github.com/public-apis/public-apis?tab=readme-ov-file
- 

ngrok despliegue

- https://ngrok.com/
- https://ngrok.com/docs/api
- https://ngrok.com/docs/universal-gateway/agent-endpoints
- 

Pydantic y Structured Outputs

- https://docs.pydantic.dev/latest/why/#type-hints
- https://medium.com/@speaktoharisudhan/structured-outputs-from-llm-using-pydantic-1a36e6c3aa07
- https://medium.com/@adkananthi/one-framework-two-worlds-achieving-structured-outputs-for-llms-and-vlms-with-transformer-outlines-ae2eec6eb3fc
- https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct/discussions/10
- https://docs.langchain.com/oss/python/langchain/structured-output
- 


## Glosario y Conceptos Clave

* **CoT (Chain of Thought):** Técnica de prompting o entrenamiento donde el modelo genera pasos intermedios de razonamiento antes de dar la respuesta final.
* **SFT (Supervised Fine-Tuning):** Ajuste fino clásico usando pares de (instrucción, respuesta deseada).
* **RLVF (Reinforcement Learning with Verification Feedback):** Una variante de RLHF donde la recompensa no la dan humanos, sino un sistema verificador determinista (ej. ejecutar código y ver si funciona, o comprobar si una solución matemática es correcta).
* **GRPO (Group Relative Policy Optimization):** Un algoritmo de RL eficiente. En lugar de usar un modelo "crítico" para estimar el valor de una acción (lo que consume mucha memoria), GRPO muestrea un grupo de respuestas (ej. 8) para la misma pregunta. Calcula la recompensa de cada una y normaliza las puntuaciones basándose en la media de ese grupo. Las respuestas mejores que la media del grupo se refuerzan positivo, las peores negativo.
* **ReAct (Reason + Act):** Un paradigma para agentes donde el modelo alterna entre generar pensamientos verbales y generar acciones (llamadas a herramientas).
