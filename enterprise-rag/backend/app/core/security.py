import os
import re
import time
import logging
from typing import Optional, Dict
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("enterprise_rag.security")

security_scheme = HTTPBearer(auto_error=False)


class UserPrincipal(BaseModel):
    user_id: str = "default-user-id"
    tenant_id: str = "default-user-id"
    role: str = "admin"
    department: str = "Engineering"
    email: str = "user@enterprise.com"


# Prompt Injection Neutralization Patterns
MALICIOUS_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignore\s+(all\s+)?above\s+instructions",
    r"disregard\s+prior\s+instructions",
    r"system\s+override",
    r"you\s+are\s+now\s+dan",
    r"reveal\s+system\s+prompt",
    r"print\s+api\s+key",
]


class PromptInjectionSanitizer:
    """
    Protects RAG pipeline against indirect prompt injection embedded inside uploaded documents.
    """

    @staticmethod
    def sanitize_text(text: str) -> str:
        if not text:
            return ""

        sanitized = text
        for pattern in MALICIOUS_INJECTION_PATTERNS:
            if re.search(pattern, sanitized, flags=re.IGNORECASE):
                logger.warning(f"[Security] Detected potential prompt injection matching pattern '{pattern}'")
                sanitized = re.sub(pattern, "[SECURITY_REDACTED_INSTRUCTION]", sanitized, flags=re.IGNORECASE)

        return sanitized


class SimpleRateLimiter:
    """
    Sliding window rate limiter (60 requests / minute per tenant/user).
    """

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_history: Dict[str, list] = {}

    def check_rate_limit(self, key: str):
        now = time.time()
        history = self.request_history.get(key, [])
        # Prune expired timestamps
        history = [t for t in history if now - t < self.window_seconds]
        if len(history) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Maximum 60 requests per minute."
            )
        history.append(now)
        self.request_history[key] = history


rate_limiter = SimpleRateLimiter()


def sanitize_filename(filename: str) -> str:
    """
    Prevents directory traversal and strips dangerous characters.
    """
    base = os.path.basename(filename)
    clean = re.sub(r"[^\w\.-]", "_", base)
    return clean or "document.pdf"


async def get_current_user_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> UserPrincipal:
    if credentials and credentials.credentials:
        token = credentials.credentials
        if "employee" in token:
            role = "employee"
        elif "manager" in token:
            role = "manager"
        else:
            role = "admin"

        department = "HR" if "hr" in token else "Engineering"
        principal = UserPrincipal(
            user_id=f"user_{token[:8]}",
            tenant_id="default-tenant-id",
            role=role,
            department=department,
            email=f"{role}@enterprise.com"
        )
        rate_limiter.check_rate_limit(principal.user_id)
        return principal

    principal = UserPrincipal()
    rate_limiter.check_rate_limit(principal.user_id)
    return principal


async def get_current_user_id(
    principal: UserPrincipal = Depends(get_current_user_principal)
) -> str:
    return principal.user_id
