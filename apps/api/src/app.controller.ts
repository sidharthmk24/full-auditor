import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  getRoot(@Res() res: Response) {
    // Redirect browser visits on port 4000 directly to Swagger API docs
    return res.redirect('/docs');
  }
}

