import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://coaching-ios-build.preview.emergentagent.com").rstrip("/")
# Load backend .env so MONGO_URL/DB_NAME are available for DB-verification tests
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv("/app/backend/.env")
except Exception:
    pass


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
