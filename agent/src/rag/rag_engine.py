from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma

from agent.src.rag.config import DB_DIR, EMBEDDING_MODEL

embeddings = SentenceTransformerEmbeddings(model_name=EMBEDDING_MODEL)
# Cargar la BD existente
vectordb = Chroma(persist_directory=str(DB_DIR), embedding_function=embeddings)


def retrieve_context(query, k=3, metadata_filter=None):
    """
    Recupera los k documentos más relevantes para la query.
    Si se proporciona un filtro de metadata (dict), los resultados también se filtran por ese criterio.
    Retorna una lista de strings (el contenido de los documentos).
    """
    if metadata_filter:
        # El parametro de filter es un diccionario con formato tipo MONGO QUERY LANGUAGE
        docs = vectordb.similarity_search(query, k=k, filter=metadata_filter)
    else:
        docs = vectordb.similarity_search(query, k=k)

    return [doc.page_content for doc in docs]
