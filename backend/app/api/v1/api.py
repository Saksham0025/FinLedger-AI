"""Aggregated API v1 router."""

from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.transfers import router as transfers_router
from app.api.v1.audit import router as audit_router
from app.api.v1.fraud import router as fraud_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(accounts_router)
api_router.include_router(transfers_router)
api_router.include_router(audit_router)
api_router.include_router(fraud_router)
