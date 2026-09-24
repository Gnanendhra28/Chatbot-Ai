"""Add retrieval_logs table for observability and audit tracking

Revision ID: 004_retrieval_logs
Revises: 003_chunk_metadata_cols
Create Date: 2026-09-24 16:55:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_retrieval_logs'
down_revision = '003_chunk_metadata_cols'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'retrieval_logs' not in tables:
        op.create_table(
            'retrieval_logs',
            sa.Column('id', sa.String(length=64), nullable=False),
            sa.Column('request_id', sa.String(length=64), nullable=False),
            sa.Column('user_id', sa.String(length=64), nullable=False),
            sa.Column('tenant_id', sa.String(length=64), nullable=False),
            sa.Column('query', sa.Text(), nullable=False),
            sa.Column('retrieved_chunks', sa.JSON(), nullable=True),
            sa.Column('scores', sa.JSON(), nullable=True),
            sa.Column('reranker_scores', sa.JSON(), nullable=True),
            sa.Column('model', sa.String(length=100), nullable=True),
            sa.Column('token_usage', sa.JSON(), nullable=True),
            sa.Column('latency', sa.JSON(), nullable=True),
            sa.Column('answer', sa.Text(), nullable=False),
            sa.Column('citations', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_retrieval_logs_request_id'), 'retrieval_logs', ['request_id'], unique=False)
        op.create_index(op.f('ix_retrieval_logs_user_id'), 'retrieval_logs', ['user_id'], unique=False)
        op.create_index(op.f('ix_retrieval_logs_tenant_id'), 'retrieval_logs', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_retrieval_logs_tenant_id'), table_name='retrieval_logs')
    op.drop_index(op.f('ix_retrieval_logs_user_id'), table_name='retrieval_logs')
    op.drop_index(op.f('ix_retrieval_logs_request_id'), table_name='retrieval_logs')
    op.drop_table('retrieval_logs')
