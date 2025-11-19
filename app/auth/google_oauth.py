"""
Google OAuth configuration
"""

from authlib.integrations.starlette_client import OAuth
from app.config import get_settings

settings = get_settings()

# Initialize OAuth
oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def get_google_oauth():
    """Get configured Google OAuth client"""
    return oauth.google
