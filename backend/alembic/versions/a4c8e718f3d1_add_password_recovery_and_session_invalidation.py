"""add_password_recovery_and_session_invalidation

Revision ID: a4c8e718f3d1
Revises: e1f83c79a124
Create Date: 2026-10-03 20:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4c8e718f3d1'
down_revision: Union[str, Sequence[str], None] = 'e1f83c79a124'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('users', sa.Column('temp_password_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('token_version', sa.Integer(), server_default=sa.text('1'), nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'token_version')
    op.drop_column('users', 'temp_password_expires_at')
    op.drop_column('users', 'must_change_password')
