from app.domain.schemas import ChunkCitation


def test_chunk_citation_preservation():
    citation = ChunkCitation(
        citation_index=1,
        document_id="doc_abc123",
        chunk_id="chunk_xyz789",
        filename="Employee Handbook.pdf",
        page_number=14,
        section="Leave Policy",
        text_snippet="Employees are granted 12 days of casual leave...",
        score=0.942
    )

    assert citation.citation_index == 1
    assert citation.document_id == "doc_abc123"
    assert citation.chunk_id == "chunk_xyz789"
    assert citation.filename == "Employee Handbook.pdf"
    assert citation.page_number == 14
    assert citation.section == "Leave Policy"
    assert citation.score == 0.942
