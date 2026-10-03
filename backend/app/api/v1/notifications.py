from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_authenticated_user
from app.models import Notification, User
from app.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
async def get_my_notifications(
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    res = await db.execute(query)
    return res.scalars().all()

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    n = res.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    n.is_read = True
    await db.commit()
    return {"message": "Notification marked as read."}

@router.post("/read-all")
async def mark_all_as_read(
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification).where(Notification.user_id == user.id).values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read."}
