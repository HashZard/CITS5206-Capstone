# -*- coding: utf-8 -*-
# Redis 客户端（可选）
import redis
from app.core.config import settings

def get_redis():
    return redis.from_url(settings.redis_url, decode_responses=True)
