"""Pure mortgage math. Money is Decimal; callers round at the edges."""

from decimal import Decimal, getcontext

getcontext().prec = 28

TWO_PLACES = Decimal("0.01")


def to_decimal(value) -> Decimal:
    return value if isinstance(value, Decimal) else Decimal(str(value))


def monthly_rate(annual_rate_pct) -> Decimal:
    return to_decimal(annual_rate_pct) / Decimal(100) / Decimal(12)


def monthly_payment(principal, annual_rate_pct, term_years) -> Decimal:
    """Standard amortizing payment: P*r*(1+r)^n / ((1+r)^n - 1); P/n when r == 0."""
    p = to_decimal(principal)
    n = int(to_decimal(term_years) * 12)
    if n <= 0:
        raise ValueError("term_years must be positive")
    if p <= 0:
        return Decimal(0)
    r = monthly_rate(annual_rate_pct)
    if r == 0:
        return p / n
    growth = (1 + r) ** n
    return p * r * growth / (growth - 1)


def max_principal(monthly_budget, annual_rate_pct, term_years) -> Decimal:
    """Inverse of monthly_payment for a fixed principal-and-interest budget."""
    b = to_decimal(monthly_budget)
    n = int(to_decimal(term_years) * 12)
    if n <= 0:
        raise ValueError("term_years must be positive")
    if b <= 0:
        return Decimal(0)
    r = monthly_rate(annual_rate_pct)
    if r == 0:
        return b * n
    growth = (1 + r) ** n
    return b * (growth - 1) / (r * growth)


def purchase_price_from_loan(loan, down_payment_pct) -> Decimal:
    """price = loan / (1 - down%). down_payment_pct must be in [0, 100)."""
    pct = to_decimal(down_payment_pct)
    if pct < 0 or pct >= 100:
        raise ValueError("down_payment_pct must be >= 0 and < 100")
    return to_decimal(loan) / (1 - pct / Decimal(100))
