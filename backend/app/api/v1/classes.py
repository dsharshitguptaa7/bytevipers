from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_verified_student, require_active_account
from app.models import Class, ClassMember, User
from app.schemas import ClassOut, ClassEnrollRequest

router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("/my", response_model=List[ClassOut])
async def get_my_enrolled_classes(
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Class)
        .join(ClassMember, ClassMember.class_id == Class.id)
        .options(selectinload(Class.members), selectinload(Class.instructor))
        .where(ClassMember.user_id == user.id, ClassMember.status == "active")
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

@router.post("/enroll", response_model=ClassOut)
async def enroll_in_class(
    enroll_req: ClassEnrollRequest,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Class)
        .options(selectinload(Class.members), selectinload(Class.instructor))
        .where(Class.code == enroll_req.code.strip().upper())
    )
    res = await db.execute(stmt)
    class_obj = res.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class with this enrollment code does not exist.",
        )

    # Check existing membership
    for m in class_obj.members:
        if m.user_id == user.id:
            if m.status == "active":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You are already enrolled in this class.",
                )
            else:
                m.status = "active"
                await db.commit()
                return ClassOut(
                    id=class_obj.id,
                    name=class_obj.name,
                    code=class_obj.code,
                    description=class_obj.description,
                    instructor_id=class_obj.instructor_id,
                    instructor_name=class_obj.instructor.full_name if class_obj.instructor else None,
                    member_count=len(class_obj.members),
                    created_at=class_obj.created_at,
                )

    new_member = ClassMember(
        class_id=class_obj.id,
        user_id=user.id,
        status="active",
    )
    db.add(new_member)
    await db.commit()

    return ClassOut(
        id=class_obj.id,
        name=class_obj.name,
        code=class_obj.code,
        description=class_obj.description,
        instructor_id=class_obj.instructor_id,
        instructor_name=class_obj.instructor.full_name if class_obj.instructor else None,
        member_count=len(class_obj.members) + 1,
        created_at=class_obj.created_at,
    )
