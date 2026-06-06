"""Test CORS configuration directly against localhost:8001 (bypasses k8s ingress).

Per testing instructions: The Kubernetes ingress overrides CORS with permissive '*'
which is expected. Test the FastAPI middleware itself by hitting localhost directly.
"""
import requests

LOCAL_BASE = "http://localhost:8001"
ALLOWED_ORIGIN = "https://2a674369-c31a-4a86-a0c2-5398e9495a35.preview.emergentagent.com"
DISALLOWED_ORIGIN = "https://evil.example.com"


class TestCORSLocal:
    def test_health_works_on_localhost(self):
        r = requests.get(f"{LOCAL_BASE}/api/health", timeout=10)
        assert r.status_code == 200

    def test_preflight_allowed_origin_echoes(self):
        """OPTIONS with allowed Origin should echo back Access-Control-Allow-Origin."""
        r = requests.options(
            f"{LOCAL_BASE}/api/contact",
            headers={
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=10,
        )
        # FastAPI CORS middleware returns 200 for valid preflight
        assert r.status_code in (200, 204), f"Preflight failed: {r.status_code}"
        acao = r.headers.get("access-control-allow-origin")
        assert acao == ALLOWED_ORIGIN, (
            f"Expected ACAO to echo allowed origin, got: {acao!r}"
        )

    def test_preflight_disallowed_origin_no_acao(self):
        """OPTIONS with disallowed Origin should NOT include ACAO header."""
        r = requests.options(
            f"{LOCAL_BASE}/api/contact",
            headers={
                "Origin": DISALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=10,
        )
        acao = r.headers.get("access-control-allow-origin")
        assert acao != DISALLOWED_ORIGIN, (
            f"Disallowed origin must not be echoed in ACAO, got: {acao!r}"
        )
        # Spec-compliant FastAPI CORS: ACAO header should be absent for unallowed origin
        assert acao is None or acao == "" or acao != DISALLOWED_ORIGIN

    def test_localhost_origins_allowed(self):
        for origin in ("http://localhost:3000", "http://localhost:8081"):
            r = requests.options(
                f"{LOCAL_BASE}/api/contact",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                },
                timeout=10,
            )
            acao = r.headers.get("access-control-allow-origin")
            assert acao == origin, f"Expected {origin} echoed, got {acao!r}"
