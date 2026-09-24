from abc import ABC, abstractmethod
from typing import List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.schemas import MetadataFilter


class BaseRetriever(ABC):
    @abstractmethod
    async def retrieve(
        self,
        db: AsyncSession,
        target: Union[str, MetadataFilter],
        query: str,
        top_k: int = 20
    ) -> List[Dict[str, Any]]:
        pass
