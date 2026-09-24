import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.ingestion.parser import DocumentPage


class Chunk(BaseModel):
    """
    Normalized chunk structure with metadata required for RAG citations.
    """
    content: str
    page_number: int
    section: Optional[str] = None
    chunk_index: int


class DocumentChunker:
    """
    Modular Document Chunker.
    Splits document pages into chunks using configurable token/character window strategies.
    Designed for future evaluation across different chunking strategies.
    """

    def __init__(self, chunk_size: int = 500, overlap: int = 50):
        # Approximate 1 token = ~4 characters in English
        self.chunk_size_chars = chunk_size * 4
        self.overlap_chars = overlap * 4

    def chunk_pages(
        self,
        pages: List[DocumentPage],
        strategy: str = "recursive"
    ) -> List[Chunk]:
        """
        Processes a list of DocumentPages into a list of normalized Chunks.
        """
        chunks: List[Chunk] = []
        global_index = 0

        for page in pages:
            text = page.text.strip()
            if not text:
                continue

            # Section header detection heuristic (e.g. line ending with colon or uppercase title)
            section = self._extract_section_header(text, page.page_number)

            if len(text) <= self.chunk_size_chars:
                chunks.append(
                    Chunk(
                        content=text,
                        page_number=page.page_number,
                        section=section,
                        chunk_index=global_index
                    )
                )
                global_index += 1
                continue

            # Recursive / Window Splitting
            start = 0
            while start < len(text):
                end = min(start + self.chunk_size_chars, len(text))

                # Snap to sentence / period boundary if possible
                if end < len(text):
                    last_period = text.rfind(". ", start, end)
                    if last_period > start + (self.chunk_size_chars // 2):
                        end = last_period + 1

                chunk_text = text[start:end].strip()
                if chunk_text:
                    chunks.append(
                        Chunk(
                            content=chunk_text,
                            page_number=page.page_number,
                            section=section,
                            chunk_index=global_index
                        )
                    )
                    global_index += 1

                start += self.chunk_size_chars - self.overlap_chars

        return chunks

    def _extract_section_header(self, page_text: str, page_num: int) -> str:
        lines = page_text.split("\n")
        first_line = lines[0].strip() if lines else ""
        if len(first_line) > 0 and len(first_line) < 60:
            return first_line
        return f"Page {page_num}"


# Backwards compatibility helper function
def recursive_chunk_text(
    pages_data: List[Dict[str, Any]],
    chunk_size: int = 500,
    chunk_overlap: int = 50
) -> List[Dict[str, Any]]:
    pages = [DocumentPage(page_number=p["page_number"], text=p["text"]) for p in pages_data]
    chunker = DocumentChunker(chunk_size=chunk_size, overlap=chunk_overlap)
    chunks = chunker.chunk_pages(pages)
    return [
        {
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
            "text": c.content,
            "section": c.section,
            "token_count": len(c.content.split())
        }
        for c in chunks
    ]
