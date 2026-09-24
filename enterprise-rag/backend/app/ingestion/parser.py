import io
import logging
from typing import List, Union
from pydantic import BaseModel

logger = logging.getLogger("enterprise_rag.parser")


class DocumentPage(BaseModel):
    """
    Normalized page representation for citation accuracy.
    """
    page_number: int
    text: str


class DocumentParser:
    """
    PDF Document Parser using PyMuPDF (fitz) with fallback options.
    Extracts text per page into normalized DocumentPage instances.
    """

    @staticmethod
    def parse_pdf(pdf_source: Union[bytes, str]) -> List[DocumentPage]:
        """
        Parses PDF bytes or file path into a list of DocumentPage objects.
        """
        try:
            import fitz  # PyMuPDF
            
            if isinstance(pdf_source, bytes):
                doc = fitz.open(stream=pdf_source, filetype="pdf")
            else:
                doc = fitz.open(pdf_source)

            pages: List[DocumentPage] = []
            for index, page in enumerate(doc):
                page_text = page.get_text("text") or ""
                cleaned_text = page_text.strip()
                pages.append(
                    DocumentPage(
                        page_number=index + 1,
                        text=cleaned_text
                    )
                )
            doc.close()
            return pages

        except Exception as e:
            logger.warning(f"PyMuPDF parsing failed ({e}). Falling back to pypdf parser.")
            return DocumentParser._fallback_pypdf_parse(pdf_source)

    @staticmethod
    def _fallback_pypdf_parse(pdf_source: Union[bytes, str]) -> List[DocumentPage]:
        from pypdf import PdfReader

        if isinstance(pdf_source, bytes):
            reader = PdfReader(io.BytesIO(pdf_source))
        else:
            reader = PdfReader(pdf_source)

        pages: List[DocumentPage] = []
        for index, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            pages.append(
                DocumentPage(
                    page_number=index + 1,
                    text=page_text.strip()
                )
            )
        return pages
