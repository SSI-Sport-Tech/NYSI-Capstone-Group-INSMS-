from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration."""
    
    # OpenAI API
    openai_api_key: str
    
    # Service Configuration
    service_port: int = 8001
    service_host: str = "0.0.0.0"
    backend_url: str = "http://localhost:8000"
    
    # ML Configuration
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    vector_dimension: int = 384
    
    # Database Configuration (for webscraper)
    pghost: Optional[str] = "localhost"
    pgport: Optional[str] = "5432"
    pgdatabase: Optional[str] = "nysi_db"
    pguser: Optional[str] = None
    pgpassword: Optional[str] = None
    pgsslmode: str = "prefer"
    
    # Webscraper Configuration
    scraper_version: str = "0.7"
    max_scrape_pages: int = 10
    selenium_headless: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()