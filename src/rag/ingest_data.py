import os
from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.rag.config import RAG_DATA_DIR, DB_DIR, EMBEDDING_MODEL


def ingest_test_documents():
    rag_data_dir = Path(RAG_DATA_DIR)
    db_dir = Path(DB_DIR)

    if not rag_data_dir.exists() or not rag_data_dir.is_dir():
        raise FileNotFoundError(
            f"RAG documents directory does not exist: {rag_data_dir}. "
            "Set RAG_DOCS_DIR or create the directory."
        )

    db_dir.mkdir(parents=True, exist_ok=True)

    # 1. Cargar documentos
    loader = DirectoryLoader(str(rag_data_dir), glob="**/*", loader_cls=TextLoader)
    documents = loader.load()
    if not documents:
        raise ValueError(
            f"No documents found under {rag_data_dir}. Add files before ingesting."
        )
    print(f"Cargados {len(documents)} documentos.")

    for idx, doc in enumerate(documents):
        source_path = doc.metadata.get("source", "")
        title = (
            os.path.splitext(os.path.basename(source_path))[0]
            if source_path
            else "Untitled"
        )
        doc.metadata["title"] = title

    # 2. Splitter (Chunking)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=500)
    texts = text_splitter.split_documents(documents)
    print(f"Generados {len(texts)} chunks.")

    # 3. Embeddings y VectorStore
    # Usamos un modelo ligero para CPU
    embeddings = SentenceTransformerEmbeddings(model_name=EMBEDDING_MODEL)

    # Crear y persistir la base de datos Chroma
    vectordb = Chroma.from_documents(
        documents=texts,
        embedding=embeddings,
        persist_directory=str(db_dir),
    )
    vectordb.persist()
    print(f"Base de datos vectorial creada en {db_dir}")


if __name__ == "__main__":
    ingest_test_documents()
