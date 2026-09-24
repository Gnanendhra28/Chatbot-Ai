from app.ingestion.embedder import EmbeddingService
from app.ingestion.chunker import Chunk


def test_embedding_service_dimensions():
    service = EmbeddingService()
    query_vec = service.embed_query("pgvector similarity search test")
    assert len(query_vec) == 384


def test_chunk_embedding_generation():
    service = EmbeddingService()
    chunks = [
        Chunk(content="FastAPI backend with PostgreSQL pgvector", page_number=1, section="Tech Stack", chunk_index=0),
        Chunk(content="Next.js 15 frontend with Tailwind CSS", page_number=1, section="Tech Stack", chunk_index=1)
    ]
    vectors = service.embed_chunks(chunks)
    assert len(vectors) == 2
    assert len(vectors[0]) == 384
    assert len(vectors[1]) == 384
