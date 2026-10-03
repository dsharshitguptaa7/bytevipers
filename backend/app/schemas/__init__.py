from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

# ----------------- User & Auth Schemas -----------------
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    gender: str = Field(..., description="Gender: Male or Female")

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        clean = v.strip().capitalize()
        if clean not in ("Male", "Female"):
            raise ValueError("Gender must be 'Male' or 'Female'.")
        return clean

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    gender: Optional[str] = None
    coordinator_position: Optional[str] = None
    is_active: bool
    is_suspended: bool
    suspension_reason: Optional[str] = None
    permissions: List[str] = []
    verification_status: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_suspended: Optional[bool] = None
    suspension_reason: Optional[str] = None
    permissions: Optional[List[str]] = None

# ----------------- Verification Schemas -----------------
class VerificationApply(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    gender: Optional[str] = None
    institution_name: str = Field(..., min_length=2, max_length=200)
    department: str = Field(..., min_length=2, max_length=100)
    course: str = Field(..., min_length=2, max_length=100)
    semester: str = Field(..., min_length=1, max_length=50)
    roll_number: str = Field(..., min_length=1, max_length=100)
    institutional_email: Optional[EmailStr] = None
    verification_method: str = "student_id"
    document_reference: Optional[str] = None

    @field_validator("gender")
    @classmethod
    def validate_gender_optional(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        clean = v.strip().capitalize()
        if clean not in ("Male", "Female"):
            raise ValueError("Gender must be 'Male' or 'Female'.")
        return clean

class VerificationReviewAction(BaseModel):
    reviewer_notes: Optional[str] = None
    reason: Optional[str] = None

class VerificationAuditLogOut(BaseModel):
    id: int
    verification_id: int
    student_id: int
    student_gender: Optional[str] = None
    reviewer_id: Optional[int] = None
    assigned_coordinator_id: Optional[int] = None
    assigned_coordinator_name: Optional[str] = None
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: Optional[str] = None
    previous_status: str
    new_status: str
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class VerificationOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    gender: Optional[str] = None
    institution_name: str
    department: str
    course: str
    semester: str
    roll_number: str
    institutional_email: Optional[str] = None
    verification_method: str
    document_reference: Optional[str] = None
    status: str
    reviewer_id: Optional[int] = None
    assigned_coordinator_id: Optional[int] = None
    assigned_coordinator_name: Optional[str] = None
    reviewer_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    audit_logs: Optional[List[VerificationAuditLogOut]] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Coordinator Management Schemas -----------------
class CoordinatorAccountOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    gender: str
    coordinator_position: str
    is_active: bool
    pending_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CoordinatorPositionOut(BaseModel):
    position: str
    title: str
    gender: str
    account: Optional[CoordinatorAccountOut] = None

class CoordinatorInitialize(BaseModel):
    position: str = Field(..., description="male_1, male_2, female_1, female_2")
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

    @field_validator("position")
    @classmethod
    def validate_position(cls, v: str) -> str:
        if v not in ("male_1", "male_2", "female_1", "female_2"):
            raise ValueError("Position must be one of: male_1, male_2, female_1, female_2")
        return v

class CoordinatorUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class CoordinatorPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=100)

class VerificationReassign(BaseModel):
    coordinator_id: int
    reason: Optional[str] = None

class CoordinatorStatsOut(BaseModel):
    coordinator_name: str
    coordinator_position: str
    gender: str
    my_pending_count: int
    gender_queue_pending_count: int
    my_approved_count: int
    my_rejected_count: int

# ----------------- Tag & Test Case Schemas -----------------
class TagOut(BaseModel):
    id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)

class TestCaseBase(BaseModel):
    input_data: str
    expected_output: str
    is_sample: bool = False
    sample_explanation: Optional[str] = None
    order_index: int = 0

class TestCaseCreate(TestCaseBase):
    pass

class TestCasePublicOut(BaseModel):
    id: int
    input_data: str
    expected_output: str
    is_sample: bool
    sample_explanation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TestCaseTeacherOut(TestCaseBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Problem Schemas -----------------
class ProblemListItem(BaseModel):
    id: int
    title: str
    slug: str
    difficulty: str
    tags: List[TagOut] = []
    time_limit_ms: int
    memory_limit_mb: int
    is_published: bool
    solved_status: Optional[str] = None  # None, ATTEMPTED, SOLVED
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProblemDetail(BaseModel):
    id: int
    title: str
    slug: str
    description: str
    difficulty: str
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    starter_code: str
    time_limit_ms: int
    memory_limit_mb: int
    tags: List[TagOut] = []
    sample_cases: List[TestCasePublicOut] = []
    is_published: bool
    solved_status: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProblemTeacherDetail(ProblemDetail):
    test_cases: List[TestCaseTeacherOut] = []
    author_id: Optional[int] = None
    updated_at: datetime

class ProblemCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    slug: Optional[str] = None
    description: str
    difficulty: str = "Easy"
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    starter_code: str = "def solve():\n    # Write your Python code here\n    pass\n"
    time_limit_ms: int = 2000
    memory_limit_mb: int = 128
    is_published: bool = False
    tags: List[str] = []
    test_cases: List[TestCaseCreate] = []

class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    constraints: Optional[str] = None
    starter_code: Optional[str] = None
    time_limit_ms: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    is_published: Optional[bool] = None
    tags: Optional[List[str]] = None
    test_cases: Optional[List[TestCaseCreate]] = None

# ----------------- Code Run & Submission Schemas -----------------
class CodeRunRequest(BaseModel):
    problem_id: int
    source_code: str
    custom_input: Optional[str] = None

class SampleCaseRunResult(BaseModel):
    test_case_id: int
    input_data: str
    expected_output: str
    actual_output: Optional[str] = None
    passed: bool
    verdict: str
    execution_time_ms: Optional[float] = None
    error_message: Optional[str] = None

class CodeRunResponse(BaseModel):
    verdict: str
    execution_time_ms: Optional[float] = None
    memory_used_kb: Optional[int] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    error_message: Optional[str] = None
    sample_results: List[SampleCaseRunResult] = []

class SubmissionCreate(BaseModel):
    problem_id: int
    source_code: str
    language: str = "python"
    assignment_id: Optional[int] = None
    is_draft: bool = False

class SubmissionDraftSave(BaseModel):
    problem_id: int
    source_code: str
    language: str = "python"
    assignment_id: Optional[int] = None

class SubmissionEvaluateRequest(BaseModel):
    marks: float = Field(..., ge=0)
    teacher_feedback: Optional[str] = None
    publish: bool = True

class TestResultOut(BaseModel):
    test_case_id: int
    is_sample: bool
    passed: bool
    verdict: str
    execution_time_ms: Optional[float] = None
    actual_output: Optional[str] = None  # only non-null for samples
    error_details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SubmissionOut(BaseModel):
    id: int
    problem_id: int
    problem_title: Optional[str] = None
    assignment_id: Optional[int] = None
    user_id: Optional[int] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    source_code: Optional[str] = None
    language: str
    status: str
    verdict: Optional[str] = None
    execution_time_ms: Optional[float] = None
    memory_used_kb: Optional[int] = None
    error_message: Optional[str] = None
    total_tests: int
    passed_tests: int
    is_practice: bool
    
    # Manual evaluation fields
    marks: Optional[float] = None
    max_marks: float = 100.0
    teacher_feedback: Optional[str] = None
    evaluator_id: Optional[int] = None
    evaluator_name: Optional[str] = None
    evaluated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    is_draft: bool = False
    submitted_at: Optional[datetime] = None

    created_at: datetime
    test_results: Optional[List[TestResultOut]] = None

    model_config = ConfigDict(from_attributes=True)

class QuestionCreate(BaseModel):
    question_type: str = "mcq"  # mcq, short_answer, long_answer, programming
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=2)
    marks: float = Field(10.0, ge=0)
    order_index: int = 0
    options: Optional[Any] = None
    correct_option: Optional[Any] = None
    programming_language: Optional[str] = "python"
    starter_code: Optional[str] = None
    input_example: Optional[str] = None
    output_example: Optional[str] = None

class QuestionUpdate(BaseModel):
    question_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    marks: Optional[float] = None
    order_index: Optional[int] = None
    options: Optional[Any] = None
    correct_option: Optional[Any] = None
    programming_language: Optional[str] = None
    starter_code: Optional[str] = None
    input_example: Optional[str] = None
    output_example: Optional[str] = None

class QuestionOut(BaseModel):
    id: int
    test_id: int
    question_type: str
    title: str
    description: str
    marks: float
    order_index: int
    options: Optional[Any] = None
    correct_option: Optional[Any] = None  # None for student view
    programming_language: Optional[str] = None
    starter_code: Optional[str] = None
    input_example: Optional[str] = None
    output_example: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class OnlineTestCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: int = Field(60, ge=1, le=1440)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_marks: Optional[float] = None
    class_id: Optional[int] = None
    questions: List[QuestionCreate] = []

class OnlineTestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_marks: Optional[float] = None
    class_id: Optional[int] = None
    status: Optional[str] = None

class OnlineTestOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_marks: float
    status: str
    creator_id: int
    creator_name: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    question_count: int = 0
    questions: Optional[List[QuestionOut]] = None
    attempt_status: Optional[str] = None  # student view
    attempt_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TestAnswerSave(BaseModel):
    question_id: int
    selected_option: Optional[Any] = None
    text_answer: Optional[str] = None
    code_answer: Optional[str] = None
    language: Optional[str] = "python"

class TestAnswerOut(BaseModel):
    id: int
    question_id: int
    selected_option: Optional[Any] = None
    text_answer: Optional[str] = None
    code_answer: Optional[str] = None
    language: Optional[str] = None
    score: Optional[float] = None
    teacher_feedback: Optional[str] = None
    is_evaluated: bool = False
    question: Optional[QuestionOut] = None

    model_config = ConfigDict(from_attributes=True)

class AnswerEvaluateItem(BaseModel):
    question_id: int
    score: float = Field(..., ge=0)
    teacher_feedback: Optional[str] = None

class TestAttemptEvaluateRequest(BaseModel):
    feedback: Optional[str] = None
    overall_feedback: Optional[str] = None
    publish: bool = False
    total_score_override: Optional[float] = None
    answers_evaluation: List[AnswerEvaluateItem] = []
    question_scores: Optional[Dict[str, Any]] = None

class TestAttemptOut(BaseModel):
    id: int
    test_id: int
    test_title: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    remaining_seconds: Optional[int] = None
    total_score: Optional[float] = None
    max_score: float
    feedback: Optional[str] = None
    evaluator_name: Optional[str] = None
    evaluated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    answers: Optional[List[TestAnswerOut]] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Class Schemas -----------------
class ClassCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ClassMemberOut(BaseModel):
    id: int
    user_id: int
    student_name: str
    student_email: str
    joined_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)

class ClassOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    instructor_id: int
    instructor_name: Optional[str] = None
    member_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ClassDetail(ClassOut):
    members: List[ClassMemberOut] = []

class ClassEnrollRequest(BaseModel):
    code: str

# ----------------- Assignment Schemas -----------------
class AssignmentProblemItem(BaseModel):
    problem_id: int
    points: int = 100
    order_index: int = 0

class AssignmentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    class_id: int
    start_date: datetime
    due_date: datetime
    max_attempts: Optional[int] = None
    allow_late: bool = False
    is_published: bool = False
    problems: List[AssignmentProblemItem] = []

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    max_attempts: Optional[int] = None
    allow_late: Optional[bool] = None
    is_published: Optional[bool] = None
    problems: Optional[List[AssignmentProblemItem]] = None

class AssignmentProblemOut(BaseModel):
    problem_id: int
    title: str
    slug: str
    difficulty: str
    points: int
    order_index: int
    solved: bool = False
    best_score: float = 0.0

class AssignmentStudentOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    start_date: datetime
    due_date: datetime
    max_attempts: Optional[int] = None
    allow_late: bool
    is_published: bool
    problems: List[AssignmentProblemOut] = []
    user_attempts: int = 0
    user_total_score: float = 0.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssignmentTeacherOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    start_date: datetime
    due_date: datetime
    max_attempts: Optional[int] = None
    allow_late: bool
    is_published: bool
    problems_count: int = 0
    total_points: int = 0
    submissions_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Dashboard & Analytics Schemas -----------------
class StudentDashboardOut(BaseModel):
    verified: bool
    verification_status: str
    problems_solved: int
    total_submissions: int
    accepted_submissions: int
    accuracy_rate: float
    recent_submissions: List[SubmissionOut] = []
    difficulty_stats: Dict[str, Dict[str, int]] = {}
    topic_stats: Dict[str, int] = {}
    active_assignments: List[AssignmentStudentOut] = []

class TeacherOverviewOut(BaseModel):
    total_students: int
    verified_students_count: int
    pending_verifications_count: int
    rejected_verifications_count: int
    published_problems_count: int
    draft_problems_count: int
    active_assignments_count: int
    total_submissions_count: int
    recent_events: List[Dict[str, Any]] = []

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
