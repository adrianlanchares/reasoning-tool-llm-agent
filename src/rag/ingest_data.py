import html
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List

from bs4 import BeautifulSoup
from langchain_core.documents import Document
from langchain_community.document_loaders import TextLoader
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.rag.config import RAG_DATA_DIR, DB_DIR, EMBEDDING_MODEL


CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = "\n".join(line.strip() for line in text.splitlines())
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_full_summary(raw_summary: str) -> str:
    if not raw_summary:
        return ""

    unescaped = html.unescape(raw_summary)
    soup = BeautifulSoup(unescaped, "html.parser")

    parts: List[str] = []

    for tag in soup.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
        text = tag.get_text(" ", strip=True)
        if not text:
            continue

        if tag.name in {"h1", "h2", "h3", "h4"}:
            parts.append(text)
        elif tag.name == "li":
            parts.append(f"- {text}")
        else:
            parts.append(text)

    return clean_text("\n\n".join(parts))


def build_xml_header(topic: ET.Element) -> str:
    title = (topic.get("title") or "").strip()
    url = (topic.get("url") or "").strip()
    meta_desc = (topic.get("meta-desc") or "").strip()
    language = (topic.get("language") or "").strip()

    also_called = [
        (node.text or "").strip()
        for node in topic.findall("also-called")
        if (node.text or "").strip()
    ]

    groups = [
        clean_text(node.text or "")
        for node in topic.findall("group")
        if (node.text or "").strip()
    ]

    lines: List[str] = []

    if title:
        lines.append(title)
    if url:
        lines.append(f"URL: {url}")
    if language:
        lines.append(f"Language: {language}")
    if meta_desc:
        lines.append(f"Description: {meta_desc}")
    if also_called:
        lines.append(f"Also called: {', '.join(also_called)}")
    if groups:
        lines.append(f"Groups: {'; '.join(groups)}")

    return clean_text("\n".join(lines))


def build_xml_body(topic: ET.Element) -> str:
    full_summary_node = topic.find("full-summary")
    raw_summary = full_summary_node.text if full_summary_node is not None else ""
    return parse_full_summary(raw_summary or "")


def split_text_with_header(
    body: str,
    header: str,
    metadata: dict,
) -> List[Document]:
    if not body:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    body_chunks = splitter.split_text(body)
    total_chunks = len(body_chunks)

    documents: List[Document] = []
    for idx, chunk in enumerate(body_chunks):
        page_content = clean_text(f"{header}\n\n{chunk}")
        chunk_metadata = {
            **metadata,
            "chunk_index": idx,
            "chunk_count": total_chunks,
        }
        documents.append(
            Document(
                page_content=page_content,
                metadata=chunk_metadata,
            )
        )

    return documents


def ingest_txt(file_path: Path) -> List[Document]:
    loader = TextLoader(str(file_path), encoding="utf-8")
    raw_documents = loader.load()

    documents: List[Document] = []
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    for raw_doc in raw_documents:
        source_path = raw_doc.metadata.get("source", str(file_path))
        title = file_path.stem
        text = clean_text(raw_doc.page_content)

        if not text:
            continue

        chunks = splitter.split_text(text)
        total_chunks = len(chunks)

        for idx, chunk in enumerate(chunks):
            page_content = clean_text(f"{title}\n\n{chunk}")
            documents.append(
                Document(
                    page_content=page_content,
                    metadata={
                        "source": source_path,
                        "title": title,
                        "doc_type": "txt",
                        "chunk_index": idx,
                        "chunk_count": total_chunks,
                    },
                )
            )

    return documents


def ingest_xml(file_path: Path) -> List[Document]:
    try:
        tree = ET.parse(file_path)
    except ET.ParseError as e:
        raise ValueError(f"Failed to parse XML file {file_path}: {e}") from e

    root = tree.getroot()
    topics = root.findall(".//health-topic")

    documents: List[Document] = []

    for topic in topics:
        topic_id = (topic.get("id") or "").strip()
        title = (topic.get("title") or "").strip() or file_path.stem
        url = (topic.get("url") or "").strip()

        header = build_xml_header(topic)
        body = build_xml_body(topic)

        if not body:
            continue

        topic_documents = split_text_with_header(
            body=body,
            header=header,
            metadata={
                "source": str(file_path),
                "title": title,
                "url": url,
                "topic_id": topic_id,
                "doc_type": "xml",
            },
        )
        documents.extend(topic_documents)

    return documents


def ingest_documents() -> None:
    rag_data_dir = Path(RAG_DATA_DIR)
    db_dir = Path(DB_DIR)

    if not rag_data_dir.exists() or not rag_data_dir.is_dir():
        raise FileNotFoundError(
            f"RAG documents directory does not exist: {rag_data_dir}. "
            "Set RAG_DATA_DIR or create the directory."
        )

    db_dir.mkdir(parents=True, exist_ok=True)

    all_files = [p for p in rag_data_dir.rglob("*") if p.is_file()]
    if not all_files:
        raise ValueError(
            f"No files found under {rag_data_dir}. Add documents before ingesting."
        )

    documents: List[Document] = []
    unsupported_files: List[Path] = []

    for file_path in all_files:
        suffix = file_path.suffix.lower()

        if suffix == ".txt":
            file_documents = ingest_txt(file_path)
            documents.extend(file_documents)
            print(f"[TXT] {file_path.name}: {len(file_documents)} chunks")

        elif suffix == ".xml":
            file_documents = ingest_xml(file_path)
            documents.extend(file_documents)
            print(f"[XML] {file_path.name}: {len(file_documents)} chunks")

        else:
            unsupported_files.append(file_path)

    if unsupported_files:
        print("Skipped unsupported files:")
        for file_path in unsupported_files:
            print(f"  - {file_path}")

    if not documents:
        raise ValueError(
            f"No ingestible documents were produced from files under {rag_data_dir}."
        )

    # print(f"Total chunks generated: {len(documents)}")

    # # Debug preview
    # for i, doc in enumerate(documents[:3]):
    #     print(f"\n{'=' * 80}")
    #     print(f"CHUNK {i}")
    #     print(f"METADATA: {doc.metadata}")
    #     print(doc.page_content[:2000])

    embeddings = SentenceTransformerEmbeddings(model_name=EMBEDDING_MODEL)

    vectordb = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=str(db_dir),
    )
    vectordb.persist()

    print(f"Vector database created in {db_dir}")


if __name__ == "__main__":
    ingest_documents()