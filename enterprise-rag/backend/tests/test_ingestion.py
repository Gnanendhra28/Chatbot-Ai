from app.ingestion.chunker import recursive_chunk_text
from app.ingestion.embedder import generate_embeddings


def test_recursive_chunking():
    sample_pages = [
        {"page_number": 1, "text": "This is a long paragraph about enterprise RAG systems. It describes chunking and vector embeddings."},
        {"page_number": 2, "text": "Second page content detailing pgvector and PostgreSQL storage."}
    ]

    chunks = recursive_chunk_text(sample_pages, chunk_size=50, chunk_overlap=10)
    assert len(chunks) >= 2
    assert chunks[0]["page_number"] == 1
    assert "enterprise RAG" in chunks[0]["text"]


def test_embedding_generation():
    texts = ["Enterprise RAG with pgvector", "Next.js 15 frontend"]
    embeddings = generate_embeddings(texts)
    
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 384
    assert len(embeddings[1]) == 384
