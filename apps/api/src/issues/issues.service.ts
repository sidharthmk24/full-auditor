import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, IssueSeverity, IssueCategory, IssueStatus } from '@auditor/database';

@Injectable()
export class IssuesService {
  async listIssues(
    organizationId: string,
    filters: {
      websiteId?: string;
      auditId?: string;
      severity?: IssueSeverity;
      category?: IssueCategory;
      status?: IssueStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<any> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      website: { organizationId },
    };

    if (filters.websiteId) {
      where.websiteId = filters.websiteId;
    }
    if (filters.severity) {
      where.severity = filters.severity;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.auditId) {
      where.occurrences = {
        some: { auditId: filters.auditId },
      };
    }

    const [total, items] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        include: {
          website: { select: { id: true, name: true, url: true } },
          occurrences: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { lastDetectedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIssue(id: string, organizationId: string): Promise<any> {
    const issue = await prisma.issue.findFirst({
      where: { id, website: { organizationId } },
      include: {
        website: true,
        occurrences: {
          include: { audit: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return issue;
  }

  async updateIssueStatus(id: string, organizationId: string, status: IssueStatus) {
    const issue = await prisma.issue.findFirst({
      where: { id, website: { organizationId } },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return prisma.issue.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === IssueStatus.RESOLVED ? new Date() : null,
      },
    });
  }
}
