from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # OpenAI
    openai_api_key: str
    
    # Service config
    service_port: int = 8001
    service_host: str = "0.0.0.0"
    backend_url: str = "http://localhost:8000"
    
    # Model config
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    vector_dimension: int = 384
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()