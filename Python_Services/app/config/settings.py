"""
Application Configuration Settings
Loads environment variables from .env file using Pydantic
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All values are loaded from .env file automatically by Pydantic.
    See .env.example for template.
    """
    
    # ========================================================================
    # Ollama / Local LLM Configuration
    # ========================================================================
    ollama_base_url: str = "http://localhost:11434"
    """Base URL for local Ollama instance"""

    ollama_model: str = "qwen3:8b"
    """Local model used for scraping/extraction (via Ollama)"""

    # ========================================================================
    # OpenAI Configuration (OPTIONAL — kept only for any remaining
    # third-party integration that might still need it; not required
    # to start the app)
    # ========================================================================
    openai_api_key: Optional[str] = None
    """OpenAI API key — no longer required; pipeline runs on local Ollama"""
    
    # ========================================================================
    # Service Configuration
    # ========================================================================
    service_port: int = 8001
    """Port number for FastAPI server (default: 8001)"""
    
    service_host: str = "0.0.0.0"
    """Host address for FastAPI server (default: 0.0.0.0 for all interfaces)"""
    
    backend_url: str = "http://localhost:8000"
    """URL of Node.js backend API (for future integration)"""
    
    # ========================================================================
    # Database Configuration (PostgreSQL)
    # ========================================================================
    postgres_host: str = "localhost"
    """PostgreSQL host address"""
    
    postgres_port: int = 5433
    """PostgreSQL port number"""
    
    postgres_db: str = "nysi_db"
    """PostgreSQL database name"""
    
    postgres_user: str = "postgres"
    """PostgreSQL username"""
    
    postgres_password: str
    """PostgreSQL password (REQUIRED - no default)"""
    
    # ========================================================================
    # ML/AI Configuration
    # ========================================================================
    
    # Embedding Model
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    """HuggingFace embedding model for vectorization (384 dimensions)"""
    
    vector_dimension: int = 384
    """Vector dimension for BAAI/bge-small-en-v1.5 embeddings"""
    
    # OCR Configuration
    ocr_language: str = "en"
    """PaddleOCR language (default: English)"""
    
    ocr_use_gpu: bool = False
    """Use GPU for OCR (default: False for CPU-only)"""
    
    # ========================================================================
    # Web Scraping Configuration
    # ========================================================================
    scraper_version: str = "1.0.0"
    """Web scraper version for tracking in staging table"""
    
    scraper_headless: bool = True
    """Run browser in headless mode (default: True)"""
    
    scraper_timeout: int = 30
    """Selenium timeout in seconds (default: 30)"""
    
    # ========================================================================
    # Application Behavior
    # ========================================================================
    debug_mode: bool = False
    """Enable debug logging and verbose output"""
    
    max_concurrent_requests: int = 5
    """Maximum concurrent scraping requests"""
    
    # ========================================================================
    # Pydantic Configuration
    # ========================================================================
    class Config:
        """Pydantic configuration"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields in .env

    @field_validator("backend_url", mode="before")
    @classmethod
    def normalize_backend_url(cls, value):
        return value or "http://localhost:8000"

    @field_validator("postgres_host", mode="before")
    @classmethod
    def normalize_postgres_host(cls, value):
        return value or "localhost"

    @field_validator("postgres_port", mode="before")
    @classmethod
    def normalize_postgres_port(cls, value):
        return value or 5432

    @field_validator("postgres_db", mode="before")
    @classmethod
    def normalize_postgres_db(cls, value):
        return value or "nysi_db"

    @field_validator("postgres_user", mode="before")
    @classmethod
    def normalize_postgres_user(cls, value):
        return value or "postgres"
    
    # ========================================================================
    # Helper Methods
    # ========================================================================
    
    @property
    def database_url(self) -> str:
        """
        Construct PostgreSQL connection URL.
        
        Returns:
            str: PostgreSQL connection string
        """
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
    
    def get_openai_config(self) -> dict:
        """
        Get OpenAI configuration for ScrapegraphAI and LlamaIndex.
        
        Returns:
            dict: OpenAI configuration
        """
        return {
            "api_key": self.openai_api_key,
            "model": "ollama/qwen3:8b"
        }
    
    def get_ollama_config(self) -> dict:
        """
        Get Ollama configuration for ScrapeGraphAI / LlamaIndex.

        Returns:
            dict: Ollama configuration
        """
        return {
            "model": f"ollama/{self.ollama_model}",
            "base_url": self.ollama_base_url,
            "format": "json",
        }
    
    def get_embedding_config(self) -> dict:
        """
        Get embedding model configuration.
        
        Returns:
            dict: Embedding configuration
        """
        return {
            "model_name": self.embedding_model,
            "embed_batch_size": 10,
            "device": "cpu"  # Force CPU for compatibility
        }
    
    def validate_required_settings(self) -> bool:
            """
            Validate that all required settings are present.
            postgres_password is required; openai_api_key is not.
            """
            required = [
                ("postgres_password", self.postgres_password)
            ]

            missing = [name for name, value in required if not value]

            if missing:
                raise ValueError(
                    f"Missing required environment variables: {', '.join(missing)}"
                )

            return True
    
    def __repr__(self) -> str:
        """Safe string representation (hides secrets)"""
        return (
            f"Settings("
            f"service_port={self.service_port}, "
            f"database={self.postgres_db}, "
            f"embedding_model={self.embedding_model}, "
            f"ollama_model={self.ollama_model}"
            f")"
        )


# ============================================================================
# Global Settings Instance
# ============================================================================

settings = Settings()
"""
Global settings instance.
Import this in your services:

    from app.config.settings import settings
    
    db_url = settings.database_url
"""


# ============================================================================
# Startup Validation
# ============================================================================

def validate_settings():
    """
    Validate settings on application startup.
    Call this from main.py on startup.
    """
    try:
        settings.validate_required_settings()
        print("✅ Settings validated successfully")
        print(f"   Service: http://{settings.service_host}:{settings.service_port}")
        print(f"   Database: {settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}")
        print(f"   Embedding Model: {settings.embedding_model}")
        return True
    except ValueError as e:
        print(f"❌ Settings validation failed: {e}")
        print("\n💡 Make sure you have a .env file with all required variables.")
        print("   See .env.example for template.")
        return False


# Run validation on import (optional - can also call from main.py)
if __name__ != "__main__":
    # Silent validation on import
    try:
        settings.validate_required_settings()
    except ValueError:
        pass  # Will fail loudly when service tries to start
