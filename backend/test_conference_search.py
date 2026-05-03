import app as app_module


class _FakeResponse:
    ok = True

    def raise_for_status(self):
        return None

    def json(self):
        return {
            "search_metadata": {"id": "search-1"},
            "search_parameters": {"q": "AI conference in Chicago"},
            "events_results": [
                {
                    "title": "Applied AI Summit",
                    "date": {"when": "May 20, 2026"},
                    "address": ["Chicago, IL"],
                    "venue": {"name": "McCormick Place"},
                    "description": "AI leaders and builders meet in Chicago.",
                    "link": "https://example.com/ai-summit",
                    "thumbnail": "https://example.com/thumb.jpg",
                }
            ],
        }


def test_conference_search_normalizes_serpapi_response(monkeypatch):
    monkeypatch.setenv("SERPAPI_API_KEY", "test-key")
    app_module._conference_search_cache.clear()

    def fake_get(url, params, timeout):
        assert url == "https://serpapi.com/search.json"
        assert params["engine"] == "google_events"
        assert params["q"] == "AI conference in Chicago"
        assert params["api_key"] == "test-key"
        assert timeout == 10
        return _FakeResponse()

    monkeypatch.setattr(app_module.requests, "get", fake_get)

    client = app_module.app.test_client()
    response = client.get("/api/conferences/search?location=Chicago&field=AI")
    body = response.get_json()

    assert response.status_code == 200
    assert len(body) == 1
    conference = body[0]
    assert conference["name"] == "Applied AI Summit"
    assert conference["title"] == "Applied AI Summit"
    assert conference["date"] == "May 20, 2026"
    assert conference["venue"] == "McCormick Place"
    assert conference["address"] == "Chicago, IL"
    assert conference["link"] == "https://example.com/ai-summit"
    assert conference["source"] == "serpapi"


def test_conference_search_falls_back_without_serpapi_key(monkeypatch):
    monkeypatch.delenv("SERPAPI_API_KEY", raising=False)
    app_module._conference_search_cache.clear()

    client = app_module.app.test_client()
    response = client.get("/api/conferences/search?location=Boston&field=cybersecurity")
    body = response.get_json()

    assert response.status_code == 200
    assert len(body) == 3
    assert body[0]["source"] == "fallback"
    assert body[0]["address"] == "Boston"
