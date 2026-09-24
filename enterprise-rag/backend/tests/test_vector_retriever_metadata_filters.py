import pytest
from app.domain.schemas import MetadataFilter
from app.retrieval.vector_retriever import VectorRetriever


def test_independent_filter_1_tenant_id():
    f = MetadataFilter(tenant_id="tenant-alpha-123")
    assert f.tenant_id == "tenant-alpha-123"
    assert f.document_id is None
    assert f.document_type is None
    assert f.department is None
    assert f.access_level is None
    assert f.version is None


def test_independent_filter_2_document_id():
    f = MetadataFilter(document_id="doc-999-uuid")
    assert f.tenant_id is None
    assert f.document_id == "doc-999-uuid"
    assert f.document_type is None
    assert f.department is None
    assert f.access_level is None
    assert f.version is None


def test_independent_filter_3_document_type():
    f = MetadataFilter(document_type="financial_pdf")
    assert f.tenant_id is None
    assert f.document_id is None
    assert f.document_type == "financial_pdf"
    assert f.department is None
    assert f.access_level is None
    assert f.version is None


def test_independent_filter_4_department():
    f = MetadataFilter(department="HR_Operations")
    assert f.tenant_id is None
    assert f.document_id is None
    assert f.document_type is None
    assert f.department == "HR_Operations"
    assert f.access_level is None
    assert f.version is None


def test_independent_filter_5_access_level():
    f = MetadataFilter(access_level="confidential")
    assert f.tenant_id is None
    assert f.document_id is None
    assert f.document_type is None
    assert f.department is None
    assert f.access_level == "confidential"
    assert f.version is None


def test_independent_filter_6_version():
    f = MetadataFilter(version=4)
    assert f.tenant_id is None
    assert f.document_id is None
    assert f.document_type is None
    assert f.department is None
    assert f.access_level is None
    assert f.version == 4
