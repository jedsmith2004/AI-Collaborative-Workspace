from redis import Redis
import os
from dotenv import load_dotenv

load_dotenv()

def get_redis_connection():
    try:
        redis = Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            password=os.getenv("REDIS_PASSWORD"),
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        # Test connection
        redis.ping()
        return redis
    except Exception as e:
        print(f"Warning: Could not connect to Redis: {e}")
        return None