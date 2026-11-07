from sqlmodel import Session, select

from app.database import engine
from app.models import FundingProgram, Project, ProjectCostItem
from app.seed import seed_all


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "application": "NestFlix", "version": "0.1.0"}


def test_projects_seeded(client):
    projects = client.get("/api/projects").json()
    assert len(projects) == 1
    p = projects[0]
    assert p["finance"]["total_cost"] == 535000
    assert p["finance"]["existing_funding"] == 440000
    assert p["finance"]["initial_gap"] == 95000
    assert p["synthetic"] is True


def test_invalid_project_id(client):
    assert client.get("/api/projects/999").status_code == 404
    assert client.get("/api/projects/999/contributions").status_code == 404
    assert client.post("/api/projects/999/contributions", json={"contributor_name": "x", "contributor_type": "donor", "amount": 5}).status_code == 404


def test_calculate_endpoint(client):
    r = client.post("/api/finance/calculate", json={
        "cost_items": {"a": 360000, "b": 85000, "c": 40000, "d": 50000},
        "affordable_buyer_price": 285000, "existing_public_subsidies": 100000, "earned_revenue": 55000,
        "proposed_additional_funding": 25000,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["initial_gap"] == 95000
    assert body["secured_gap"] == 95000
    assert body["scenario_gap"] == 70000


def test_calculate_rejects_negative(client):
    r = client.post("/api/finance/calculate", json={
        "total_development_cost": 535000, "affordable_buyer_price": -1,
        "existing_public_subsidies": 0, "earned_revenue": 0})
    assert r.status_code == 422


def test_negative_contribution_rejected(client):
    r = client.post("/api/projects/1/contributions", json={"contributor_name": "Donor", "contributor_type": "donor", "amount": -5})
    assert r.status_code == 422


def test_pledge_is_proposed_and_not_secured(client):
    r = client.post("/api/projects/1/contributions", json={"contributor_name": "Demo Donor", "contributor_type": "donor", "amount": 25000})
    assert r.status_code == 201
    assert r.json()["status"] == "proposed"
    f = client.get("/api/projects/1").json()["finance"]
    assert f["secured_gap"] == 95000
    assert f["scenario_gap"] == 70000


def test_full_scenario_and_confirmation_flow(client):
    for name, kind, amt in (("Demo Donor", "donor", 25000), ("Employer A", "employer", 40000), ("Demo Grant", "grant", 30000)):
        client.post("/api/projects/1/contributions", json={"contributor_name": name, "contributor_type": kind, "amount": amt})
    f = client.get("/api/projects/1").json()["finance"]
    assert f["scenario_gap"] == 0 and f["secured_gap"] == 95000
    first = client.get("/api/projects/1/contributions").json()[0]
    r = client.patch(f"/api/projects/1/contributions/{first['id']}", json={"status": "committed"})
    assert r.status_code == 200
    f = client.get("/api/projects/1").json()["finance"]
    assert f["secured_gap"] == 70000
    assert f["confirmed_additional_funding"] == 25000
    # no double counting: still 95k total pipeline+confirmed
    assert f["scenario_gap"] == 0 and f["funding_surplus"] == 0


def test_invalid_status_transition(client):
    c = client.post("/api/projects/1/contributions", json={"contributor_name": "D", "contributor_type": "donor", "amount": 10}).json()
    client.patch(f"/api/projects/1/contributions/{c['id']}", json={"status": "committed"})
    r = client.patch(f"/api/projects/1/contributions/{c['id']}", json={"status": "proposed"})
    assert r.status_code == 409
    assert client.delete(f"/api/projects/1/contributions/{c['id']}").status_code == 409


def test_scenario_overlay_does_not_persist(client):
    r = client.post("/api/projects/1/scenario", json={"extra_proposed": 25000})
    assert r.json()["finance"]["scenario_gap"] == 70000
    assert client.get("/api/projects/1").json()["finance"]["scenario_gap"] == 95000


def test_rate_sensitivity_endpoint(client):
    r = client.post("/api/finance/rate-sensitivity", json={
        "baseline_purchase_price": 285000, "baseline_rate": 7.18, "new_rate": 9.0, "loan_term_years": 30,
        "down_payment_pct": 5, "total_development_cost": 535000, "existing_public_subsidies": 100000, "earned_revenue": 55000})
    body = r.json()
    assert r.status_code == 200
    assert body["change_in_purchase_price"] < 0 and body["funding_gap_change"] > 0


def test_affordability_endpoint(client):
    hh = client.get("/api/buyers/demo-household").json()
    r = client.post("/api/finance/affordability", json={k: hh[k] for k in (
        "annual_income", "monthly_debt", "down_payment", "interest_rate", "loan_term_years", "annual_property_tax",
        "annual_insurance", "monthly_hoa", "other_monthly_housing")})
    assert r.status_code == 200
    assert r.json()["estimated_affordable_purchase_price"] > 0
    assert len(r.json()["rate_table"]) >= 4


def test_consortium(client):
    r = client.post("/api/finance/consortium", json={"project_id": 1, "employers": [
        {"name": "Employer A", "amount": 15000}, {"name": "Employer B", "amount": 25000}]})
    body = r.json()
    assert body["total_employer_contribution"] == 40000
    assert body["combined_scenario"]["scenario_gap"] == 55000


def test_funding_programs_leads_not_approvals(client):
    programs = client.get("/api/funding-programs").json()
    assert programs
    assert all(p["maximum_funding_if_verified"] is None or p["audience"] == "buyer" for p in programs)
    lihtc = next(p for p in programs if p["id"] == "lihtc")
    assert lihtc["match_status"] == "Not matched under known rules"
    assert all("availability" in " ".join(p["unresolved_checks"]).lower() or p["excluded_reason"] for p in programs)


def test_strategy_without_api_key(client):
    r = client.post("/api/ai/funding-strategy", json={"project_id": 1})
    assert r.status_code == 200
    body = r.json()
    assert body["generation_mode"] == "rule_based"
    assert body["finance"]["initial_gap"] == 95000
    assert body["next_steps"] and body["risks"]


def test_report_download(client):
    r = client.get("/api/projects/1/report")
    assert r.status_code == 200 and "Secured gap" in r.text


def test_seed_is_idempotent(client):
    with Session(engine) as s:
        seed_all(s)
        seed_all(s)
        assert len(s.exec(select(Project)).all()) == 1
        assert len(s.exec(select(ProjectCostItem)).all()) == 5
        n = len(s.exec(select(FundingProgram)).all())
        seed_all(s)
        assert len(s.exec(select(FundingProgram)).all()) == n
