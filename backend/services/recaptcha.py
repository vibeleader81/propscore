"""
reCAPTCHA v3 verification service.

If RECAPTCHA_SECRET_KEY is not configured the check is skipped —
this allows local dev and staging to work without a key.
"""

import httpx

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
MIN_SCORE = 0.5   # 0.0 = definitely bot, 1.0 = definitely human


async def verify_token(token: str | None, secret_key: str | None) -> tuple[bool, float]:
    """
    Returns (passed: bool, score: float).
    Passes automatically (True, 1.0) when secret_key is not configured.
    """
    if not secret_key:
        return True, 1.0

    if not token:
        return False, 0.0

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                VERIFY_URL,
                data={"secret": secret_key, "response": token},
            )
            data = resp.json()

        success: bool = data.get("success", False)
        score: float = float(data.get("score", 0.0))
        action: str = data.get("action", "")

        # Must be the correct action and score above threshold
        if success and score >= MIN_SCORE and action == "assess":
            return True, score

        return False, score

    except Exception:
        # Network error verifying — fail open in prod to avoid blocking real users
        # Change to `return False, 0.0` for stricter enforcement
        return True, 0.0
