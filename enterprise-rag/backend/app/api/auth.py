from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.domain.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    user_id: str
    email: str
    access_token: str


@router.post("/login", response_model=AuthResponse)
async def login_or_register(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=payload.email)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return AuthResponse(
        user_id=user.id,
        email=user.email,
        access_token=f"token_{user.id}"
    )
