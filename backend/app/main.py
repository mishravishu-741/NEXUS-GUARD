from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db, close_db
from app.routers import auth, users, devices, policies, security_events, threat_alerts, audit_logs, access_decisions, dashboard, monitoring

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting NEXUS GUARD...")
    await init_db()
    logger.info("Database initialized")

    # Create default admin user if not exists
    # Strategy: update existing admin email if needed, otherwise create new
    from app.core.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.models.mfa import MFAConfig
    from app.core.security import get_password_hash
    from sqlalchemy import select, or_

    async with AsyncSessionLocal() as db:
        # Try to find admin by the NEW email first
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        admin = result.scalar_one_or_none()

        if not admin:
            # Try to find admin by OLD email and update it (migration path)
            old_email = "admin@nexusguard.local"
            result = await db.execute(select(User).where(User.email == old_email))
            admin = result.scalar_one_or_none()

            if admin:
                # Migrate email from old to new
                admin.email = settings.ADMIN_EMAIL
                await db.commit()
                await db.refresh(admin)
                logger.info(f"Migrated admin email from {old_email} to {settings.ADMIN_EMAIL}")
            else:
                # Create new admin user
                admin = User(
                    email=settings.ADMIN_EMAIL,
                    username=settings.ADMIN_USERNAME,
                    full_name="System Administrator",
                    hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                    role=UserRole.ADMIN,
                    is_active=True,
                    is_verified=True
                )
                db.add(admin)
                await db.commit()
                await db.refresh(admin)
                logger.info(f"Default admin user created: {settings.ADMIN_EMAIL}")

        # Create MFA config for admin if not exists
        mfa_result = await db.execute(select(MFAConfig).where(MFAConfig.user_id == admin.id))
        mfa_config = mfa_result.scalar_one_or_none()

        if not mfa_config:
            mfa_config = MFAConfig(user_id=admin.id, allowed_methods='["totp", "backup_codes"]')
            db.add(mfa_config)
            await db.commit()
            logger.info(f"MFA config initialized for admin: {admin.email}")

    yield

    # Shutdown
    logger.info("Shutting down NEXUS GUARD...")
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Zero Trust Network Security System",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error" if not settings.DEBUG else str(exc)}
    )


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(devices.router)
app.include_router(policies.router)
app.include_router(security_events.router)
app.include_router(threat_alerts.router)
app.include_router(audit_logs.router)
app.include_router(access_decisions.router)
app.include_router(dashboard.router)
app.include_router(monitoring.router)


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Zero Trust Network Security System",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
