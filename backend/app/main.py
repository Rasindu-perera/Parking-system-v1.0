from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routers import auth, admin
from .routers.admin_fee import fee as admin_fee
from .routers import controller as controller_router
from .routers import controller_sessions as controller_sessions_router
from .routers import entry as entry_router
from .routers import payments as payments_router
from .routers import receipts as receipts_router
from .routers import admin_spots as admin_spots_router
from .routers import accountant_reports as accountant_reports_router
from .routers import camera as camera_router
from .routers import rfid_accounts as rfid_accounts_router
from .routers import admin_users as admin_users_router
from .routers import mobile_api as mobile_api_router
from .db.database import engine
from .db import models

# Create tables on startup (simple bootstrap; replace with Alembic for prod)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    models.Base.metadata.create_all(bind=engine)
    yield
    # Shutdown (if needed)

app = FastAPI(title="Parking System API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(admin_fee.router, prefix="/admin/fees", tags=["fees"])
app.include_router(admin_users_router.router, prefix="/admin", tags=["admin-users"])
app.include_router(mobile_api_router.router, tags=["mobile"])
app.include_router(controller_router.router, prefix="/controller", tags=["controller"])
app.include_router(controller_sessions_router.router, prefix="/controller", tags=["controller-sessions"])
app.include_router(entry_router.router, prefix="/entry", tags=["entry"])
app.include_router(payments_router.router, prefix="/payments", tags=["payments"])
app.include_router(receipts_router.router, tags=["receipts"])
app.include_router(admin_spots_router.router, prefix="/admin/spots", tags=["admin-spots"])
app.include_router(camera_router.router, prefix="/camera", tags=["camera"])
app.include_router(rfid_accounts_router.router)

# Simple health check endpoints
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/db")
def health_db():
    try:
        # Simple connection check
        with engine.connect() as conn:
            # Use driver-level SQL to avoid type issues
            conn.exec_driver_sql("SELECT 1")
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "detail": str(e)}
app.include_router(accountant_reports_router.router, prefix="/accountant", tags=["reports"])

@app.get("/")
def root():
    return {"status": "ok"}
