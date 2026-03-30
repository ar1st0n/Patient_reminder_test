import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';

@Controller('api/calendar')
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('connect-url')
  getConnectUrl() {
    return { url: this.calendarService.getConnectUrl() };
  }

  @Get('oauth/callback')
  async handleCallback(
    @CurrentUser() user: AuthUser,
    @Query('code') code: string,
  ) {
    return this.calendarService.handleCallback(user.userId, code);
  }

  @Get('status')
  async getStatus(@CurrentUser() user: AuthUser) {
    return this.calendarService.getStatus(user.userId);
  }
}
