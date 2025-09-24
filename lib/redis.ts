// Redis connection utility for Upstash Redis
import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedisClient() {
  if (!redis) {
    const restUrl = process.env.KV_REST_API_URL
    const restToken = process.env.KV_REST_API_TOKEN
    
    if (!restUrl || !restToken) {
      console.warn('Redis credentials not found. Redis features will be disabled.')
      return null
    }
    
    redis = new Redis({
      url: restUrl,
      token: restToken,
    })
  }
  
  return redis
}

// Redis operations for caching and real-time features
export async function setCache(key: string, value: any, ttlSeconds: number = 3600) {
  const client = getRedisClient()
  if (!client) return false
  
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value))
    return true
  } catch (error) {
    console.error('Redis set error:', error)
    return false
  }
}

export async function getCache(key: string) {
  const client = getRedisClient()
  if (!client) return null
  
  try {
    const value = await client.get(key)
    return value ? JSON.parse(value as string) : null
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function deleteCache(key: string) {
  const client = getRedisClient()
  if (!client) return false
  
  try {
    await client.del(key)
    return true
  } catch (error) {
    console.error('Redis delete error:', error)
    return false
  }
}

// Online user tracking
export async function setUserOnline(userId: string, roomId: string) {
  const client = getRedisClient()
  if (!client) return false
  
  try {
    const key = `online:${roomId}:${userId}`
    await client.setex(key, 300, Date.now()) // 5분 TTL
    return true
  } catch (error) {
    console.error('Redis setUserOnline error:', error)
    return false
  }
}

export async function getUserOnlineStatus(userId: string, roomId: string) {
  const client = getRedisClient()
  if (!client) return false
  
  try {
    const key = `online:${roomId}:${userId}`
    const timestamp = await client.get(key)
    return timestamp !== null
  } catch (error) {
    console.error('Redis getUserOnlineStatus error:', error)
    return false
  }
}

export async function getOnlineUsers(roomId: string) {
  const client = getRedisClient()
  if (!client) return []
  
  try {
    const pattern = `online:${roomId}:*`
    const keys = await client.keys(pattern)
    const users = []
    
    for (const key of keys) {
      const userId = key.split(':')[2]
      const timestamp = await client.get(key)
      if (timestamp) {
        users.push({ userId, lastSeen: parseInt(timestamp as string) })
      }
    }
    
    return users
  } catch (error) {
    console.error('Redis getOnlineUsers error:', error)
    return []
  }
}
