from typing import AsyncGenerator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def ensure_user_exists(db: AsyncSession, user_id: str, email: str = "user@enterprise.com"):
    from app.domain.models import User
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            user = User(id=user_id, email=email)
            db.add(user)
            await db.flush()
    except Exception as e:
        print(f"[DB] ensure_user_exists warning: {e}")
