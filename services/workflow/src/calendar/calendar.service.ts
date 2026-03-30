import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class CalendarService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
      this.encryptionKey = Buffer.from('0'.repeat(64), 'hex');
    } else {
      this.encryptionKey = Buffer.from(key, 'hex');
    }
  }

  async syncPrescriptionToCalendar(userId: string, prescriptionId: string) {
    const userToken = await this.prisma.googleToken.findUnique({
      where: { userId },
    });
    if (!userToken || !userToken.refreshToken) {
      console.log(`User ${userId} has no Google Calendar connected.`);
      return;
    }

    const refreshToken = this.decrypt(userToken.refreshToken);
    const accessToken = await this.refreshAccessToken(refreshToken);

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true },
    });

    if (!prescription) return;

    for (const item of prescription.items) {
      await this.createCalendarEventsForItem(accessToken, userId, item);
    }
  }

  async exportToFamilyCalendar(familyUserId: string, patientUserId: string, prescriptionId: string) {
    const familyToken = await this.prisma.googleToken.findUnique({
      where: { userId: familyUserId },
    });
    if (!familyToken || !familyToken.refreshToken) {
      console.log(`Family member ${familyUserId} has no Google Calendar connected.`);
      return;
    }

    const refreshToken = this.decrypt(familyToken.refreshToken);
    const accessToken = await this.refreshAccessToken(refreshToken);

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: true },
    });

    if (!prescription) return;

    for (const item of prescription.items) {
      const googleEvents = await this.createCalendarEventsForItem(accessToken, familyUserId, item);
      
      // Store mapping for each created event
      for (const event of googleEvents) {
        await this.prisma.familyExportEvent.create({
          data: {
            familyUserId,
            patientUserId,
            prescriptionItemId: item.id,
            calendarId: 'primary',
            googleEventId: event.id,
          },
        });
      }
    }
  }

  private async createCalendarEventsForItem(accessToken: string, userId: string, item: any): Promise<any[]> {
    const { medName, durationDays, userSchedule } = item;
    const schedule = userSchedule as any;
    const createdEvents: any[] = [];

    const startDate = new Date();
    for (let d = 0; d < (durationDays || 1); d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + d);

      const slots = [
        { name: 'Morning', time: '08:00', amount: schedule.morning },
        { name: 'Noon', time: '12:00', amount: schedule.noon },
        { name: 'Afternoon', time: '16:00', amount: schedule.afternoon },
        { name: 'Evening', time: '20:00', amount: schedule.evening },
      ];

      for (const slot of slots) {
        if (slot.amount && slot.amount > 0) {
          const event = await this.createEvent(accessToken, {
            summary: `Take ${medName} (${slot.amount} unit(s))`,
            description: `Reminder for ${medName}. Dosage: ${item.dosage || 'N/A'}. Notes: ${item.notes || 'None'}`,
            start: {
              dateTime: this.combineDateAndTime(currentDate, slot.time),
              timeZone: 'Asia/Ho_Chi_Minh',
            },
            end: {
              dateTime: this.combineDateAndTime(currentDate, slot.time, 30),
              timeZone: 'Asia/Ho_Chi_Minh',
            },
          });
          if (event) createdEvents.push(event);
        }
      }
    }
    return createdEvents;
  }

  private async createEvent(accessToken: string, event: any) {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    try {
      const { data } = await axios.post(url, event, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    } catch (e) {
      console.error('Error creating calendar event:', e.response?.data || e.message);
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const url = 'https://oauth2.googleapis.com/token';
    const values = {
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    };

    const { data } = await axios.post(url, new URLSearchParams(values as any));
    return data.access_token;
  }

  private combineDateAndTime(date: Date, time: string, addMinutes = 0): string {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(hours, minutes + addMinutes, 0, 0);
    return d.toISOString();
  }

  private decrypt(text: string): string {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
