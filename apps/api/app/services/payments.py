import stripe
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging_config import logger

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentService:
    async def create_stripe_checkout(self, user_email: str, user_id: str) -> Optional[str]:
        """Create a Stripe Checkout session and return the URL."""
        if not settings.STRIPE_SECRET_KEY:
            logger.warning("Stripe Secret Key not configured")
            return None
            
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': settings.STRIPE_PRO_PRICE_ID,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f"{settings.PAYSTACK_CALLBACK_URL}?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"http://localhost:3000/dashboard/user/upgrade",
                customer_email=user_email,
                metadata={
                    'user_id': user_id,
                    'plan': 'pro'
                }
            )
            return session.url
        except Exception as e:
            logger.error(f"Stripe Session Error: {e}")
            return None

    async def create_paystack_checkout(self, user_email: str, user_id: str) -> Optional[str]:
        """Create a Paystack Checkout session and return the URL."""
        if not settings.PAYSTACK_SECRET_KEY:
            logger.warning("Paystack Secret Key not configured")
            return None

        url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "email": user_email,
            "amount": "500000", # Example: 5000.00 in minor units (NGN/GHS/etc)
            "plan": settings.PAYSTACK_PRO_PLAN_CODE,
            "callback_url": settings.PAYSTACK_CALLBACK_URL,
            "metadata": {
                "user_id": user_id,
                "plan": "pro"
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                data = response.json()
                if data.get("status"):
                    return data["data"]["authorization_url"]
                else:
                    logger.error(f"Paystack Error: {data.get('message')}")
                    return None
            except Exception as e:
                logger.error(f"Paystack Request Error: {e}")
                return None

payment_service = PaymentService()
