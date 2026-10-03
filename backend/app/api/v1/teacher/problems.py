from datetime import datetime, timezone
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_permission, require_teacher
from app.models import Problem, TestCase, Tag, User, AuditLog
from app.schemas import (
    ProblemListItem, ProblemTeacherDetail, ProblemCreate, ProblemUpdate,
    TestCaseTeacherOut, TagOut
)

router = APIRouter(prefix="/problems", tags=["Teacher Problem Management"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text)

@router.get("", response_model=List[ProblemListItem])
async def list_teacher_problems(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, description="published, draft"),
    difficulty: Optional[str] = Query(None),
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    query = select(Problem).options(selectinload(Problem.tags))
    if search:
        query = query.where(Problem.title.ilike(f"%{search}%"))
    if status_filter == "published":
        query = query.where(Problem.is_published == True)
    elif status_filter == "draft":
        query = query.where(Problem.is_published == False)
    if difficulty:
        query = query.where(Problem.difficulty == difficulty)

    query = query.order_by(Problem.id.desc())
    res = await db.execute(query)
    problems = res.scalars().all()

    return [
        ProblemListItem(
            id=p.id,
            title=p.title,
            slug=p.slug,
            difficulty=p.difficulty,
            tags=[TagOut.model_validate(t) for t in p.tags],
            time_limit_ms=p.time_limit_ms,
            memory_limit_mb=p.memory_limit_mb,
            is_published=p.is_published,
            solved_status=None,
            created_at=p.created_at,
        )
        for p in problems
    ]

@router.get("/{problem_id}", response_model=ProblemTeacherDetail)
async def get_teacher_problem(
    problem_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
        .where(Problem.id == problem_id)
    )
    res = await db.execute(query)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    sample_cases = [tc for tc in p.test_cases if tc.is_sample]

    return ProblemTeacherDetail(
        id=p.id,
        title=p.title,
        slug=p.slug,
        description=p.description,
        difficulty=p.difficulty,
        input_description=p.input_description,
        output_description=p.output_description,
        constraints=p.constraints,
        starter_code=p.starter_code,
        time_limit_ms=p.time_limit_ms,
        memory_limit_mb=p.memory_limit_mb,
        tags=[TagOut.model_validate(t) for t in p.tags],
        sample_cases=[tc for tc in sample_cases],
        test_cases=[TestCaseTeacherOut.model_validate(tc) for tc in p.test_cases],
        is_published=p.is_published,
        solved_status=None,
        author_id=p.author_id,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )

@router.post("", response_model=ProblemTeacherDetail, status_code=status.HTTP_201_CREATED)
async def create_problem(
    p_in: ProblemCreate,
    current_user: User = Depends(require_permission("problems.create")),
    db: AsyncSession = Depends(get_db),
):
    base_slug = p_in.slug or slugify(p_in.title)
    # Ensure unique slug
    slug = base_slug
    idx = 1
    while True:
        check = await db.execute(select(Problem).where(Problem.slug == slug))
        if not check.scalar_one_or_none():
            break
        slug = f"{base_slug}-{idx}"
        idx += 1

    problem = Problem(
        title=p_in.title,
        slug=slug,
        description=p_in.description,
        difficulty=p_in.difficulty,
        input_description=p_in.input_description,
        output_description=p_in.output_description,
        constraints=p_in.constraints,
        starter_code=p_in.starter_code,
        time_limit_ms=p_in.time_limit_ms,
        memory_limit_mb=p_in.memory_limit_mb,
        is_published=False,  # New problems start as draft unless explicitly published with permissions
        author_id=current_user.id,
    )

    # Attach tags
    for tag_name in p_in.tags:
        t_stmt = select(Tag).where(Tag.name == tag_name)
        t_res = await db.execute(t_stmt)
        tag = t_res.scalar_one_or_none()
        if not tag:
            tag = Tag(name=tag_name, slug=slugify(tag_name))
            db.add(tag)
            await db.flush()
        problem.tags.append(tag)

    db.add(problem)
    await db.flush()

    # Add test cases
    for tc_data in p_in.test_cases:
        tc = TestCase(
            problem_id=problem.id,
            input_data=tc_data.input_data,
            expected_output=tc_data.expected_output,
            is_sample=tc_data.is_sample,
            sample_explanation=tc_data.sample_explanation,
            order_index=tc_data.order_index,
        )
        db.add(tc)

    # If requested published, verify permission and test cases
    if p_in.is_published:
        user_perms = [p.name for p in current_user.permissions]
        if "problems.publish" in user_perms or "platform.superadmin" in user_perms:
            if not p_in.test_cases:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot publish a problem with no test cases.")
            problem.is_published = True

    db.add(AuditLog(
        user_id=current_user.id,
        action="PROBLEM_CREATE",
        entity_type="problem",
        entity_id=str(problem.id),
        details=f"Created problem: {problem.title} (slug: {problem.slug})",
    ))

    await db.commit()
    await db.refresh(problem)
    return await get_teacher_problem(problem.id, current_user, db)

@router.patch("/{problem_id}", response_model=ProblemTeacherDetail)
async def update_problem(
    problem_id: int,
    p_in: ProblemUpdate,
    current_user: User = Depends(require_permission("problems.edit")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Problem)
        .options(selectinload(Problem.tags), selectinload(Problem.test_cases))
        .where(Problem.id == problem_id)
    )
    res = await db.execute(query)
    problem = res.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    if p_in.title is not None:
        problem.title = p_in.title
    if p_in.slug is not None:
        problem.slug = slugify(p_in.slug)
    if p_in.description is not None:
        problem.description = p_in.description
    if p_in.difficulty is not None:
        problem.difficulty = p_in.difficulty
    if p_in.input_description is not None:
        problem.input_description = p_in.input_description
    if p_in.output_description is not None:
        problem.output_description = p_in.output_description
    if p_in.constraints is not None:
        problem.constraints = p_in.constraints
    if p_in.starter_code is not None:
        problem.starter_code = p_in.starter_code
    if p_in.time_limit_ms is not None:
        problem.time_limit_ms = p_in.time_limit_ms
    if p_in.memory_limit_mb is not None:
        problem.memory_limit_mb = p_in.memory_limit_mb

    if p_in.tags is not None:
        problem.tags.clear()
        for tag_name in p_in.tags:
            t_stmt = select(Tag).where(Tag.name == tag_name)
            t_res = await db.execute(t_stmt)
            tag = t_res.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name, slug=slugify(tag_name))
                db.add(tag)
                await db.flush()
            problem.tags.append(tag)

    if p_in.test_cases is not None:
        # Replace test cases
        for old_tc in problem.test_cases:
            await db.delete(old_tc)
        await db.flush()
        for tc_data in p_in.test_cases:
            tc = TestCase(
                problem_id=problem.id,
                input_data=tc_data.input_data,
                expected_output=tc_data.expected_output,
                is_sample=tc_data.is_sample,
                sample_explanation=tc_data.sample_explanation,
                order_index=tc_data.order_index,
            )
            db.add(tc)

    if p_in.is_published is not None:
        user_perms = [p.name for p in current_user.permissions]
        if "problems.publish" not in user_perms and "platform.superadmin" not in user_perms:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing permission: problems.publish")
        problem.is_published = p_in.is_published

    problem.updated_at = datetime.now(timezone.utc)
    db.add(AuditLog(
        user_id=current_user.id,
        action="PROBLEM_UPDATE",
        entity_type="problem",
        entity_id=str(problem.id),
        details=f"Updated problem ID {problem.id}",
    ))

    await db.commit()
    await db.refresh(problem)
    return await get_teacher_problem(problem.id, current_user, db)

@router.post("/{problem_id}/publish", response_model=ProblemTeacherDetail)
async def toggle_publish(
    problem_id: int,
    current_user: User = Depends(require_permission("problems.publish")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Problem)
        .options(selectinload(Problem.test_cases))
        .where(Problem.id == problem_id)
    )
    res = await db.execute(query)
    problem = res.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    if not problem.is_published and not problem.test_cases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish a problem with no test cases configured.",
        )

    problem.is_published = not problem.is_published
    problem.updated_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        user_id=current_user.id,
        action="PROBLEM_PUBLISH_TOGGLE",
        entity_type="problem",
        entity_id=str(problem.id),
        details=f"Toggled publish for problem ID {problem.id} to {problem.is_published}",
    ))

    await db.commit()
    await db.refresh(problem)
    return await get_teacher_problem(problem.id, current_user, db)

@router.delete("/{problem_id}")
async def delete_problem(
    problem_id: int,
    current_user: User = Depends(require_permission("problems.edit")),
    db: AsyncSession = Depends(get_db),
):
    query = select(Problem).where(Problem.id == problem_id)
    res = await db.execute(query)
    problem = res.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    db.add(AuditLog(
        user_id=current_user.id,
        action="PROBLEM_DELETE",
        entity_type="problem",
        entity_id=str(problem.id),
        details=f"Deleted problem {problem.title} (ID: {problem.id})",
    ))

    await db.delete(problem)
    await db.commit()
    return {"message": "Problem deleted successfully."}
