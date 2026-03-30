import { Module } from '@nestjs/common';
import { FamilyAccessModule } from '../family-access/family-access.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { OcrService } from './services/ocr.service';
import { EventBridgeService } from '../common/event-bridge.service';

@Module({
  imports: [PrismaModule, FamilyAccessModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, OcrService, EventBridgeService],
})
export class PrescriptionsModule {}
