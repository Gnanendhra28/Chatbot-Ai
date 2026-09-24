"""Add document_type, department, access_level, and version to document_chunks

Revision ID: 003_chunk_metadata_cols
Revises: 002_metadata_cols
Create Date: 2026-09-24 16:08:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_chunk_metadata_cols'
down_revision = '002_metadata_cols'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('document_chunks', sa.Column('document_type', sa.String(length=100), nullable=True, server_default='pdf'))
    op.add_column('document_chunks', sa.Column('department', sa.String(length=100), nullable=True, server_default='General'))
    op.add_column('document_chunks', sa.Column('access_level', sa.String(length=50), nullable=True, server_default='internal'))
    op.add_column('document_chunks', sa.Column('version', sa.Integer(), nullable=True, server_default='1'))
    op.create_index(op.f('ix_document_chunks_document_type'), 'document_chunks', ['document_type'], unique=False)
    op.create_index(op.f('ix_document_chunks_department'), 'document_chunks', ['department'], unique=False)
    op.create_index(op.f('ix_document_chunks_access_level'), 'document_chunks', ['access_level'], unique=False)
    op.create_index(op.f('ix_document_chunks_version'), 'document_chunks', ['version'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_document_chunks_version'), table_name='document_chunks')
    op.drop_index(op.f('ix_document_chunks_access_level'), table_name='document_chunks')
    op.drop_index(op.f('ix_document_chunks_department'), table_name='document_chunks')
    op.drop_index(op.f('ix_document_chunks_document_type'), table_name='document_chunks')
    op.drop_column('document_chunks', 'version')
    op.drop_column('document_chunks', 'access_level')
    op.drop_column('document_chunks', 'department')
    op.drop_column('document_chunks', 'document_type')
