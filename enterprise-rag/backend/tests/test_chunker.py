from app.ingestion.parser import DocumentPage
from app.ingestion.chunker import DocumentChunker, Chunk


def test_chunk_model_instantiation():
    c = Chunk(
        content="Refund Policy details here...",
        page_number=12,
        section="Refund Policy",
        chunk_index=17
    )
    assert c.content == "Refund Policy details here..."
    assert c.page_number == 12
    assert c.section == "Refund Policy"
    assert c.chunk_index == 17


def test_document_chunker_splitting():
    pages = [
        DocumentPage(page_number=1, text="Refund Policy\nAll sales are eligible for return within 30 days of purchase."),
        DocumentPage(page_number=2, text="Privacy Policy\nWe protect user data using standard enterprise encryption.")
    ]

    chunker = DocumentChunker(chunk_size=100, overlap=10)
    chunks = chunker.chunk_pages(pages)

    assert len(chunks) == 2
    assert chunks[0].page_number == 1
    assert chunks[0].section == "Refund Policy"
    assert chunks[1].page_number == 2
    assert chunks[1].section == "Privacy Policy"
    assert chunks[1].chunk_index == 1
