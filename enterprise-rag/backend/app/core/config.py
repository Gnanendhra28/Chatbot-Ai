import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV = BASE_DIR.parent / ".env"
LOCAL_ENV = BASE_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise RAG API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    POSTGRES_SERVER: str = Field(default="localhost", alias="POSTGRES_SERVER")
    POSTGRES_PORT: int = Field(default=5432, alias="POSTGRES_PORT")
    POSTGRES_USER: str = Field(default="postgres", alias="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(default="postgrespassword", alias="POSTGRES_PASSWORD")
    POSTGRES_DB: str = Field(default="enterprise_rag", alias="POSTGRES_DB")
    DATABASE_URL: Optional[str] = None

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Vector Embedding Settings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    VECTOR_DIMENSION: int = 384

    # Multi-LLM Provider API Keys (Groq, Gemini, OpenAI)
    GROQ_API_KEY: Optional[str] = Field(default=None, alias="GROQ_API_KEY")
    GEMINI_API_KEY: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    LLM_API_KEY: Optional[str] = Field(default=None, alias="LLM_API_KEY")
    LLM_PROVIDER: str = "groq"  # groq, gemini, openai
    LLM_MODEL: str = "qwen/qwen3.8-27b"

    # Storage Settings
    STORAGE_TYPE: str = "local"  # local or gcs
    LOCAL_STORAGE_DIR: str = "./data/uploads"
    GCS_BUCKET_NAME: Optional[str] = None
    GCP_PROJECT_ID: Optional[str] = None

    # CORS Settings
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://0.0.0.0:8000"

    @property
    def parsed_cors_origins(self) -> list[str]:
        if not self.CORS_ORIGINS:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def use_gcs(self) -> bool:
        return self.STORAGE_TYPE.lower() == "gcs" or bool(self.GCS_BUCKET_NAME)

    model_config = SettingsConfigDict(
        env_file=[str(ROOT_ENV), str(LOCAL_ENV), ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

