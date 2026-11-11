import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, interval } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AuditsService } from './audits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { prisma } from '@auditor/database';

@ApiTags('Audits')
@Controller()
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get('audits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List recent audits for the organization' })
  async list(@Request() req: any) {
    return this.auditsService.listAudits(req.user.organizationId);
  }

  @Post('websites/:websiteId/audits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger a new asynchronous audit on a website' })
  async trigger(
    @Request() req: any,
    @Param('websiteId') websiteId: string,
    @Body() body: { maxPages?: number; maxDepth?: number }
  ) {
    return this.auditsService.triggerAudit(
      websiteId,
      req.user.userId,
      req.user.organizationId,
      body
    );
  }

  @Get('audits/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full audit details and evidence' })
  async get(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.auditsService.getAudit(id, req.user.organizationId);
  }

  @Post('audits/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an active audit' })
  async cancel(@Request() req: any, @Param('id') id: string) {
    return this.auditsService.cancelAudit(id, req.user.organizationId);
  }

  @Get('audits/:auditId/compare/:previousAuditId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compare two historical audits' })
  async compare(
    @Request() req: any,
    @Param('auditId') auditId: string,
    @Param('previousAuditId') previousAuditId: string
  ) {
    return this.auditsService.compareAudits(auditId, previousAuditId, req.user.organizationId);
  }

  @Get('audits/:id/live-frame')
  @ApiOperation({ summary: 'Get current real-time live browser frame and active action' })
  async getLiveFrame(@Param('id') id: string) {
    const liveFrame = await this.auditsService.getLiveFrame(id);
    const liveAction = await this.auditsService.getLiveAction(id);
    return { liveFrame, liveAction };
  }

  @Sse('audits/:id/stream')
  @ApiOperation({ summary: 'Server-Sent Events for real-time audit progress' })
  streamProgress(@Param('id') id: string): Observable<MessageEvent> {
    return interval(800).pipe(
      switchMap(async () => {
        const audit = await prisma.audit.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            progressPercent: true,
            currentStep: true,
            pagesCrawled: true,
            issuesFound: true,
            errorMessage: true,
          },
        });
        const liveFrame = await this.auditsService.getLiveFrame(id);
        const liveAction = await this.auditsService.getLiveAction(id);
        return { data: { ...(audit || {}), liveFrame, liveAction } };
      }),
      map((payload) => payload as MessageEvent)
    );
  }
}
