from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.verification import router as verification_router
from app.api.v1.problems import router as problems_router
from app.api.v1.submissions import router as submissions_router
from app.api.v1.classes import router as classes_router
from app.api.v1.assignments import router as assignments_router
from app.api.v1.student import router as student_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.tests import router as tests_router
from app.api.v1.coordinator import router as coordinator_router

# Teacher sub-routers
from app.api.v1.teacher.analytics import router as teacher_analytics_router
from app.api.v1.teacher.verifications import router as teacher_verifications_router
from app.api.v1.teacher.problems import router as teacher_problems_router
from app.api.v1.teacher.classes import router as teacher_classes_router
from app.api.v1.teacher.assignments import router as teacher_assignments_router
from app.api.v1.teacher.submissions import router as teacher_submissions_router
from app.api.v1.teacher.tests import router as teacher_tests_router
from app.api.v1.teacher.platform import router as teacher_platform_router
from app.api.v1.teacher.coordinators import router as teacher_coordinators_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(verification_router)
api_router.include_router(coordinator_router)
api_router.include_router(problems_router)
api_router.include_router(submissions_router)
api_router.include_router(tests_router)
api_router.include_router(classes_router)
api_router.include_router(assignments_router)
api_router.include_router(student_router)
api_router.include_router(notifications_router)

# Unified Teacher/Instructor Dashboard management router under /teacher
teacher_router = APIRouter(prefix="/teacher")
teacher_router.include_router(teacher_analytics_router)
teacher_router.include_router(teacher_verifications_router)
teacher_router.include_router(teacher_coordinators_router)
teacher_router.include_router(teacher_problems_router)
teacher_router.include_router(teacher_classes_router)
teacher_router.include_router(teacher_assignments_router)
teacher_router.include_router(teacher_submissions_router)
teacher_router.include_router(teacher_tests_router)
teacher_router.include_router(teacher_platform_router)

api_router.include_router(teacher_router)

