"""
Shared fixtures for Nexus integration tests.

Environment variables:
  BASE_URL         — API base URL (default: http://localhost:5000/api)
  TEST_EMAIL       — login email  (default: alex.johnson@gmail.com)
  TEST_PASSWORD    — login pass   (default: password123)
  SKIP_CLOUD_ONLY  — skip cloud-dependent tests (default: true)
"""

import os
import pytest
import requests


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "cloud_only: test requires persistent cloud seed data — skip with SKIP_CLOUD_ONLY=true",
    )


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("BASE_URL", "http://localhost:5000/api")


@pytest.fixture(scope="session")
def skip_cloud(base_url):
    return os.environ.get("SKIP_CLOUD_ONLY", "true").lower() == "true"


@pytest.fixture(scope="session")
def auth_token(base_url):
    email = os.environ.get("TEST_EMAIL", "alex.johnson@gmail.com")
    password = os.environ.get("TEST_PASSWORD", "password123")
    resp = requests.post(
        f"{base_url}/auth/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    assert resp.status_code == 200, (
        f"Auth fixture: login failed ({resp.status_code}): {resp.text}"
    )
    return resp.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
