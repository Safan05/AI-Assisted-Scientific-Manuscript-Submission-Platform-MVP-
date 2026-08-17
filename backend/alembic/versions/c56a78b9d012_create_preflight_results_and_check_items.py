"""create preflight results and check items

Revision ID: c56a78b9d012
Revises: ae12d0a4069f
Create Date: 2026-08-17 05:36:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c56a78b9d012'
down_revision: Union[str, None] = 'ae12d0a4069f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'preflight_results',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('manuscript_id', sa.Uuid(), nullable=False),
        sa.Column('template_id', sa.Uuid(), nullable=False),
        sa.Column('overall_status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='PASS'),
        sa.Column('human_confirmed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('summary_counts', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['manuscript_id'], ['manuscripts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['journal_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_preflight_results_manuscript_id'), 'preflight_results', ['manuscript_id'], unique=False)
    op.create_index(op.f('ix_preflight_results_template_id'), 'preflight_results', ['template_id'], unique=False)

    op.create_table(
        'preflight_check_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('result_id', sa.Uuid(), nullable=False),
        sa.Column('rule_id', sa.Uuid(), nullable=True),
        sa.Column('rule_key', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('rule_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('message', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('actual_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('expected_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('human_overridden', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('override_reason', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['result_id'], ['preflight_results.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rule_id'], ['template_rules.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_preflight_check_items_result_id'), 'preflight_check_items', ['result_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_preflight_check_items_result_id'), table_name='preflight_check_items')
    op.drop_table('preflight_check_items')
    op.drop_index(op.f('ix_preflight_results_template_id'), table_name='preflight_results')
    op.drop_index(op.f('ix_preflight_results_manuscript_id'), table_name='preflight_results')
    op.drop_table('preflight_results')
