import random
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_permission, require_teacher
from app.models import Class, ClassMember, User, AuditLog
from app.schemas import ClassOut, ClassDetail, ClassCreate, ClassUpdate, ClassMemberOut

router = APIRouter(prefix="/classes", tags=["Teacher Class Management"])

def generate_class_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=6))

@router.get("", response_model=List[ClassOut])
async def list_classes(
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Class)
        .options(selectinload(Class.members), selectinload(Class.instructor))
        .order_by(Class.created_at.desc())
    )
    res = await db.execute(query)
    classes = res.scalars().all()

    return [
        ClassOut(
            id=c.id,
            name=c.name,
            code=c.code,
            description=c.description,
            instructor_id=c.instructor_id,
            instructor_name=c.instructor.full_name if c.instructor else None,
            member_count=len(c.members),
            created_at=c.created_at,
        )
        for c in classes
    ]

@router.post("", response_model=ClassDetail, status_code=status.HTTP_201_CREATED)
async def create_class(
    c_in: ClassCreate,
    current_user: User = Depends(require_permission("classes.manage")),
    db: AsyncSession = Depends(get_db),
):
    # Generate unique code
    while True:
        code = generate_class_code()
        check = await db.execute(select(Class).where(Class.code == code))
        if not check.scalar_one_or_none():
            break

    class_obj = Class(
        name=c_in.name,
        code=code,
        description=c_in.description,
        instructor_id=current_user.id,
    )
    db.add(class_obj)
    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="CLASS_CREATE",
        entity_type="class",
        entity_id=str(class_obj.id),
        details=f"Created class {class_obj.name} with code {class_obj.code}",
    ))

    await db.commit()
    await db.refresh(class_obj)

    return ClassDetail(
        id=class_obj.id,
        name=class_obj.name,
        code=class_obj.code,
        description=class_obj.description,
        instructor_id=class_obj.instructor_id,
        instructor_name=current_user.full_name,
        member_count=0,
        created_at=class_obj.created_at,
        members=[],
    )

@router.get("/{class_id}", response_model=ClassDetail)
async def get_class(
    class_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Class)
        .options(
            selectinload(Class.members).selectinload(ClassMember.user),
            selectinload(Class.instructor),
        )
        .where(Class.id == class_id)
    )
    res = await db.execute(query)
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    member_outs = [
        ClassMemberOut(
            id=m.id,
            user_id=m.user_id,
            student_name=m.user.full_name if m.user else "Unknown",
            student_email=m.user.email if m.user else "",
            joined_at=m.joined_at,
            status=m.status,
        )
        for m in c.members
        if m.status == "active"
    ]

    return ClassDetail(
        id=c.id,
        name=c.name,
        code=c.code,
        description=c.description,
        instructor_id=c.instructor_id,
        instructor_name=c.instructor.full_name if c.instructor else None,
        member_count=len(member_outs),
        created_at=c.created_at,
        members=member_outs,
    )

@router.post("/{class_id}/members")
async def add_student_to_class(
    class_id: int,
    student_email: str,
    current_user: User = Depends(require_permission("classes.manage")),
    db: AsyncSession = Depends(get_db),
):
    c_res = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = c_res.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    u_res = await db.execute(select(User).where(User.email == student_email.strip()))
    student = u_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student with this email not found.")

    # Check existing
    m_res = await db.execute(
        select(ClassMember).where(ClassMember.class_id == class_id, ClassMember.user_id == student.id)
    )
    mem = m_res.scalar_one_or_none()
    if mem:
        mem.status = "active"
    else:
        mem = ClassMember(class_id=class_id, user_id=student.id, status="active")
        db.add(mem)

    await db.commit()
    return {"message": f"Student {student.full_name} added to class successfully."}

@router.delete("/{class_id}/members/{user_id}")
async def remove_student_from_class(
    class_id: int,
    user_id: int,
    current_user: User = Depends(require_permission("classes.manage")),
    db: AsyncSession = Depends(get_db),
):
    m_res = await db.execute(
        select(ClassMember).where(ClassMember.class_id == class_id, ClassMember.user_id == user_id)
    )
    mem = m_res.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class member not found.")

    mem.status = "removed"
    await db.commit()
    return {"message": "Student removed from class."}
