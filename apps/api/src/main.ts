import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  const uploadsDir = path.resolve('D:/MEARN STACK/website-full-auditor/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.useStaticAssets(uploadsDir, { prefix: '/api/v1/uploads/' });
  console.log(`[API] Serving static uploads from: ${uploadsDir}`);

  app.setGlobalPrefix('api/v1', { exclude: ['/', '/uploads/(.*)', '/api/v1/uploads/(.*)'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const config = new DocumentBuilder()
    .setTitle('AI Website Auditor API')
    .setDescription('Production-ready REST API for AI-powered website auditing and monitoring')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[API] AI Website Auditor API listening on http://localhost:${port}`);
  console.log(`[API] Swagger documentation ready at http://localhost:${port}/docs`);
}
bootstrap();
