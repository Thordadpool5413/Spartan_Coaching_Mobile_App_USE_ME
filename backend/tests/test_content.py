"""Tests for the new static content endpoints (testimonials, articles, podcasts, resources)."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://coaching-ios-build.preview.emergentagent.com").rstrip("/")


class TestTestimonials:
    def test_testimonials_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/content/testimonials", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "testimonials" in data and "caseStudies" in data
        ts = data["testimonials"]
        cs = data["caseStudies"]
        assert len(ts) == 3
        assert len(cs) == 3
        names = {t["name"] for t in ts}
        assert {"Sarah M.", "James T.", "Maria R."}.issubset(names)
        # required keys per item
        for t in ts:
            for k in ("id", "name", "title", "company", "quote", "outcome"):
                assert k in t and t[k]
        # specific case-study with 5 results
        territory = next((c for c in cs if "Territory Transformation" in c["title"]), None)
        assert territory is not None
        assert isinstance(territory["results"], list)
        assert len(territory["results"]) == 5


class TestArticles:
    def test_articles_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/content/articles", timeout=15)
        assert r.status_code == 200
        data = r.json()
        arts = data["articles"]
        assert len(arts) == 8
        titles = [a["title"] for a in arts]
        assert "The Real Reason Your Hospice Census Is Stuck" in titles
        assert "Stop Calling It a Cold Call" in titles
        for a in arts:
            for k in ("id", "title", "description", "linkedinUrl"):
                assert k in a and a[k]
            assert a["linkedinUrl"].startswith("https://www.linkedin.com")


class TestPodcasts:
    def test_podcasts_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/content/podcasts", timeout=15)
        assert r.status_code == 200
        data = r.json()
        pods = data["podcasts"]
        assert len(pods) == 10
        # numbered 1..10
        nums = sorted(p["episodeNumber"] for p in pods)
        assert nums == list(range(1, 11))
        ep1 = next(p for p in pods if p["episodeNumber"] == 1)
        assert ep1["title"] == "The First 90 Days: Building Your Territory From Scratch"
        for p in pods:
            for k in ("title", "description", "duration"):
                assert k in p and p[k]


class TestResources:
    def test_resources_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/content/resources", timeout=15)
        assert r.status_code == 200
        data = r.json()
        res = data["resources"]
        assert len(res) == 12
        titles = [x["title"] for x in res]
        for must in ("Cold Call Opening Script", "Sales Territory Analysis Template", "Medicare/Medicaid Hospice Regulations"):
            assert must in titles, f"missing resource: {must}"
        valid_categories = {"script", "template", "checklist", "guide"}
        for x in res:
            assert x["category"] in valid_categories, f"bad category: {x.get('category')}"
            for k in ("id", "title", "description", "category"):
                assert k in x and x[k]
