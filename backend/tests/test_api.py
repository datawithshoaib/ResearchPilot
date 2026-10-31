import json

from conftest import wait_for_status

TOPIC = {"topic": "How do fake LLMs behave in tests?", "max_analysts": 2, "max_num_turns": 1}


def test_health_reports_configuration(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["configured"] is True
    assert body["active_jobs"] == 0


def test_full_research_flow(client):
    job = client.post("/api/research", json=TOPIC).json()
    assert job["status"] == "generating_analysts"

    job = wait_for_status(client, job["thread_id"], "awaiting_feedback")
    assert [a["name"] for a in job["analysts"]] == ["Analyst 0", "Analyst 1"]

    resumed = client.post(f"/api/research/{job['thread_id']}/resume", json={"feedback": None})
    assert resumed.status_code == 200
    assert resumed.json()["status"] == "researching"

    job = wait_for_status(client, job["thread_id"], "completed", "failed")
    assert job["status"] == "completed", job["error"]
    assert job["final_report"].startswith("# Title")
    assert "## Sources" in job["final_report"]
    assert job["sections_count"] == job["total_sections"] == 2
    assert {s["url"] for s in job["sources"]} == {"https://a.test", "https://b.test"}
    assert all(p["done"] and p["searches"] == 1 for p in job["progress"])

    kinds = {event["kind"] for event in job["activity"]}
    assert {"analysts", "question", "search", "sources", "answer", "section", "writing"} <= kinds


def test_feedback_regenerates_panel(client):
    job = client.post("/api/research", json=TOPIC).json()
    wait_for_status(client, job["thread_id"], "awaiting_feedback")

    resumed = client.post(f"/api/research/{job['thread_id']}/resume", json={"feedback": "Add a skeptic"})
    assert resumed.json()["status"] == "generating_analysts"
    job = wait_for_status(client, job["thread_id"], "awaiting_feedback")
    assert len(job["analysts"]) == 2


def test_resume_conflict_and_not_found(client):
    assert client.get("/api/research/missing").status_code == 404
    assert client.post("/api/research/missing/resume", json={}).status_code == 404

    job = client.post("/api/research", json=TOPIC).json()
    job = wait_for_status(client, job["thread_id"], "awaiting_feedback")
    client.post(f"/api/research/{job['thread_id']}/cancel")
    assert client.post(f"/api/research/{job['thread_id']}/resume", json={}).status_code == 409


def test_cancel_marks_job_cancelled(client):
    job = client.post("/api/research", json=TOPIC).json()
    cancelled = client.post(f"/api/research/{job['thread_id']}/cancel").json()
    assert cancelled["status"] == "cancelled"
    assert client.get(f"/api/research/{job['thread_id']}").json()["status"] == "cancelled"


def test_capacity_limit(make_client):
    client = make_client(max_active_jobs=0)
    response = client.post("/api/research", json=TOPIC)
    assert response.status_code == 429


def test_validation_rejects_short_topic(client):
    assert client.post("/api/research", json={"topic": "short"}).status_code == 422


def test_stream_emits_job_events_until_terminal(client):
    job = client.post("/api/research", json=TOPIC).json()
    thread_id = job["thread_id"]
    wait_for_status(client, thread_id, "awaiting_feedback")
    client.post(f"/api/research/{thread_id}/resume", json={})

    statuses, event_ids = [], []
    with client.stream("GET", f"/api/research/{thread_id}/stream") as response:
        assert response.headers["content-type"].startswith("text/event-stream")
        event = None
        for line in response.iter_lines():
            if line.startswith("event: "):
                event = line.removeprefix("event: ")
            elif line.startswith("data: ") and event == "job":
                payload = json.loads(line.removeprefix("data: "))
                statuses.append(payload["status"])
                event_ids.extend(e["id"] for e in payload["activity"])
            elif line.startswith("data: ") and event == "end":
                break

    assert statuses[-1] == "completed"
    # Each frame carries only events the client has not seen yet.
    assert event_ids == sorted(set(event_ids))


def test_rate_limit_errors_are_explained(client, monkeypatch):
    from researchpilot.graph import nodes

    class RateLimitError(Exception):
        pass

    def rate_limited_llm():
        raise RateLimitError("Error code: 429 - Rate limit reached for model")

    monkeypatch.setattr(nodes, "get_llm", rate_limited_llm)

    job = client.post("/api/research", json=TOPIC).json()
    job = wait_for_status(client, job["thread_id"], "failed")
    assert "rate limit" in job["error"].lower()
    assert "429" not in job["error"]
