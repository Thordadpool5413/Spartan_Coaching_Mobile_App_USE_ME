"""Spartan Coaching backend test suite - covers all endpoints."""
import datetime as dt
import uuid
import pytest


# ---------- Health & Method ----------
class TestHealthAndMethod:
    def test_health(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/health", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "timestamp" in data

    def test_method(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/method", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert len(data["pillars"]) == 3
        assert len(data["subjects"]) == 4
        assert len(data["fundamentals"]) == 5
        assert len(data["ethics"]) == 6


# ---------- Drills ----------
class TestDrills:
    def test_drills_today(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/drills/today", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "index" in d and "category" in d and "drill" in d and "dateKey" in d
        # validate YYYY-MM-DD
        dt.date.fromisoformat(d["dateKey"])

    def test_drills_all(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/drills/all", timeout=20)
        assert r.status_code == 200
        drills = r.json()["drills"]
        assert len(drills) == 40
        assert drills[0]["index"] == 0

    def test_drill_streak_flow(self, api_client, base_url):
        device = f"TEST-{uuid.uuid4()}"
        today = dt.date.today().isoformat()
        # Initial - no completions -> streak 0 via stats endpoint
        r0 = api_client.get(f"{base_url}/api/drills/stats/{device}", timeout=20)
        assert r0.status_code == 200
        assert r0.json()["streak"] == 0
        assert r0.json()["totalCompleted"] == 0
        # Complete today
        r1 = api_client.post(
            f"{base_url}/api/drills/complete",
            json={"deviceId": device, "drillIndex": 0, "dateKey": today},
            timeout=20,
        )
        assert r1.status_code == 200
        s1 = r1.json()
        assert s1["streak"] == 1
        assert s1["totalCompleted"] == 1
        assert isinstance(s1["completions"], list) and len(s1["completions"]) == 1
        assert len(s1["heatmap"]) == 90
        # GET stats matches
        r2 = api_client.get(f"{base_url}/api/drills/stats/{device}", timeout=20)
        assert r2.status_code == 200
        s2 = r2.json()
        assert s2["streak"] == 1
        assert s2["totalCompleted"] == 1


# ---------- Knowledge ----------
class TestKnowledge:
    def test_knowledge_all(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/knowledge", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert len(data["entries"]) >= 40
        assert isinstance(data["categories"], list) and len(data["categories"]) > 0

    def test_knowledge_query_fast(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/knowledge", params={"q": "fast"}, timeout=20)
        assert r.status_code == 200
        entries = r.json()["entries"]
        assert any("FAST" in e["term"].upper() for e in entries)

    def test_knowledge_query_medicare_case_insensitive(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/knowledge", params={"q": "medicare"}, timeout=20)
        assert r.status_code == 200
        entries = r.json()["entries"]
        assert any("medicare" in e["term"].lower() for e in entries)

    def test_knowledge_category_filter(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/knowledge", params={"category": "Compliance"}, timeout=20)
        assert r.status_code == 200
        entries = r.json()["entries"]
        assert len(entries) > 0
        assert all(e["category"].lower() == "compliance" for e in entries)


# ---------- Roleplay scenarios (non-AI) ----------
class TestRoleplayScenarios:
    def test_scenarios_list(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/roleplay/scenarios", timeout=20)
        assert r.status_code == 200
        ids = {s["id"] for s in r.json()["scenarios"]}
        required = {
            "cold_call_snf", "physician_objection", "family_consultation",
            "hospital_discharge", "assisted_living_admin", "competitor_territory",
        }
        assert required.issubset(ids), f"Missing: {required - ids}"


# ---------- AI Endpoints ----------
class TestAIEndpoints:
    def test_ask(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/ask", json={"question": "What is the FAST scale?"}, timeout=120)
        assert r.status_code == 200, r.text
        text = r.json()["response"]
        assert isinstance(text, str) and len(text) > 100

    def test_chat(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/chat",
            json={"prompt": "How do I handle a physician who is hesitant to refer?", "conversationHistory": []},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        assert len(r.json()["response"]) > 50

    def test_objection(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/tools/objection",
            json={"objection": "We already have a hospice provider"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        text = r.json()["response"].lower()
        # Mentions any of the three angles
        assert any(k in text for k in ["clinical", "empath", "practical"])

    def test_playbook(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/tools/playbook",
            json={
                "scenario": "First visit with a SNF DON",
                "referralSourceType": "SNF",
                "goal": "Recurring education slot",
            },
            timeout=180,
        )
        assert r.status_code == 200, r.text
        assert len(r.json()["response"]) > 200

    def test_roleplay_turn(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/roleplay/turn",
            json={
                "scenarioId": "cold_call_snf",
                "userMessage": "Hi, do you have a minute to talk about hospice services?",
                "history": [],
            },
            timeout=120,
        )
        assert r.status_code == 200, r.text
        assert len(r.json()["response"]) > 5

    def test_roleplay_turn_invalid_scenario(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/roleplay/turn",
            json={"scenarioId": "nonexistent_scenario", "userMessage": "hi", "history": []},
            timeout=20,
        )
        assert r.status_code == 404

    def test_roleplay_feedback(self, api_client, base_url):
        transcript = [
            {"role": "user", "content": "Hi, do you have a minute?"},
            {"role": "model", "content": "Im really busy right now."},
            {"role": "user", "content": "I just need 2 minutes to introduce myself and leave you with some info on our outcomes."},
            {"role": "model", "content": "Fine, two minutes."},
        ]
        r = api_client.post(
            f"{base_url}/api/roleplay/feedback",
            json={"scenarioId": "cold_call_snf", "transcript": transcript},
            timeout=180,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "feedback" in data and isinstance(data["feedback"], str) and len(data["feedback"]) > 50
        assert isinstance(data["rating"], int) and 1 <= data["rating"] <= 10

    def test_ai_long_input(self, api_client, base_url):
        long_q = ("Explain hospice eligibility for various diagnoses. " * 30)[:1900]
        r = api_client.post(f"{base_url}/api/ask", json={"question": long_q}, timeout=180)
        assert r.status_code == 200, r.text


# ---------- Contact ----------
class TestContact:
    def test_contact_valid(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/contact",
            json={
                "name": "QA Tester",
                "email": "qa@example.com",
                "message": "Testing the iOS app contact form integration end to end",
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        assert data["email_sent"] is True

    def test_contact_validation_error(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/contact", json={"name": "x"}, timeout=20)
        assert r.status_code == 422


# ---------- Eligibility Quick Check ----------
class TestEligibility:
    def test_eligibility_likely_dementia(self, api_client, base_url):
        """Strong indicators + FAST 7A + age 86 should return LIKELY with LCD/FAST mention."""
        payload = {
            "diagnosis": "Dementia / Alzheimer's",
            "age": 86,
            "indicators": [
                "Weight loss > 10% in 6 months",
                "Recurrent infections (UTI, pneumonia, sepsis)",
                "Decreased oral intake / dysphagia",
            ],
            "functionalScale": "FAST",
            "functionalScore": "7A",
            "recentEvents": "Two hospitalizations in past 4 months for sepsis",
        }
        r = api_client.post(f"{base_url}/api/eligibility/assess", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["verdict"] == "LIKELY", f"Expected LIKELY but got {data['verdict']}; summary={data['summary'][:300]}"
        summary = data["summary"]
        assert isinstance(summary, str) and len(summary) > 200
        low = summary.lower()
        assert "fast" in low, "Summary should mention FAST scale"
        assert "lcd" in low or "medicare" in low, "Summary should mention LCD or Medicare guidelines"

    def test_eligibility_weak_chf_not_likely(self, api_client, base_url):
        """Weak inputs (1 vague indicator, age 60, NYHA III) should NOT be LIKELY."""
        payload = {
            "diagnosis": "CHF / Heart Failure",
            "age": 60,
            "indicators": ["Goals of care shifting toward comfort"],
            "functionalScale": "NYHA",
            "functionalScore": "Class III",
        }
        r = api_client.post(f"{base_url}/api/eligibility/assess", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["verdict"] in ("POSSIBLE", "NOT_YET"), f"Expected POSSIBLE or NOT_YET, got {data['verdict']}"
        assert len(data["summary"]) > 100

    def test_eligibility_empty_indicators_still_works(self, api_client, base_url):
        """Minimal payload with just diagnosis should still 200 with a valid verdict."""
        payload = {"diagnosis": "Cancer"}
        r = api_client.post(f"{base_url}/api/eligibility/assess", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["verdict"] in ("LIKELY", "POSSIBLE", "NOT_YET")
        assert isinstance(data["summary"], str) and len(data["summary"]) > 50

    def test_eligibility_missing_diagnosis_422(self, api_client, base_url):
        """Missing required diagnosis -> Pydantic 422."""
        r = api_client.post(f"{base_url}/api/eligibility/assess", json={"age": 70}, timeout=20)
        assert r.status_code == 422

    def test_eligibility_persists_anonymously(self, api_client, base_url):
        """Verify record is inserted in eligibility_checks with no PII fields."""
        import os
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME not set")
        mclient = MongoClient(mongo_url)
        coll = mclient[db_name]["eligibility_checks"]
        before = coll.count_documents({})

        unique_dx = f"Cancer-{uuid.uuid4().hex[:6]}"
        r = api_client.post(
            f"{base_url}/api/eligibility/assess",
            json={"diagnosis": unique_dx, "indicators": ["a", "b"]},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        after = coll.count_documents({})
        assert after == before + 1, f"Expected 1 new record, got delta {after - before}"

        doc = coll.find_one({"diagnosis": unique_dx})
        assert doc is not None
        # Required anonymous fields
        assert "verdict" in doc and doc["verdict"] in ("LIKELY", "POSSIBLE", "NOT_YET")
        assert doc.get("indicators_count") == 2
        assert "created_at" in doc
        # No PII fields
        forbidden = {"name", "email", "phone", "age", "patient_name", "patient_id", "recentEvents", "notes"}
        leaked = forbidden.intersection(set(doc.keys()))
        assert not leaked, f"PII fields leaked into eligibility_checks: {leaked}"
        mclient.close()
