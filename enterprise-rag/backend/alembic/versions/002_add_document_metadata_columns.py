"""Add document_type, department, and access_level to documents

Revision ID: 002_metadata_cols
Revises: 001_initial_schema
Create Date: 2026-09-24 15:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_metadata_cols'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('documents', sa.Column('document_type', sa.String(length=100), nullable=True, server_default='pdf'))
    op.add_column('documents', sa.Column('department', sa.String(length=100), nullable=True, server_default='General'))
    op.add_column('documents', sa.Column('access_level', sa.String(length=50), nullable=True, server_default='internal'))
    op.create_index(op.f('ix_documents_document_type'), 'documents', ['document_type'], unique=False)
    op.create_index(op.f('ix_documents_department'), 'documents', ['department'], unique=False)
    op.create_index(op.f('ix_documents_access_level'), 'documents', ['access_level'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_documents_access_level'), table_name='documents')
    op.drop_index(op.f('ix_documents_department'), table_name='documents')
    op.drop_index(op.f('ix_documents_document_type'), table_name='documents')
    op.drop_column('documents', 'access_level')
    op.drop_column('documents', 'department')
    op.drop_column('documents', 'document_type')
