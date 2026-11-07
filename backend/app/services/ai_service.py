"""Funding strategy: Claude when ANTHROPIC_API_KEY is set, otherwise a deterministic rule-based report.

Claude never does arithmetic: it receives figures computed by the backend and may only
cite programs/URLs we pass in. Any failure falls back to the rule-based report.
"""

import json
import logging
from decimal import Decimal

from .. import config

log = logging.getLogger("nestflix.ai")

DISCLAIMER = (
    "Prototype for educational and planning purposes. Not legal, tax, financial, or lending advice. "
    "AI/rule-based output is not a financial authority; verify every program with its source."
)


def _money(v) -> str:
    return f"${float(Decimal(str(v))):,.0f}"


def rule_based_strategy(facts: dict) -> dict:
    fin = facts["finance"]
    programs = [p for p in facts["programs"] if p["excluded_reason"] is None and p["audience"] in ("developer", "donor", "employer")]
    summary = (
        f"SYNTHETIC project '{facts['project_name']}': total development cost {_money(fin['total_cost'])}; "
        f"existing sources (buyer price + public subsidies + earned revenue) {_money(fin['existing_funding'])}; "
        f"initial gap {_money(fin['initial_gap'])}. "
        f"Confirmed additional funding is {_money(fin['confirmed_additional_funding'])}, leaving a secured gap of "
        f"{_money(fin['secured_gap'])}. Proposed (hypothetical, unconfirmed) funding is "
        f"{_money(fin['proposed_additional_funding'])}, giving a scenario gap of {_money(fin['scenario_gap'])}."
    )
    if fin["scenario_gap"] == 0 and fin["initial_gap"] > 0:
        summary += " The scenario balances arithmetically, but no commitment is verified."

    opportunities = []
    for p in programs:
        if p["audience"] == "developer":
            rationale = "; ".join(p["why_it_may_fit"]) or "Listed as a candidate lead."
        else:
            rationale = "Placeholder for the contribution you are simulating; real commitments are required."
        opportunities.append({
            "id": p["id"], "name": p["name"], "funding_kind": p["funding_kind"], "rationale": rationale,
            "match_status": p["match_status"], "source_url": p["source_url"], "unresolved": p["unresolved_checks"][:4],
        })

    missing = [
        "Exact project city (city-level programs cannot be matched without it)",
        "Whether the project uses sweat-equity/self-help labor (affects HUD SHOP)",
        "Current availability, round dates and award limits for every program (none confirmed)",
        "Buyer household income versus each program's income limits (use the dated HCD tables)",
        "Real donor and employer commitment status and any gift restrictions",
    ]
    risks = [
        "Proposed funding does not reduce the secured gap until it is committed.",
        "Several programs are repayable loans or buyer-side assistance: do not count them as grants or double-count them as developer subsidy.",
        "Income limits are revised mid-year (HCD memo revised June 23, 2026) and differ by program; stale tables give wrong caps.",
        "Time costs grow while funding is assembled; delay can enlarge the gap.",
        "Program lists go stale (for example Dream For All availability is unconfirmed).",
    ]
    next_steps = [
        f"Treat the {_money(fin['secured_gap'])} secured gap as the number to close with documented commitments.",
        "Open each candidate program's source page and confirm availability, terms and deadlines before relying on it.",
        "Confirm the project's city and approach to narrow the candidate list.",
        "Move real donor/employer pledges from proposed to committed only after written commitment.",
        "Have a qualified housing finance professional review the stack before any decision.",
    ]
    sources = sorted({p["source_url"] for p in programs if p["source_url"]})
    return {
        "generation_mode": "rule_based",
        "generation_note": "Rule-based analysis generated from backend figures. This is not a live AI response.",
        "model": None,
        "summary": summary,
        "opportunities": opportunities,
        "assumptions": [
            "All project figures are SYNTHETIC ASSUMPTIONS from the hackathon example deal.",
            "Proposed donor/employer/grant amounts are hypothetical.",
            "Program details come from lanes/3-fund-it/data/DATA-SOURCES.md (checked 2026-11-06) and were not re-verified.",
        ],
        "missing_information": missing,
        "risks": risks,
        "next_steps": next_steps,
        "sources": sources,
    }


def _claude_prompt(facts: dict) -> str:
    allowed = [
        {k: p[k] for k in ("id", "name", "funding_kind", "match_status", "source_url", "restrictions", "eligibility_notes", "availability_status", "unresolved_checks")}
        for p in facts["programs"] if p["excluded_reason"] is None
    ]
    payload = {"project": facts["project_name"], "finance": facts["finance"], "programs": allowed}
    return (
        "You write a funding strategy for a nonprofit affordable-housing finance lead. "
        "All numbers below were computed by the backend. Do NOT recompute or invent numbers. "
        "All project data is SYNTHETIC. Rules: never invent grant amounts, deadlines, eligibility or availability; "
        "say 'unknown' when unknown; never claim funding is secured; distinguish confirmed vs proposed (hypothetical) funding; "
        "cite only the source_url values provided; no legal, tax or lending advice.\n"
        "Return ONLY a JSON object with keys: summary (string), opportunities (list of {id, rationale}) using only the provided program ids, "
        "assumptions (list of strings), missing_information (list), risks (list), next_steps (list).\n\n"
        f"DATA:\n{json.dumps(payload, default=str)}"
    )


def claude_strategy(facts: dict, fallback: dict) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=config.anthropic_api_key(), timeout=45.0)
    message = client.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": _claude_prompt(facts)}],
    )
    text = "".join(b.text for b in message.content if getattr(b, "type", "") == "text").strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):]
    data = json.loads(text[text.find("{"): text.rfind("}") + 1])

    by_id = {o["id"]: o for o in fallback["opportunities"]}
    opportunities = []
    for o in data.get("opportunities", []):
        base = by_id.get(o.get("id"))
        if base:  # drop anything Claude made up
            opportunities.append({**base, "rationale": str(o.get("rationale", base["rationale"]))})
    return {
        "generation_mode": "claude",
        "generation_note": f"Generated by Claude ({config.ANTHROPIC_MODEL}) from backend-computed figures. Review before relying on it.",
        "model": config.ANTHROPIC_MODEL,
        "summary": str(data["summary"]),
        "opportunities": opportunities or fallback["opportunities"],
        "assumptions": [str(x) for x in data.get("assumptions", fallback["assumptions"])],
        "missing_information": [str(x) for x in data.get("missing_information", fallback["missing_information"])],
        "risks": [str(x) for x in data.get("risks", fallback["risks"])],
        "next_steps": [str(x) for x in data.get("next_steps", fallback["next_steps"])],
        "sources": fallback["sources"],
    }


def generate_strategy(facts: dict) -> dict:
    fallback = rule_based_strategy(facts)
    if not config.anthropic_api_key():
        return fallback
    try:
        return claude_strategy(facts, fallback)
    except Exception as exc:  # never crash the demo because of the AI provider
        log.warning("Claude call failed, using rule-based fallback: %s", exc)
        fallback["generation_note"] = (
            "Rule-based analysis (Claude was configured but the call failed, so this is NOT a live AI response)."
        )
        return fallback
