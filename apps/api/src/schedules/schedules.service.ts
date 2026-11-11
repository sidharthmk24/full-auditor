import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, ScheduleFrequency } from '@auditor/database';

@Injectable()
export class SchedulesService {
  async listSchedules(organizationId: string) {
    return prisma.schedule.findMany({
      where: {
        website: { organizationId },
      },
      include: {
        website: { select: { id: true, name: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSchedule(
    organizationId: string,
    data: {
      websiteId: string;
      frequency: ScheduleFrequency;
      dayOfWeek?: number;
      hourOfDay?: number;
      timeZone?: string;
    }
  ) {
    const website = await prisma.website.findFirst({
      where: { id: data.websiteId, organizationId },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    // Compute next run time (e.g. next Monday at 3 AM UTC)
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 7);

    return prisma.schedule.create({
      data: {
        websiteId: data.websiteId,
        frequency: data.frequency || ScheduleFrequency.WEEKLY,
        dayOfWeek: data.dayOfWeek ?? 1,
        hourOfDay: data.hourOfDay ?? 3,
        timeZone: data.timeZone || 'UTC',
        isActive: true,
        nextRunAt: nextRun,
      },
      include: { website: true },
    });
  }

  async toggleSchedule(id: string, organizationId: string, isActive: boolean) {
    const schedule = await prisma.schedule.findFirst({
      where: { id, website: { organizationId } },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return prisma.schedule.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteSchedule(id: string, organizationId: string) {
    const schedule = await prisma.schedule.findFirst({
      where: { id, website: { organizationId } },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await prisma.schedule.delete({ where: { id } });
    return { success: true, message: 'Schedule deleted successfully' };
  }
}

