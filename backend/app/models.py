from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Project(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    name: str
    description: str
    location_label: str
    housing_type: str
    units: int = 1
    status: str = "pre-development"
    affordable_purchase_price: int  # whole US dollars
    existing_public_subsidies: int
    earned_revenue: int
    synthetic: bool = True


class ProjectCostItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    key: str
    label: str
    amount: int
    lane: str = ""
    label_status: str = "ASSUMPTION"
    note: str = ""


class FundingProgram(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    provider: str
    category: str
    description: str
    source_url: str | None = None
    last_verified: str | None = None
    verification_status: str = "UNVERIFIED"
    availability_status: str = "Availability not confirmed"
    eligibility_notes: str = ""
    restrictions: str = ""
    eligible_project_types: str = ""  # comma-separated
    audience: str = "developer"  # developer | buyer | donor | employer
    funding_kind: str = "grant"  # grant | loan | buyer_assistance | philanthropic | employer
    geography: str = ""  # "" = unknown / not stated
    maximum_funding_if_verified: str | None = None
    synthetic: bool = False


class Contribution(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    contributor_name: str
    contributor_type: str  # donor | employer | grant | other
    amount: int
    funding_category: str  # donor | employer | grant | other
    status: str = "proposed"  # proposed | applied | committed | disbursed
    synthetic: bool = True
    created_at: datetime = Field(default_factory=_now)
