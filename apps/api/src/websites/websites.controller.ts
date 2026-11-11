import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebsitesService } from './websites.service';
import { CreateWebsiteDto, UpdateWebsiteDto } from './websites.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Websites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('websites')
export class WebsitesController {
  constructor(private readonly websitesService: WebsitesService) {}

  @Get()
  @ApiOperation({ summary: 'List all organization websites' })
  async list(@Request() req: any) {
    return this.websitesService.listWebsites(req.user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new website with SSRF validation' })
  async create(@Request() req: any, @Body() dto: CreateWebsiteDto) {
    return this.websitesService.createWebsite(req.user.organizationId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get website details' })
  async get(@Request() req: any, @Param('id') id: string) {
    return this.websitesService.getWebsite(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update website settings' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebsiteDto
  ) {
    return this.websitesService.updateWebsite(id, req.user.organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a website and all its audit data' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.websitesService.deleteWebsite(id, req.user.organizationId);
  }
}

