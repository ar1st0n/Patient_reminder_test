import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { DevAuthController } from './dev-auth.controller';

@Module({
  controllers: [DevAuthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
