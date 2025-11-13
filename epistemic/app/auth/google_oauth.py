"""
Google OAuth 2.0 authentication
"""

from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from ..config import get_settings

settings = get_settings()

# OAuth configuration
config = Config(environ={
    "GOOGLE_CLIENT_ID": settings.google_client_id,
    "GOOGLE_CLIENT_SECRET": settings.google_client_secret,
})

oauth = OAuth(config)

# Register Google OAuth
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)


def get_google_oauth():
    """Get Google OAuth client"""
    return oauth.google
