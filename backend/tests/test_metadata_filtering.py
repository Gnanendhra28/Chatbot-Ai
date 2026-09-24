from app.domain.schemas import MetadataFilter


def test_metadata_filter_instantiation():
    filter_obj = MetadataFilter(
        tenant_id="company_A",
        document_id="doc_123",
        document_type="policy",
        department="HR",
        access_level="internal",
        version=1
    )

    assert filter_obj.tenant_id == "company_A"
    assert filter_obj.document_id == "doc_123"
    assert filter_obj.document_type == "policy"
    assert filter_obj.department == "HR"
    assert filter_obj.access_level == "internal"
    assert filter_obj.version == 1
