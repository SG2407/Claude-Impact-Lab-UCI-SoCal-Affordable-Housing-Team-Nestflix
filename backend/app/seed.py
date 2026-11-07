"""Idempotent seed: safe to run on every startup."""

import json

from sqlmodel import Session, select

from . import config
from .models import FundingProgram, Project, ProjectCostItem

SLUG = "synthetic-affordable-home-oc"

# SYNTHETIC ASSUMPTIONS from lanes/3-fund-it/data/synthetic-example-deal.json (a made-up deal).
COST_ITEMS = [
    ("land_and_building_purchase", "Land and building purchase", 360_000, "Lane 1 · Find it", "Invented."),
    ("time_costs_while_waiting", "Time costs while waiting", 85_000, "Lane 2 · Clear it", "Loan interest, property taxes, insurance and management while the project waits. Invented."),
    ("construction_and_repairs", "Construction and repairs", 40_000, "", "Invented."),
    ("fees_design_legal_sales", "Design, legal, fees and sales", 50_000, "", "Invented."),
    ("other_costs", "Other costs", 0, "", "Optional line, zero in the example deal."),
]


def seed_programs(session: Session) -> None:
    path = config.DATA_DIR / "funding_programs.json"
    programs = json.loads(path.read_text())["programs"]
    existing = {p.id for p in session.exec(select(FundingProgram)).all()}
    for p in programs:
        if p["id"] not in existing:
            session.add(FundingProgram(**p))
    session.commit()


def seed_project(session: Session) -> None:
    if session.exec(select(Project).where(Project.slug == SLUG)).first():
        return
    project = Project(
        slug=SLUG,
        name="Synthetic Affordable Home — Orange County",
        description=(
            "SYNTHETIC one-home example deal. Every number is an ASSUMPTION from the hackathon's "
            "made-up worked example, not a real project, address, parcel or buyer."
        ),
        location_label="Orange County, CA (synthetic; no real address)",
        housing_type="homeownership",
        units=1,
        status="pre-development (synthetic)",
        affordable_purchase_price=285_000,
        existing_public_subsidies=100_000,
        earned_revenue=55_000,
        synthetic=True,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    for key, label, amount, lane, note in COST_ITEMS:
        session.add(ProjectCostItem(project_id=project.id, key=key, label=label, amount=amount, lane=lane, note=note))
    session.commit()


def seed_all(session: Session) -> None:
    seed_project(session)
    seed_programs(session)
