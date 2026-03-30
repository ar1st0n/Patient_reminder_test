import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { FamilyAccessService } from './family-access.service';

@Controller('/api/family-access')
export class FamilyAccessController {
  constructor(private readonly service: FamilyAccessService) {}

  @Post('/invite')
  async invite(
    @CurrentUser() user: AuthUser,
    @Body() body: { email?: string },
  ) {
    const email = body?.email ?? '';
    const invite = await this.service.invite(user.userId, email);
    return { ok: true, invite };
  }

  @Get('/sent')
  async sent(@CurrentUser() user: AuthUser) {
    return this.service.sent(user.userId);
  }

  @Get('/inbox')
  async inbox(@CurrentUser() user: AuthUser) {
    return this.service.inbox(user.email);
  }

  @Post('/:inviteId/accept')
  async accept(
    @CurrentUser() user: AuthUser,
    @Param('inviteId') inviteId: string,
  ) {
    const invite = await this.service.accept(inviteId, user.userId, user.email);
    return { ok: true, invite };
  }

  @Post('/:inviteId/reject')
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('inviteId') inviteId: string,
  ) {
    const invite = await this.service.reject(inviteId, user.email);
    return { ok: true, invite };
  }

  @Delete('/:inviteId')
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('inviteId') inviteId: string,
  ) {
    const invite = await this.service.revoke(inviteId, user.userId);
    return { ok: true, invite };
  }

  @Post('/:id/export')
  async export(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.exportToFamilyCalendar(user.userId, id);
  }
}
