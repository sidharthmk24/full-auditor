import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduleFrequency } from '@auditor/database';

@ApiTags('Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'List all audit schedules' })
  async list(@Request() req: any) {
    return this.schedulesService.listSchedules(req.user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an automated audit schedule' })
  async create(
    @Request() req: any,
    @Body()
    dto: {
      websiteId: string;
      frequency: ScheduleFrequency;
      dayOfWeek?: number;
      hourOfDay?: number;
      timeZone?: string;
    }
  ) {
    return this.schedulesService.createSchedule(req.user.organizationId, dto);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a schedule' })
  async pause(@Request() req: any, @Param('id') id: string) {
    return this.schedulesService.toggleSchedule(id, req.user.organizationId, false);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a schedule' })
  async resume(@Request() req: any, @Param('id') id: string) {
    return this.schedulesService.toggleSchedule(id, req.user.organizationId, true);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.schedulesService.deleteSchedule(id, req.user.organizationId);
  }
}

