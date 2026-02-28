"""
CLARA Configuration
All API keys and settings loaded from environment variables / .env file.
Copy .env.example to .env and fill in your keys.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional, List


class Settings(BaseSettings):
    # ── Alpha Vantage ──────────────────────────────────────────────────────────
    ALPHA_VANTAGE_API_KEY: str = "your_alpha_vantage_key_here"
    ALPHA_VANTAGE_BASE_URL: str = "https://www.alphavantage.co/query"
    ALPHA_VANTAGE_DAILY_LIMIT: int = 25  # Free tier: 25 req/day

    # ── Twelve Data ───────────────────────────────────────────────────────────
    TWELVEDATA_API_KEY: str = "your_twelvedata_key_here"
    TWELVEDATA_BASE_URL: str = "https://api.twelvedata.com"

    # ── Finnhub ───────────────────────────────────────────────────────────────
    FINNHUB_API_KEY: str = "your_finnhub_key_here"
    FINNHUB_BASE_URL: str = "https://finnhub.io/api/v1"

    # ── EmailJS (for browser-side email) ──────────────────────────────────────
    EMAILJS_SERVICE_ID: str = "your_service_id_here"
    EMAILJS_TEMPLATE_ID: str = "your_template_id_here"
    EMAILJS_PUBLIC_KEY: str = "your_public_key_here"

    # ── SendGrid (for server-side email) ─────────────────────────────────────
    SENDGRID_API_KEY: str = "your_sendgrid_key_here"
    SENDGRID_FROM_EMAIL: str = "CLARA@yourdomain.com"
    SENDGRID_FROM_NAME: str = "CLARA Alert Agent"

    # ── SMTP Fallback ────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "your_email@gmail.com"
    SMTP_PASSWORD: str = "your_app_password_here"
    SMTP_USE_TLS: bool = True

    # ── IBM watsonx ──────────────────────────────────────────────────────────
    WATSONX_API_KEY: str = "your_watsonx_key_here"
    WATSONX_PROJECT_ID: str = "your_project_id_here"
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    WATSONX_MODEL_ID: str = "ibm/granite-13b-instruct-v2"

    # ── IBM watsonx Orchestrate (Chat Agent) ───────────────────────────────
    WATSONX_ORCH_URL: Optional[str] = "https://api.dl.watson-orchestrate.ibm.com/instances/20260227-2133-1481-001c-589c57b894d7"
    WATSONX_ORCH_API_KEY: Optional[str] = "azE6dXNyX2I5MjY3NDEzLWNiODUtM2Q0Yy04ZDAzLWFlOWY3NjEwYTVlZTptYkVaeTVucGg5cExVazJEQ0FEekZ6UHVybWFnK1dCaWtiY0xXTGdqdkFFPTpocFRV"
    WATSONX_ORCH_AGENT_ID: Optional[str] = None
    WATSONX_ORCH_CHAT_PATH: str = "/v1/chat/completions"
    WATSONX_ORCH_TIMEOUT_SECONDS: int = 20

    # ── Google Gemini ─────────────────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    AI_PROVIDER: str = "auto"  # auto | gemini | watsonx
    AI_TIMEOUT_SECONDS: int = 20

    # ── IBM Watson Discovery ──────────────────────────────────────────────────
    WATSON_DISCOVERY_API_KEY: str = "your_watson_discovery_key_here"
    WATSON_DISCOVERY_URL: str = "https://api.us-south.discovery.watson.cloud.ibm.com"
    WATSON_DISCOVERY_ENV_ID: str = "your_environment_id_here"

    # ── App Settings ──────────────────────────────────────────────────────────
    APP_ENV: str = "development"             # development | production
    LOG_LEVEL: str = "INFO"
    ALERT_CHECK_INTERVAL_SECONDS: int = 30  # how often the agent polls prices
    ALERT_COOLDOWN_HOURS: int = 4           # minimum hours between same alerts
    MAX_PORTFOLIO_POSITIONS: int = 100
    MONTE_CARLO_PATHS: int = 10_000         # 10k default, up to 100k for production
    
    # ── VaR/ES Configuration ──────────────────────────────────────────────────
    VAR_CONFIDENCE_LEVELS: List[float] = [0.90, 0.95, 0.99]
    ES_CONFIDENCE_LEVELS: List[float] = [0.95, 0.99]
    VAR_TIME_HORIZONS: List[int] = [1, 10]  # days
    
    # ── Distribution Settings ─────────────────────────────────────────────────
    DISTRIBUTION_MODEL: str = "auto"  # auto | normal | student_t | lognormal | exponential
    ALLOW_MANUAL_DISTRIBUTION_OVERRIDE: bool = True
    
    # ── SEC EDGAR ─────────────────────────────────────────────────────────────
    SEC_EDGAR_USER_AGENT: str = "Clara-RiskPlatform contact@yourdomain.com"
    SEC_EDGAR_BASE_URL: str = "https://data.sec.gov"
    SEC_EDGAR_RATE_LIMIT: int = 10  # requests per second
    
    # ── Cap IQ (Phase 2 - Placeholder) ───────────────────────────────────────
    CAPIQ_API_KEY: Optional[str] = None
    CAPIQ_ENABLED: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
