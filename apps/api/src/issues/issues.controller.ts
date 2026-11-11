import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IssuesService } from './issues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueSeverity, IssueCategory, IssueStatus } from '@auditor/database';

@ApiTags('Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  @ApiOperation({ summary: 'Filter and paginate organization issues' })
  async list(
    @Request() req: any,
    @Query('websiteId') websiteId?: string,
    @Query('auditId') auditId?: string,
    @Query('severity') severity?: IssueSeverity,
    @Query('category') category?: IssueCategory,
    @Query('status') status?: IssueStatus,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ): Promise<any> {
    return this.issuesService.listIssues(req.user.organizationId, {
      websiteId,
      auditId,
      severity,
      category,
      status,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed issue evidence and history' })
  async get(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.issuesService.getIssue(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update issue status (e.g. mark RESOLVED)' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: IssueStatus
  ) {
    return this.issuesService.updateIssueStatus(id, req.user.organizationId, status);
  }
}
