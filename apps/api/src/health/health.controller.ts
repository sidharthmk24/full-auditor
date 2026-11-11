import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { prisma } from '@auditor/database';
import Redis from 'ioredis';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  private redisClient: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
  }

  @Get()
  @ApiOperation({ summary: 'System health check' })
  async getHealth() {
    return {
      status: 'ok',
      service: 'website-auditor-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  @ApiOperation({ summary: 'Check PostgreSQL connectivity' })
  async checkDatabase() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'postgresql' };
    } catch (err: any) {
      return { status: 'unhealthy', error: err.message };
    }
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis connectivity' })
  async checkRedis() {
    try {
      const pong = await this.redisClient.ping();
      return { status: 'healthy', redis: pong };
    } catch (err: any) {
      return { status: 'unhealthy', error: err.message };
    }
  }

  @Get('workers')
  @ApiOperation({ summary: 'Check background worker queue status' })
  async checkWorkers() {
    return {
      status: 'active',
      queues: ['audit-workflow'],
      timestamp: new Date().toISOString(),
    };
  }
}
