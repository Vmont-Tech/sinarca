import os

from dotenv import load_dotenv

try:
    load_dotenv()
except ImportError:
    pass

SECRET_KEY = os.getenv("SECRET_KEY")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
ADMIN_ROLE = os.getenv("ADMIN_ROLE")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FACES_LOCAL = os.path.join(BASE_DIR, "data", "faces")
FACES_PROCESSED_LOCAL = os.path.join(BASE_DIR, "data", "faces_processed")

if __name__ == '__main__':
    pass