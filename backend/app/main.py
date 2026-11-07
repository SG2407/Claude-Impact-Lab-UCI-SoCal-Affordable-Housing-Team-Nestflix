from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session

from . import config
from .database import engine, init_db
from .routers import ai, buyers, contributions, finance, funding, projects
from .schemas import Health
from .seed import seed_all


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with Session(engine) as session:
        seed_all(session)
    yield


app = FastAPI(
    title="NestFlix API",
    version=config.APP_VERSION,
    description=(
        "Decision-support prototype for affordable-housing funding. SYNTHETIC demo data. "
        "Not legal, tax, financial, or lending advice."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/health", response_model=Health, tags=["meta"])
def health():
    return {"status": "ok", "application": config.APP_NAME, "version": config.APP_VERSION}


for r in (projects.router, contributions.router, finance.router, funding.router, buyers.router, ai.router):
    app.include_router(r)
