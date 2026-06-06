"""Billing / Stripe Checkout tests for Spartan Coaching."""
import os
import pytest
from pymongo import MongoClient


PREVIEW_ORIGIN = "https://coaching-ios-build.preview.emergentagent.com"


# ---------- POST /api/billing/checkout ----------
class TestCheckoutCreation:
    def test_checkout_coaching_30(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/billing/checkout",
            json={
                "package_id": "coaching_30",
                "origin_url": PREVIEW_ORIGIN,
                "customer_name": "QA Tester",
                "customer_email": "qa@example.com",
                "notes": "automated billing test",
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com/"), data["url"]
        assert isinstance(data["session_id"], str) and len(data["session_id"]) > 0

    def test_checkout_coaching_60(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/billing/checkout",
            json={"package_id": "coaching_60", "origin_url": PREVIEW_ORIGIN},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["url"].startswith("https://checkout.stripe.com/")

    def test_checkout_invalid_package(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/billing/checkout",
            json={"package_id": "bogus", "origin_url": PREVIEW_ORIGIN},
            timeout=20,
        )
        assert r.status_code == 400
        assert "Unknown package" in r.text

    def test_checkout_invalid_origin(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/billing/checkout",
            json={"package_id": "coaching_30", "origin_url": "ftp://bad"},
            timeout=20,
        )
        assert r.status_code == 400
        assert "Invalid origin_url" in r.text


# ---------- GET /api/billing/status/{session_id} ----------
class TestCheckoutStatus:
    def test_status_30(self, api_client, base_url):
        # create a session first
        r = api_client.post(
            f"{base_url}/api/billing/checkout",
            json={"package_id": "coaching_30", "origin_url": PREVIEW_ORIGIN},
            timeout=30,
        )
        assert r.status_code == 200
        sid = r.json()["session_id"]
        s = api_client.get(f"{base_url}/api/billing/status/{sid}", timeout=30)
        assert s.status_code == 200, s.text
        d = s.json()
        assert d["amount_total"] == 4000
        assert d["currency"].lower() == "usd"
        assert "payment_status" in d and "status" in d

    def test_status_60(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/billing/checkout",
            json={"package_id": "coaching_60", "origin_url": PREVIEW_ORIGIN},
            timeout=30,
        )
        assert r.status_code == 200
        sid = r.json()["session_id"]
        s = api_client.get(f"{base_url}/api/billing/status/{sid}", timeout=30)
        assert s.status_code == 200, s.text
        d = s.json()
        assert d["amount_total"] == 7000

    def test_status_bogus_session_no_500(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/billing/status/bogus_session_id", timeout=30)
        # acceptable: 502 (Stripe error) or 404 — just must NOT 500
        assert r.status_code != 500, f"got 500: {r.text}"
        assert r.status_code in (400, 404, 502), f"unexpected: {r.status_code} {r.text}"


# ---------- POST /api/webhook/stripe ----------
class TestStripeWebhook:
    def test_invalid_signature_400(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/webhook/stripe",
            data="{}",
            headers={"Stripe-Signature": "t=0,v1=bogus", "Content-Type": "application/json"},
            timeout=20,
        )
        assert r.status_code == 400, r.text


# ---------- DB persistence ----------
class TestPaymentTransactionsDB:
    def test_payment_transaction_persisted(self, api_client, base_url):
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME not set")
        r = api_client.post(
            f"{base_url}/api/billing/checkout",
            json={
                "package_id": "coaching_30",
                "origin_url": PREVIEW_ORIGIN,
                "customer_name": "QA DB Tester",
                "customer_email": "qa-db@example.com",
            },
            timeout=30,
        )
        assert r.status_code == 200
        sid = r.json()["session_id"]
        mclient = MongoClient(mongo_url)
        doc = mclient[db_name]["payment_transactions"].find_one({"session_id": sid})
        mclient.close()
        assert doc is not None, "payment_transactions record missing"
        assert doc["package_id"] == "coaching_30"
        # Stored as dollars (float) — Stripe SDK converts to cents at session time
        assert doc["amount"] == 40.0
        assert doc["status"] == "initiated"
        assert doc["payment_status"] == "unpaid"
        assert doc["email_sent"] is False
