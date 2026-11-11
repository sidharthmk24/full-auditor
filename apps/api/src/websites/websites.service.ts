import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { prisma } from '@auditor/database';
import { SecurityUtils, UrlUtils } from '@auditor/shared';

@Injectable()
export class WebsitesService {
  async listWebsites(organizationId: string) {
    return prisma.website.findMany({
      where: { organizationId },
      include: {
        configuration: true,
        _count: {
          select: {
            audits: true,
            issues: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWebsite(id: string, organizationId: string) {
    const website = await prisma.website.findFirst({
      where: { id, organizationId },
      include: {
        configuration: true,
        schedules: true,
        audits: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            overallScore: true,
            issuesFound: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    return website;
  }

  async createWebsite(
    organizationId: string,
    data: {
      name: string;
      url: string;
      description?: string;
      category?: string;
      maxPages?: number;
      maxDepth?: number;
    }
  ) {
    const normalizedUrl = UrlUtils.normalizeUrl(data.url);
    if (!normalizedUrl) {
      throw new BadRequestException('Invalid website URL format');
    }

    // SSRF validation
    const safeCheck = await SecurityUtils.validateSafeUrl(normalizedUrl);
    if (!safeCheck.isValid) {
      throw new BadRequestException(`Unsafe website URL: ${safeCheck.reason}`);
    }

    const domain = UrlUtils.extractDomain(normalizedUrl);

    // Prevent duplicate website records for the same organization and domain
    const existing = await prisma.website.findUnique({
      where: {
        organizationId_normalizedDomain: {
          organizationId,
          normalizedDomain: domain,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Website domain '${domain}' is already registered in this organization`);
    }

    return prisma.website.create({
      data: {
        name: data.name,
        url: normalizedUrl,
        normalizedDomain: domain,
        description: data.description,
        category: data.category || 'General',
        organizationId,
        configuration: {
          create: {
            maxPages: data.maxPages || 50,
            maxDepth: data.maxDepth || 3,
          },
        },
      },
      include: {
        configuration: true,
      },
    });
  }

  async updateWebsite(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.website.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException('Website not found');
    }

    return prisma.website.update({
      where: { id },
      data,
      include: { configuration: true },
    });
  }

  async deleteWebsite(id: string, organizationId: string) {
    const existing = await prisma.website.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException('Website not found');
    }

    await prisma.website.delete({ where: { id } });
    return { success: true, message: 'Website deleted successfully' };
  }
}

