import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Table, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class VerificationStatus(str, enum.Enum):
    NOT_SUBMITTED = "not_submitted"
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    RESUBMISSION_REQUIRED = "resubmission_required"
    SUSPENDED = "suspended"

class ProblemDifficulty(str, enum.Enum):
    Easy = "Easy"
    Medium = "Medium"
    Hard = "Hard"

class SubmissionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    EVALUATED = "EVALUATED"
    PUBLISHED = "PUBLISHED"
    # Legacy / auto-judge statuses
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class TestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"

class QuestionType(str, enum.Enum):
    MCQ = "mcq"
    SHORT_ANSWER = "short_answer"
    LONG_ANSWER = "long_answer"
    PROGRAMMING = "programming"

class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    EVALUATED = "EVALUATED"
    PUBLISHED = "PUBLISHED"
    EXPIRED = "EXPIRED"

class Verdict(str, enum.Enum):
    Accepted = "Accepted"
    WrongAnswer = "Wrong Answer"
    TimeLimitExceeded = "Time Limit Exceeded"
    RuntimeError = "Runtime Error"
    CompilationError = "Compilation/Execution Error"
    InternalError = "Internal Judge Error"

# Association table for problem tags
problem_tags = Table(
    "problem_tags",
    Base.metadata,
    Column("problem_id", Integer, ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

# Association table for user permissions
user_permissions = Table(
    "user_permissions",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="student", nullable=False)  # visitor, student, teacher, coordinator
    gender = Column(String(20), nullable=True)  # Male, Female
    coordinator_position = Column(String(50), nullable=True)  # male_1, male_2, female_1, female_2
    is_active = Column(Boolean, default=True, nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    suspension_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    permissions = relationship("Permission", secondary=user_permissions, back_populates="users", lazy="selectin")
    verification = relationship("StudentVerification", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="StudentVerification.user_id")
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan", foreign_keys="Submission.user_id")
    progress = relationship("ProblemProgress", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    class_memberships = relationship("ClassMember", back_populates="user", cascade="all, delete-orphan")
    test_attempts = relationship("TestAttempt", back_populates="student", cascade="all, delete-orphan", foreign_keys="TestAttempt.student_id")
    created_tests = relationship("OnlineTest", back_populates="creator", cascade="all, delete-orphan", foreign_keys="OnlineTest.creator_id")
 
    @property
    def verification_status(self) -> str:
        if self.role in ("teacher", "coordinator"):
            return "approved"
        if not self.verification:
            return "not_submitted"
        raw_status = (self.verification.status or "not_submitted").lower()
        if raw_status in ("not_submitted", "none"):
            return "not_submitted"
        if raw_status in ("pending", "under_review"):
            return "pending"
        if raw_status == "approved":
            return "approved"
        if raw_status in ("rejected", "resubmission_required"):
            return "rejected"
        return raw_status


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=False)

    users = relationship("User", secondary=user_permissions, back_populates="permissions")

class StudentVerification(Base):
    __tablename__ = "student_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    gender = Column(String(20), nullable=True)  # Male, Female
    institution_name = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    course = Column(String(255), nullable=False)
    semester = Column(String(50), nullable=False)
    roll_number = Column(String(100), nullable=False)
    institutional_email = Column(String(255), nullable=True)
    verification_method = Column(String(100), default="student_id", nullable=False)
    document_reference = Column(String(500), nullable=True)
    status = Column(String(50), default=VerificationStatus.PENDING.value, nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_coordinator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="verification", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    assigned_coordinator = relationship("User", foreign_keys=[assigned_coordinator_id])
    audit_logs = relationship("VerificationAuditLog", back_populates="verification", cascade="all, delete-orphan", lazy="selectin")

class VerificationAuditLog(Base):
    __tablename__ = "verification_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("student_verifications.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_gender = Column(String(20), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_coordinator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(50), default="status_change", nullable=False)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    verification = relationship("StudentVerification", back_populates="audit_logs")
    student = relationship("User", foreign_keys=[student_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    assigned_coordinator = relationship("User", foreign_keys=[assigned_coordinator_id])
    actor = relationship("User", foreign_keys=[actor_id])

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)

    problems = relationship("Problem", secondary=problem_tags, back_populates="tags")

class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String(50), default="Easy", nullable=False)
    input_description = Column(Text, nullable=True)
    output_description = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    starter_code = Column(Text, nullable=False)
    time_limit_ms = Column(Integer, default=2000, nullable=False)
    memory_limit_mb = Column(Integer, default=128, nullable=False)
    max_marks = Column(Float, default=100.0, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    tags = relationship("Tag", secondary=problem_tags, back_populates="problems", lazy="selectin")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan", order_by="TestCase.order_index")
    submissions = relationship("Submission", back_populates="problem", cascade="all, delete-orphan")
    progress_records = relationship("ProblemProgress", back_populates="problem", cascade="all, delete-orphan")
    author = relationship("User", foreign_keys=[author_id])

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False, nullable=False)
    sample_explanation = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    problem = relationship("Problem", back_populates="test_cases")
    results = relationship("TestResult", back_populates="test_case", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="SET NULL"), nullable=True, index=True)
    source_code = Column(Text, nullable=False)
    language = Column(String(50), default="python", nullable=False)
    status = Column(String(50), default=SubmissionStatus.SUBMITTED.value, nullable=False, index=True)
    verdict = Column(String(50), nullable=True, index=True)
    execution_time_ms = Column(Float, nullable=True)
    memory_used_kb = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    total_tests = Column(Integer, default=0, nullable=False)
    passed_tests = Column(Integer, default=0, nullable=False)
    is_practice = Column(Boolean, default=True, nullable=False)
    judge0_token = Column(String(100), nullable=True)
    
    # Manual evaluation fields
    marks = Column(Float, nullable=True)
    max_marks = Column(Float, default=100.0, nullable=False)
    teacher_feedback = Column(Text, nullable=True)
    evaluator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evaluated_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    is_draft = Column(Boolean, default=False, nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="submissions", foreign_keys=[user_id])
    evaluator = relationship("User", foreign_keys=[evaluator_id])
    problem = relationship("Problem", back_populates="submissions")
    assignment = relationship("Assignment", back_populates="submissions")
    test_results = relationship("TestResult", back_populates="submission", cascade="all, delete-orphan")

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    is_sample = Column(Boolean, default=False, nullable=False)
    passed = Column(Boolean, default=False, nullable=False)
    verdict = Column(String(50), nullable=False)
    execution_time_ms = Column(Float, nullable=True)
    actual_output = Column(Text, nullable=True)  # sanitized & only stored/visible for sample tests
    error_details = Column(Text, nullable=True)

    submission = relationship("Submission", back_populates="test_results")
    test_case = relationship("TestCase", back_populates="results")

class ProblemProgress(Base):
    __tablename__ = "problem_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="ATTEMPTED", nullable=False)  # ATTEMPTED, SOLVED
    best_submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="SET NULL"), nullable=True)
    attempts_count = Column(Integer, default=1, nullable=False)
    solved_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="progress")
    problem = relationship("Problem", back_populates="progress_records")
    best_submission = relationship("Submission")

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    instructor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    instructor = relationship("User", foreign_keys=[instructor_id])
    members = relationship("ClassMember", back_populates="class_obj", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="class_obj", cascade="all, delete-orphan")
    online_tests = relationship("OnlineTest", back_populates="class_obj", cascade="all, delete-orphan")


class ClassMember(Base):
    __tablename__ = "class_members"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="active", nullable=False)
    joined_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    class_obj = relationship("Class", back_populates="members")
    user = relationship("User", back_populates="class_memberships")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    max_attempts = Column(Integer, nullable=True)  # None = unlimited
    is_published = Column(Boolean, default=False, nullable=False)
    allow_late = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    class_obj = relationship("Class", back_populates="assignments")
    creator = relationship("User", foreign_keys=[creator_id])
    problems = relationship("AssignmentProblem", back_populates="assignment", cascade="all, delete-orphan", order_by="AssignmentProblem.order_index")
    submissions = relationship("Submission", back_populates="assignment")
    assignment_submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")

class AssignmentProblem(Base):
    __tablename__ = "assignment_problems"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    points = Column(Integer, default=100, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)

    assignment = relationship("Assignment", back_populates="problems")
    problem = relationship("Problem")

class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    attempt_number = Column(Integer, default=1, nullable=False)
    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    assignment = relationship("Assignment", back_populates="assignment_submissions")
    student = relationship("User", foreign_keys=[student_id])
    problem = relationship("Problem")
    submission = relationship("Submission")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="system", nullable=False)  # verification, assignment, submission, system
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", foreign_keys=[user_id])

class OnlineTest(Base):
    __tablename__ = "online_tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=60, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    max_marks = Column(Float, default=100.0, nullable=False)
    status = Column(String(50), default=TestStatus.DRAFT.value, nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_tests")
    class_obj = relationship("Class", back_populates="online_tests")
    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan", order_by="TestQuestion.order_index")
    attempts = relationship("TestAttempt", back_populates="test", cascade="all, delete-orphan")

class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("online_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    question_type = Column(String(50), default=QuestionType.MCQ.value, nullable=False)  # mcq, short_answer, long_answer, programming
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    marks = Column(Float, default=10.0, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    options = Column(Text, nullable=True)  # JSON-encoded array: ["Option A", "Option B", ...]
    correct_option = Column(Integer, nullable=True)  # 0-indexed correct option for teacher reference
    programming_language = Column(String(50), default="python", nullable=True)
    starter_code = Column(Text, nullable=True)
    input_example = Column(Text, nullable=True)
    output_example = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    test = relationship("OnlineTest", back_populates="questions")
    answers = relationship("TestAnswer", back_populates="question", cascade="all, delete-orphan")

class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("online_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default=AttemptStatus.IN_PROGRESS.value, nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    total_score = Column(Float, nullable=True)
    max_score = Column(Float, default=100.0, nullable=False)
    feedback = Column(Text, nullable=True)
    evaluator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evaluated_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)

    test = relationship("OnlineTest", back_populates="attempts")
    student = relationship("User", foreign_keys=[student_id], back_populates="test_attempts")
    evaluator = relationship("User", foreign_keys=[evaluator_id])
    answers = relationship("TestAnswer", back_populates="attempt", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("test_id", "student_id", name="uq_test_student_attempt"),
    )

class TestAnswer(Base):
    __tablename__ = "test_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("test_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option = Column(Integer, nullable=True)
    text_answer = Column(Text, nullable=True)
    code_answer = Column(Text, nullable=True)
    language = Column(String(50), default="python", nullable=True)
    score = Column(Float, nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    is_evaluated = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("TestQuestion", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question_answer"),
    )

