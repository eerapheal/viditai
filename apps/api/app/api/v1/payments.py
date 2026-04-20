from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import stripe

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User, Plan
from app.services.payments import payment_service
from app.core.config import settings
from app.core.logging_config import logger

router = APIRouter()

@router.post("/checkout/{gateway}")
async def create_checkout(
    gateway: str,
    current_user: User = Depends(get_current_user),
):
    """Initiate a checkout session for Stripe or Paystack."""
    if gateway == "stripe":
        url = await payment_service.create_stripe_checkout(current_user.email, current_user.id)
    elif gateway == "paystack":
        url = await payment_service.create_paystack_checkout(current_user.email, current_user.id)
    else:
        raise HTTPException(status_code=400, detail="Invalid gateway")

    if not url:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

    return {"checkout_url": url}

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe Webhooks (Success/Subscription updates)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        logger.error(f"Stripe Webhook Signature Error: {e}")
        return {"status": "error"}

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('metadata', {}).get('user_id')
        if user_id:
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.plan = Plan.PRO
                await db.commit()
                logger.info(f"User {user_id} upgraded to PRO via Stripe")

    return {"status": "success"}

@router.post("/webhook/paystack")
async def paystack_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Paystack Webhooks."""
    # Simplified validation: in production, verify the x-paystack-signature header
    payload = await request.json()
    
    if payload.get("event") == "charge.success":
        user_id = payload.get("data", {}).get("metadata", {}).get("user_id")
        if user_id:
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.plan = Plan.PRO
                await db.commit()
                logger.info(f"User {user_id} upgraded to PRO via Paystack")

    return {"status": "success"}
