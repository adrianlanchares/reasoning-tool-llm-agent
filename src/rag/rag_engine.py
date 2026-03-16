from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings

DB_DIR = "rag/vectorstore"
embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
# Cargar la BD existente
vectordb = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)

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
    return docs
