import pytest
from app.domain.schemas import MetadataFilter


def build_sql_where_clause_filters(filters: MetadataFilter, tenant_id_override: str = "tenant-acme"):
    """
    Simulates the exact SQL WHERE filtering logic executed inside VectorRetriever & BM25Retriever.
    """
    where_clauses = {}
    
    # 1. tenant_id filter
    effective_tenant = filters.tenant_id or tenant_id_override
    where_clauses["tenant_id"] = f"DocumentChunk.tenant_id == '{effective_tenant}'"

    # 2. document_id filter
    if filters.document_id:
        where_clauses["document_id"] = f"DocumentChunk.document_id == '{filters.document_id}'"

    # 3. document_type filter
    if filters.document_type:
        where_clauses["document_type"] = f"DocumentChunk.document_type == '{filters.document_type}'"

    # 4. department filter
    if filters.department:
        where_clauses["department"] = f"DocumentChunk.department == '{filters.department}'"

    # 5. access_level filter
    if filters.access_level:
        where_clauses["access_level"] = f"DocumentChunk.access_level == '{filters.access_level}'"

    # 6. version filter
    if filters.version is not None:
        where_clauses["version"] = f"DocumentChunk.version == {filters.version}"

    return where_clauses


# --- INDEPENDENT METADATA FILTER TESTS ---

def test_independent_filter_tenant_id():
    f = MetadataFilter(tenant_id="tenant-globex-99")
    clauses = build_sql_where_clause_filters(f)
    
    assert "tenant_id" in clauses
    assert clauses["tenant_id"] == "DocumentChunk.tenant_id == 'tenant-globex-99'"
    assert "document_id" not in clauses
    assert "document_type" not in clauses
    assert "department" not in clauses
    assert "access_level" not in clauses
    assert "version" not in clauses


def test_independent_filter_document_id():
    f = MetadataFilter(document_id="doc-uuid-888444")
    clauses = build_sql_where_clause_filters(f)

    assert "document_id" in clauses
    assert clauses["document_id"] == "DocumentChunk.document_id == 'doc-uuid-888444'"
    assert "document_type" not in clauses
    assert "department" not in clauses
    assert "access_level" not in clauses
    assert "version" not in clauses


def test_independent_filter_document_type():
    f = MetadataFilter(document_type="financial_report")
    clauses = build_sql_where_clause_filters(f)

    assert "document_type" in clauses
    assert clauses["document_type"] == "DocumentChunk.document_type == 'financial_report'"
    assert "document_id" not in clauses
    assert "department" not in clauses
    assert "access_level" not in clauses
    assert "version" not in clauses


def test_independent_filter_department():
    f = MetadataFilter(department="Engineering")
    clauses = build_sql_where_clause_filters(f)

    assert "department" in clauses
    assert clauses["department"] == "DocumentChunk.department == 'Engineering'"
    assert "document_id" not in clauses
    assert "document_type" not in clauses
    assert "access_level" not in clauses
    assert "version" not in clauses


def test_independent_filter_access_level():
    f = MetadataFilter(access_level="confidential")
    clauses = build_sql_where_clause_filters(f)

    assert "access_level" in clauses
    assert clauses["access_level"] == "DocumentChunk.access_level == 'confidential'"
    assert "document_id" not in clauses
    assert "document_type" not in clauses
    assert "department" not in clauses
    assert "version" not in clauses


def test_independent_filter_version():
    f = MetadataFilter(version=3)
    clauses = build_sql_where_clause_filters(f)

    assert "version" in clauses
    assert clauses["version"] == "DocumentChunk.version == 3"
    assert "document_id" not in clauses
    assert "document_type" not in clauses
    assert "department" not in clauses
    assert "access_level" not in clauses


def test_combined_multi_metadata_filter():
    f = MetadataFilter(
        tenant_id="tenant-corp",
        document_id="doc-100",
        document_type="policy",
        department="HR",
        access_level="internal",
        version=2
    )
    clauses = build_sql_where_clause_filters(f)

    assert len(clauses) == 6
    assert clauses["tenant_id"] == "DocumentChunk.tenant_id == 'tenant-corp'"
    assert clauses["document_id"] == "DocumentChunk.document_id == 'doc-100'"
    assert clauses["document_type"] == "DocumentChunk.document_type == 'policy'"
    assert clauses["department"] == "DocumentChunk.department == 'HR'"
    assert clauses["access_level"] == "DocumentChunk.access_level == 'internal'"
    assert clauses["version"] == "DocumentChunk.version == 2"
