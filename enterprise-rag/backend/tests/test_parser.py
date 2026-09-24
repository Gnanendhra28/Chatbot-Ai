from app.ingestion.parser import DocumentParser, DocumentPage


def test_document_page_structure():
    page = DocumentPage(page_number=1, text="Sample extracted PDF text")
    assert page.page_number == 1
    assert page.text == "Sample extracted PDF text"


def test_fallback_pypdf_parse():
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Fallback PDF Test Content")
    pdf_bytes = doc.write()
    doc.close()

    pages = DocumentParser._fallback_pypdf_parse(pdf_bytes)
    assert isinstance(pages, list)
    assert len(pages) == 1
    assert "Fallback PDF Test Content" in pages[0].text
