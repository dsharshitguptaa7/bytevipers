from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_user_optional
from app.models import Problem, Tag, TestCase, ProblemProgress, User
from app.schemas import ProblemListItem, ProblemDetail, TagOut, TestCasePublicOut

router = APIRouter(prefix="/problems", tags=["Problems"])

@router.get("/tags/all", response_model=List[TagOut])
async def list_tags(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Tag).order_by(Tag.name))
    return res.scalars().all()

@router.get("", response_model=List[ProblemListItem])
async def list_problems(
    search: Optional[str] = Query(None, description="Search by title"),
    difficulty: Optional[str] = Query(None, description="Easy, Medium, Hard"),
    tag: Optional[str] = Query(None, description="Tag slug"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Problem)
        .options(selectinload(Problem.tags))
        .where(Problem.is_published == True)
    )

    if search:
        query = query.where(Problem.title.ilike(f"%{search}%"))
    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if tag:
        query = query.join(Problem.tags).where(Tag.slug == tag)

    query = query.order_by(Problem.id.asc()).offset(skip).limit(limit)
    res = await db.execute(query)
    problems = res.scalars().all()

    # If student is logged in, attach solved_status
    user_status_map = {}
    if current_user:
        prog_query = select(ProblemProgress).where(
            ProblemProgress.user_id == current_user.id,
            ProblemProgress.problem_id.in_([p.id for p in problems]) if problems else False,
        )
        prog_res = await db.execute(prog_query)
        for prog in prog_res.scalars().all():
            user_status_map[prog.problem_id] = prog.status

    items = []
    for p in problems:
        items.append(
            ProblemListItem(
                id=p.id,
                title=p.title,
                slug=p.slug,
                difficulty=p.difficulty,
                tags=[TagOut.model_validate(t) for t in p.tags],
                time_limit_ms=p.time_limit_ms,
                memory_limit_mb=p.memory_limit_mb,
                is_published=p.is_published,
                solved_status=user_status_map.get(p.id),
                created_at=p.created_at,
            )
        )
    return items

@router.get("/{slug}", response_model=ProblemDetail)
async def get_problem(
    slug: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Problem)
        .options(
            selectinload(Problem.tags),
            selectinload(Problem.test_cases),
        )
        .where(Problem.slug == slug)
    )
    res = await db.execute(query)
    problem = res.scalar_one_or_none()

    if not problem or not problem.is_published:
        # Teachers with permissions can preview unpublished problems
        if not (current_user and current_user.role == "teacher"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found or not published.",
            )

    solved_status = None
    if current_user:
        prog_res = await db.execute(
            select(ProblemProgress).where(
                ProblemProgress.user_id == current_user.id,
                ProblemProgress.problem_id == problem.id,
            )
        )
        prog = prog_res.scalar_one_or_none()
        if prog:
            solved_status = prog.status

    # Filter only sample test cases for public/student view!
    sample_cases = [
        TestCasePublicOut.model_validate(tc)
        for tc in problem.test_cases
        if tc.is_sample
    ]

    return ProblemDetail(
        id=problem.id,
        title=problem.title,
        slug=problem.slug,
        description=problem.description,
        difficulty=problem.difficulty,
        input_description=problem.input_description,
        output_description=problem.output_description,
        constraints=problem.constraints,
        starter_code=problem.starter_code,
        time_limit_ms=problem.time_limit_ms,
        memory_limit_mb=problem.memory_limit_mb,
        tags=[TagOut.model_validate(t) for t in problem.tags],
        sample_cases=sample_cases,
        is_published=problem.is_published,
        solved_status=solved_status,
        created_at=problem.created_at,
    )
