"""add_coordinators_and_gender_verification

Revision ID: df554ec2b6e5
Revises: 7226f92fb065
Create Date: 2026-10-03 13:26:12.831014

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df554ec2b6e5'
down_revision: Union[str, Sequence[str], None] = '7226f92fb065'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add gender and coordinator_position to users
    op.add_column('users', sa.Column('gender', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('coordinator_position', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_users_coordinator_position'), 'users', ['coordinator_position'], unique=False)

    # 2. Add gender and assigned_coordinator_id to student_verifications
    op.add_column('student_verifications', sa.Column('gender', sa.String(length=20), nullable=True))
    op.add_column('student_verifications', sa.Column('assigned_coordinator_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_student_verifications_assigned_coordinator_id'), 'student_verifications', ['assigned_coordinator_id'], unique=False)
    op.create_foreign_key(
        'fk_student_verifications_assigned_coordinator_id_users',
        'student_verifications', 'users',
        ['assigned_coordinator_id'], ['id'],
        ondelete='SET NULL'
    )

    # 3. Add audit fields to verification_audit_logs
    op.add_column('verification_audit_logs', sa.Column('student_gender', sa.String(length=20), nullable=True))
    op.add_column('verification_audit_logs', sa.Column('assigned_coordinator_id', sa.Integer(), nullable=True))
    op.add_column('verification_audit_logs', sa.Column('actor_id', sa.Integer(), nullable=True))
    op.add_column('verification_audit_logs', sa.Column('actor_role', sa.String(length=50), nullable=True))
    op.add_column('verification_audit_logs', sa.Column('action', sa.String(length=50), nullable=False, server_default='status_change'))
    op.create_foreign_key(
        'fk_val_assigned_coordinator_id_users',
        'verification_audit_logs', 'users',
        ['assigned_coordinator_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_val_actor_id_users',
        'verification_audit_logs', 'users',
        ['actor_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_val_actor_id_users', 'verification_audit_logs', type_='foreignkey')
    op.drop_constraint('fk_val_assigned_coordinator_id_users', 'verification_audit_logs', type_='foreignkey')
    op.drop_column('verification_audit_logs', 'action')
    op.drop_column('verification_audit_logs', 'actor_role')
    op.drop_column('verification_audit_logs', 'actor_id')
    op.drop_column('verification_audit_logs', 'assigned_coordinator_id')
    op.drop_column('verification_audit_logs', 'student_gender')

    op.drop_constraint('fk_student_verifications_assigned_coordinator_id_users', 'student_verifications', type_='foreignkey')
    op.drop_index(op.f('ix_student_verifications_assigned_coordinator_id'), table_name='student_verifications')
    op.drop_column('student_verifications', 'assigned_coordinator_id')
    op.drop_column('student_verifications', 'gender')

    op.drop_index(op.f('ix_users_coordinator_position'), table_name='users')
    op.drop_column('users', 'coordinator_position')
    op.drop_column('users', 'gender')
