from redis import Redis
import os
from dotenv import load_dotenv

load_dotenv()

def get_redis_connection():
    return Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASSWORD"),
        decode_responses=True
    )