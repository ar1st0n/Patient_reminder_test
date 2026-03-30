import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyInviteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventBridgeService } from '../common/event-bridge.service';

@Injectable()
export class FamilyAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBridge: EventBridgeService,
  ) {}

  async invite(patientUserId: string, invitedEmail: string) {
    const email = invitedEmail.trim().toLowerCase();
    if (!email) throw new BadRequestException('invitedEmail is required');

    return this.prisma.familyInvite.upsert({
      where: {
        patientUserId_invitedEmail: { patientUserId, invitedEmail: email },
      },
      update: {
        status: FamilyInviteStatus.PENDING,
        familyUserId: null,
        respondedAt: null,
        revokedAt: null,
      },
      create: {
        patientUserId,
        invitedEmail: email,
        status: FamilyInviteStatus.PENDING,
      },
    });
  }

  async sent(patientUserId: string) {
    return this.prisma.familyInvite.findMany({
      where: { patientUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async inbox(invitedEmail: string) {
    const email = invitedEmail.trim().toLowerCase();
    return this.prisma.familyInvite.findMany({
      where: { invitedEmail: email, status: FamilyInviteStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(inviteId: string, familyUserId: string, familyEmail: string) {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.invitedEmail !== familyEmail.trim().toLowerCase())
      throw new ForbiddenException('Forbidden');
    if (invite.status !== FamilyInviteStatus.PENDING)
      throw new BadRequestException('Invite is not pending');

    return this.prisma.familyInvite.update({
      where: { id: inviteId },
      data: {
        status: FamilyInviteStatus.ACCEPTED,
        familyUserId,
        respondedAt: new Date(),
      },
    });
  }

  async reject(inviteId: string, familyEmail: string) {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.invitedEmail !== familyEmail.trim().toLowerCase())
      throw new ForbiddenException('Forbidden');
    if (invite.status !== FamilyInviteStatus.PENDING)
      throw new BadRequestException('Invite is not pending');

    return this.prisma.familyInvite.update({
      where: { id: inviteId },
      data: { status: FamilyInviteStatus.REJECTED, respondedAt: new Date() },
    });
  }

  async revoke(inviteId: string, patientUserId: string) {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.patientUserId !== patientUserId)
      throw new ForbiddenException('Forbidden');
    if (invite.status === FamilyInviteStatus.REVOKED) return invite;

    return this.prisma.familyInvite.update({
      where: { id: inviteId },
      data: { status: FamilyInviteStatus.REVOKED, revokedAt: new Date() },
    });
  }

  async getAcceptedPatientIdsForFamily(familyUserId: string) {
    const rows = await this.prisma.familyInvite.findMany({
      where: { familyUserId, status: FamilyInviteStatus.ACCEPTED },
      select: { patientUserId: true },
    });
    return rows.map((r) => r.patientUserId);
  }

  async canFamilyViewPatient(familyUserId: string, patientUserId: string) {
    const row = await this.prisma.familyInvite.findFirst({
      where: {
        familyUserId,
        patientUserId,
        status: FamilyInviteStatus.ACCEPTED,
      },
      select: { id: true },
    });
    return !!row;
  }

  async exportToFamilyCalendar(familyUserId: string, prescriptionId: string) {
    const p = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });
    if (!p) throw new NotFoundException('Prescription not found');

    const canView = await this.canFamilyViewPatient(familyUserId, p.ownerId);
    if (!canView)
      throw new ForbiddenException('Forbidden access to patient data');

    await this.eventBridge.publish(
      'takecare.core-api',
      'FamilyExportRequested',
      {
        prescriptionId,
        familyUserId,
        patientUserId: p.ownerId,
      },
    );

    return { ok: true };
  }
}
