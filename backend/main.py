from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from api.routes import assess, geocode, alternatives, property_lookup

app = FastAPI(
    title="Palm Cove Property Assessor API",
    description="AI-powered Australian property assessment backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(assess.router, prefix="/api", tags=["Assessment"])
app.include_router(geocode.router, prefix="/api", tags=["Geocode"])
app.include_router(alternatives.router, prefix="/api", tags=["Alternatives"])
app.include_router(property_lookup.router, prefix="/api", tags=["Property Lookup"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness probe — returns service status."""
    return {"status": "ok", "version": "1.0.0"}
