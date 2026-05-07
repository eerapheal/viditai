"""
AutoCut AI — API v1 Router Bundle
Aggregates all endpoint routers under /api/v1
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.videos import router as videos_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.recreations import router as recreations_router
from app.api.v1.presets import router as presets_router
from app.api.v1.admin import router as admin_router
from app.api.v1.payments import router as payments_router

router = APIRouter()

router.include_router(auth_router,    prefix="/auth",    tags=["Auth"])
router.include_router(users_router,   prefix="/users",   tags=["Users"])
router.include_router(videos_router,  prefix="/videos",  tags=["Videos"])
router.include_router(jobs_router,    prefix="/jobs",    tags=["Jobs"])
router.include_router(recreations_router, prefix="/recreations", tags=["Recreations"])
router.include_router(presets_router, prefix="/presets", tags=["Presets"])
router.include_router(admin_router,   prefix="/admin",   tags=["Admin"])
router.include_router(payments_router, prefix="/payments", tags=["Payments"])
