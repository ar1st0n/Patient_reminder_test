import { Module } from '@nestjs/common';
import { FamilyAccessController } from './family-access.controller';
import { FamilyAccessService } from './family-access.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventBridgeService } from '../common/event-bridge.service';

@Module({
  imports: [PrismaModule],
  controllers: [FamilyAccessController],
  providers: [FamilyAccessService, EventBridgeService],
  exports: [FamilyAccessService],
})
export class FamilyAccessModule {}
