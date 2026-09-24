import io
from typing import List, Dict, Any
from pypdf import PdfReader


def extract_text_from_pdf(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text per page from raw PDF bytes.
    Returns list of dicts: [{'page_number': 1, 'text': '...'}]
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages_data = []

    for index, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        cleaned = page_text.strip()
        if cleaned:
            pages_data.append({
                "page_number": index + 1,
                "text": cleaned
            })

    return pages_data
