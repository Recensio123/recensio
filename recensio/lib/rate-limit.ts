import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null
function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  }
  return redis
}

export const triggerRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  prefix: 'rl:trigger',
})

export const reviewRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:review',
})

export const authRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'rl:auth',
})

export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  )
}
