"""Rule-based funding matcher. Unknown requirements stay unknown; nothing is 'approved'."""

from dataclasses import dataclass, field

UNIVERSAL_UNKNOWNS = [
    "Whether funds are currently available (availability not confirmed)",
    "Award size, deadlines and application window (not stated in our sources)",
    "Household/project income and other eligibility tests were not evaluated",
]


@dataclass
class MatchContext:
    project_type: str = "homeownership"
    state: str = "California"
    county: str = "Orange County, CA"
    city: str | None = None  # unknown in the synthetic deal
    known_types: set[str] = field(default_factory=lambda: {"homeownership"})
    incompatible_types: set[str] = field(default_factory=lambda: {"rental"})
    unknown_types: set[str] = field(default_factory=lambda: {"self-help", "rehab"})


def _types(program: dict) -> set[str]:
    return {t.strip() for t in (program.get("eligible_project_types") or "").split(",") if t.strip()}


def _geo_check(program_geo: str, ctx: MatchContext) -> tuple[str, str]:
    """Return (result, note) where result is match | unknown | exclude."""
    geo = (program_geo or "").strip()
    if not geo:
        return "unknown", "Program geography not stated in our sources"
    if geo in ("United States", "California"):
        return "match", f"Statewide/national program covers {ctx.county}"
    if geo == ctx.county:
        return "match", f"Program is limited to {geo}"
    if ctx.city is None:
        return "unknown", f"Program is limited to {geo}; the project's city is unknown"
    if geo.lower().startswith(ctx.city.lower()):
        return "match", f"Project is in {geo}"
    return "exclude", f"Program is limited to {geo}; project is in {ctx.city}"


def match_program(program: dict, ctx: MatchContext) -> dict:
    types = _types(program)
    unresolved: list[str] = []
    reasons: list[str] = []
    excluded_reason: str | None = None
    score = 0

    if types & ctx.known_types:
        score += 3
        reasons.append(f"Program type includes {ctx.project_type}")
        type_ok = True
    elif not types or types == {"unknown"}:
        score += 1
        unresolved.append("Whether this program covers homeownership projects was not confirmed")
        type_ok = False
    elif types & ctx.unknown_types:
        score += 1
        unresolved.append(
            "Applies only to " + ", ".join(sorted(types & ctx.unknown_types)) + " projects; the demo project's approach is not stated"
        )
        type_ok = False
    else:
        excluded_reason = f"Program is for {', '.join(sorted(types))}, not {ctx.project_type}"
        type_ok = False

    geo_result, geo_note = _geo_check(program.get("geography", ""), ctx)
    if geo_result == "exclude" and excluded_reason is None:
        excluded_reason = geo_note
    elif geo_result == "match":
        score += 2
        reasons.append(geo_note)
        geo_ok = True
    else:
        unresolved.append(geo_note)
        geo_ok = False

    if program.get("verification_status", "").upper().startswith("VERIFIED"):
        score += 1
    else:
        unresolved.append("Source is UNVERIFIED: treat as a lead only")
    if program.get("funding_kind") == "loan":
        unresolved.append("Repayable loan: not an unconditional grant")
    if program.get("synthetic"):
        unresolved.append("Demo placeholder: no real commitments exist")

    if excluded_reason:
        status = "Not matched under known rules"
    elif type_ok and geo_ok:
        status = "Possibly eligible"
    else:
        status = "More information required"

    return {
        **{k: program.get(k) for k in (
            "id", "name", "provider", "category", "audience", "funding_kind", "description", "source_url",
            "last_verified", "verification_status", "availability_status", "eligibility_notes", "restrictions",
            "eligible_project_types", "maximum_funding_if_verified", "synthetic",
        )},
        "match_status": status,
        "relevance_score": 0 if excluded_reason else score,
        "why_it_may_fit": reasons,
        "unresolved_checks": unresolved + UNIVERSAL_UNKNOWNS,
        "excluded_reason": excluded_reason,
        "amount_known": program.get("maximum_funding_if_verified") is not None,
    }


def match_programs(programs: list[dict], ctx: MatchContext | None = None, audience: str | None = None) -> list[dict]:
    ctx = ctx or MatchContext()
    results = [match_program(p, ctx) for p in programs if audience in (None, "", "all") or p.get("audience") == audience]
    # Matches first, then by score, then name for a stable order.
    results.sort(key=lambda r: (r["excluded_reason"] is not None, -r["relevance_score"], r["name"]))
    return results
