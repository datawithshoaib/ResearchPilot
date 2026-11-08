"""Verifies Supabase Auth access tokens.

Projects on Supabase's asymmetric signing keys (ES256/RS256) are verified against
the project's public JWKS; projects still on the legacy shared secret (HS256) need
`SUPABASE_JWT_SECRET`.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import jwt
from jwt import PyJWKClient

from app.core.config import Settings

logger = logging.getLogger(__name__)

ASYMMETRIC_ALGORITHMS = ["ES256", "RS256", "EdDSA"]


class AuthError(Exception):
    """Raised when a token is missing, malformed, expired, or untrusted."""


@dataclass(frozen=True, slots=True)
class AuthUser:
    id: str
    email: str | None = None


class SupabaseTokenVerifier:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_base_url:
            raise AuthError("SUPABASE_URL is not configured on the server.")
        self._issuer = f"{settings.supabase_base_url}/auth/v1"
        self._audience = settings.supabase_jwt_audience
        self._secret = settings.supabase_jwt_secret
        # Caches keys and refetches on an unknown `kid` (key rotation).
        self._jwks = PyJWKClient(f"{self._issuer}/.well-known/jwks.json", cache_keys=True, lifespan=3600)

    def verify(self, token: str) -> AuthUser:
        try:
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg")
            if algorithm == "HS256":
                if not self._secret:
                    raise AuthError("This project signs tokens with HS256; set SUPABASE_JWT_SECRET.")
                key: object = self._secret
                algorithms = ["HS256"]
            elif algorithm in ASYMMETRIC_ALGORITHMS:
                key = self._jwks.get_signing_key_from_jwt(token).key
                algorithms = [algorithm]
            else:
                raise AuthError("Unsupported token algorithm.")

            claims = jwt.decode(
                token,
                key,
                algorithms=algorithms,
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["exp", "sub"]},
            )
        except AuthError:
            raise
        except jwt.PyJWTError as exc:
            raise AuthError("Your session is invalid or has expired. Please sign in again.") from exc

        return AuthUser(id=str(claims["sub"]), email=claims.get("email"))
