import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrescriptionStatus } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FamilyAccessService } from '../family-access/family-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { OcrService } from './services/ocr.service';
import { EventBridgeService } from '../common/event-bridge.service';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocr: OcrService,
    private readonly familyAccess: FamilyAccessService,
    private readonly eventBridge: EventBridgeService,
  ) {}

  async createUpload(userId: string, sourceFileKey: string) {
    return this.prisma.prescription.create({
      data: {
        ownerId: userId,
        sourceFileKey,
        status: PrescriptionStatus.UPLOADED,
      },
    });
  }

  private resolveLocalFilePath(fileKey: string) {
    const dir =
      process.env.FILE_STORAGE_LOCAL_DIR ??
      path.join(process.cwd(), 'data', 'uploads');
    return path.join(dir, fileKey);
  }

  async processPrescription(userId: string, id: string) {
    const p = await this.prisma.prescription.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Prescription not found');
    if (p.ownerId !== userId) throw new ForbiddenException('Forbidden');

    await this.prisma.prescription.update({
      where: { id },
      data: { status: PrescriptionStatus.PROCESSING },
    });

    const filePath = this.resolveLocalFilePath(p.sourceFileKey);
    const buf = await fs.readFile(filePath);
    const result = await this.ocr.process(buf);

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        ocrRawText: result.ocrText,
        parsedJson: result.parsed as unknown as Prisma.InputJsonValue,
        status: PrescriptionStatus.PENDING_REVIEW,
      },
    });

    return { prescription: updated, ocr: result };
  }

  async confirmPrescription(userId: string, id: string, confirmed: any) {
    const p = await this.prisma.prescription.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Prescription not found');
    if (p.ownerId !== userId) throw new ForbiddenException('Forbidden');

    const diseaseName = (confirmed.diseaseName as string)?.trim();
    const followUpDate = confirmed.followUpDate
      ? new Date(confirmed.followUpDate as string)
      : undefined;
    const items = (confirmed.items as any[]) || [];

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        diseaseName,
        followUpDate,
        confirmedJson: confirmed as Prisma.InputJsonValue,
        status: PrescriptionStatus.CONFIRMED,
        confirmedAt: new Date(),
        items: {
          deleteMany: {},
          create: items.map((item: any) => ({
            medName: item.medName as string,
            dosage: item.dosage as string,
            timesPerDay: item.timesPerDay as number,
            durationDays: item.durationDays as number,
            userSchedule: (item.schedule as Prisma.InputJsonValue) || {},
          })),
        },
      },
      include: { items: true },
    });

    // If patient enables sync, publish event
    if (confirmed.syncToCalendar) {
      await this.eventBridge.publish(
        'takecare.core-api',
        'PrescriptionConfirmed',
        {
          prescriptionId: updated.id,
          userId: updated.ownerId,
          syncToCalendar: true,
        },
      );
    }

    return updated;
  }

  async getPrescription(userId: string, id: string) {
    const p = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!p) throw new NotFoundException('Prescription not found');
    if (p.ownerId !== userId) {
      const ok = await this.familyAccess.canFamilyViewPatient(
        userId,
        p.ownerId,
      );
      if (!ok) throw new ForbiddenException('Forbidden');
    }
    return p;
  }

  async listPrescriptions(userId: string, disease?: string) {
    const diseaseKeyword = disease?.trim();
    const acceptedPatientIds =
      await this.familyAccess.getAcceptedPatientIdsForFamily(userId);
    const ownerIds = Array.from(new Set([userId, ...acceptedPatientIds]));
    return this.prisma.prescription.findMany({
      where: {
        ownerId: { in: ownerIds },
        ...(diseaseKeyword
          ? {
              diseaseName: {
                contains: diseaseKeyword,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
