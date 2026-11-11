import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma, AuditStatus } from '@auditor/database';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class AuditsService {
  private redisClient: Redis;
  private auditQueue: Queue;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.redisClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.auditQueue = new Queue('audit-workflow', { connection: this.redisClient });
  }

  async getLiveFrame(auditId: string): Promise<string | null> {
    return this.redisClient.get(`audit:${auditId}:live_frame`);
  }

  async getLiveAction(auditId: string): Promise<string | null> {
    return this.redisClient.get(`audit:${auditId}:live_action`);
  }

  async listAudits(organizationId: string, limit = 20) {
    return prisma.audit.findMany({
      where: {
        website: { organizationId },
      },
      include: {
        website: {
          select: { id: true, name: true, url: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAudit(id: string, organizationId: string): Promise<any> {
    const audit = await prisma.audit.findFirst({
      where: {
        id,
        website: { organizationId },
      },
      include: {
        website: true,
        pages: true,
        linkChecks: { take: 50 },
        interactionTests: true,
        formTests: true,
        networkEvents: { take: 50 },
        consoleEvents: { take: 50 },
        seoResults: true,
        accessibilityResults: true,
        performanceResults: true,
        responsiveResults: true,
        artifacts: true,
        aiAnalysis: true,
        baseline: true,
        issueOccurrences: {
          include: {
            issue: true,
          },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    return audit;
  }

  async triggerAudit(
    websiteId: string,
    userId: string,
    organizationId: string,
    options?: { maxPages?: number; maxDepth?: number }
  ) {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, organizationId },
      include: { configuration: true },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    // Check if an audit is already running for this website
    const runningAudit = await prisma.audit.findFirst({
      where: {
        websiteId,
        status: { in: [AuditStatus.QUEUED, AuditStatus.DISCOVERING, AuditStatus.CRAWLING, AuditStatus.TESTING, AuditStatus.ANALYZING] },
      },
    });

    if (runningAudit) {
      throw new BadRequestException('An audit is already running for this website');
    }

    const audit = await prisma.audit.create({
      data: {
        websiteId,
        triggeredById: userId,
        status: AuditStatus.QUEUED,
        progressPercent: 5,
        currentStep: 'Audit job queued',
      },
    });

    // Enqueue BullMQ job
    await this.auditQueue.add(
      'start-audit',
      {
        auditId: audit.id,
        websiteId: website.id,
        url: website.url,
        maxPages: options?.maxPages || website.configuration?.maxPages || 50,
        maxDepth: options?.maxDepth || website.configuration?.maxDepth || 3,
      },
      {
        jobId: audit.id,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return audit;
  }

  async cancelAudit(id: string, organizationId: string) {
    const audit = await prisma.audit.findFirst({
      where: { id, website: { organizationId } },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    // Update status in DB
    const updated = await prisma.audit.update({
      where: { id },
      data: {
        status: AuditStatus.CANCELLED,
        currentStep: 'Audit cancelled by user',
      },
    });

    return updated;
  }

  async compareAudits(currentAuditId: string, previousAuditId: string, organizationId: string) {
    const current = await this.getAudit(currentAuditId, organizationId);
    const previous = await this.getAudit(previousAuditId, organizationId);

    const scoreDelta = (current.overallScore || 0) - (previous.overallScore || 0);

    return {
      currentAudit: {
        id: current.id,
        date: current.createdAt,
        score: current.overallScore,
        issuesCount: current.issuesFound,
      },
      previousAudit: {
        id: previous.id,
        date: previous.createdAt,
        score: previous.overallScore,
        issuesCount: previous.issuesFound,
      },
      scoreDelta,
      pagesDelta: current.pagesCrawled - previous.pagesCrawled,
      brokenLinksDelta:
        current.linkChecks.filter((l) => l.isBroken).length -
        previous.linkChecks.filter((l) => l.isBroken).length,
    };
  }
}
