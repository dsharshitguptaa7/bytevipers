"""add_uq_assignment_student_problem

Revision ID: e1f83c79a124
Revises: df554ec2b6e5
Create Date: 2026-10-03 19:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f83c79a124'
down_revision: Union[str, Sequence[str], None] = 'df554ec2b6e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_assignment_student_problem',
        'assignment_submissions',
        ['assignment_id', 'student_id', 'problem_id']
    )


def downgrade() -> None:
    op.drop_constraint('uq_assignment_student_problem', 'assignment_submissions', type_='unique')
