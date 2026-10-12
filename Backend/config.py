import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY","")
IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY","")
IMAGEKIT_PUBLIC_KEY = os.getenv("IMAGEKIT_PUBLIC_KEY","")
IMAGEKIT_URL_ENDPOINT = os.getenv("IMAGEKIT_URL_ENDPOINT","")

DATABASE_URL = "sqlite:///./thumbnailbuilder.db"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID","")
JWT_SECRET = os.getenv("JWT_SECRET","")

# set COOKIE_SECURE=true in production so the session cookie is only sent over HTTPS
COOKIE_SECURE = os.getenv("COOKIE_SECURE","false").lower() == "true"
