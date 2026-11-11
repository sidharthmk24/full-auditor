import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { WebsitesModule } from './websites/websites.module';
import { AuditsModule } from './audits/audits.module';
import { IssuesModule } from './issues/issues.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulesModule } from './schedules/schedules.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { UploadsController } from './uploads/uploads.controller';

@Module({
  imports: [
    AuthModule,
    WebsitesModule,
    AuditsModule,
    IssuesModule,
    ReportsModule,
    SchedulesModule,
    HealthModule,
  ],
  controllers: [AppController, UploadsController],
})
export class AppModule {}

