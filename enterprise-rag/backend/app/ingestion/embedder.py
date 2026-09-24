import logging
from typing import List
from app.core.config import settings
from app.ingestion.chunker import Chunk

logger = logging.getLogger("enterprise_rag.embedder")

_model_instance = None


def _get_model():
    global _model_instance
    if _model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model: {settings.EMBEDDING_MODEL_NAME}")
            _model_instance = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        except Exception as e:
            logger.warning(f"Failed to load SentenceTransformer ({e}). Using deterministic fallback vector generator.")
            _model_instance = "fallback"
    return _model_instance


class EmbeddingService:
    """
    Vector Embedding Service using all-MiniLM-L6-v2 (384 dimensions).
    Encodes document chunks and text queries into normalized dense vectors for pgvector storage.
    """

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self.dimension = settings.VECTOR_DIMENSION

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generates 384-dimensional normalized embeddings for a list of texts.
        """
        model = _get_model()
        if model != "fallback":
            embeddings = model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()

        # Fallback deterministic vector generator
        vectors = []
        for text in texts:
            vec = [0.0] * self.dimension
            cleaned = text.lower().strip()
            if not cleaned:
                vectors.append(vec)
                continue
            words = cleaned.split()
            for i, word in enumerate(words):
                h = hash(word)
                idx1 = abs(h) % self.dimension
                idx2 = abs(h * 31 + 7) % self.dimension
                vec[idx1] += 1.0 / (i + 1)
                vec[idx2] += 0.5 / (i + 1)
            norm = sum(x * x for x in vec) ** 0.5
            if norm > 0:
                vec = [x / norm for x in vec]
            vectors.append(vec)
        return vectors

    def embed_chunks(self, chunks: List[Chunk]) -> List[List[float]]:
        """
        Generates vector embeddings for a list of normalized Chunk objects.
        """
        texts = [c.content for c in chunks]
        return self.embed_texts(texts)

    def embed_query(self, query: str) -> List[float]:
        """
        Generates vector embedding for a query string.
        """
        res = self.embed_texts([query])
        return res[0] if res else [0.0] * self.dimension


# Backwards compatible standalone helper
def generate_embeddings(texts: List[str]) -> List[List[float]]:
    service = EmbeddingService()
    return service.embed_texts(texts)
