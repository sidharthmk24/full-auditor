import { Controller, Get, Param, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all generated reports' })
  async list(@Request() req: any) {
    return this.reportsService.listReports(req.user.organizationId);
  }

  @Get(':auditId/download')
  @ApiOperation({ summary: 'Download standalone HTML audit report' })
  async downloadReport(
    @Param('auditId') auditId: string,
    @Res() res: Response
  ) {
    const html = await this.reportsService.getHtmlReport(auditId);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="audit-report-${auditId}.html"`);
    res.send(html);
  }

  @Get(':auditId/view')
  @ApiOperation({ summary: 'View standalone HTML audit report' })
  async viewReport(
    @Param('auditId') auditId: string,
    @Res() res: Response
  ) {
    const html = await this.reportsService.getHtmlReport(auditId);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
