import sys
import os

# Add backend directory to sys.path so all bare imports in main.py resolve:
# "from config import settings", "from api.routes import assess", etc.
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

from main import app  # noqa: E402 — must come after sys.path manipulation

__all__ = ['app']
