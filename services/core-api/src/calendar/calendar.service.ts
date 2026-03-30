import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class CalendarService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly prisma: PrismaService) {
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
      // 64 hex chars = 32 bytes
      // For development, use a fallback if not provided, but it should be provided
      this.encryptionKey = Buffer.from('0'.repeat(64), 'hex');
    } else {
      this.encryptionKey = Buffer.from(key, 'hex');
    }
  }

  getConnectUrl(): string {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options: Record<string, string> = {
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'].join(' '),
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  async handleCallback(userId: string, code: string) {
    const url = 'https://oauth2.googleapis.com/token';
    const values: Record<string, string> = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      grant_type: 'authorization_code',
    };

    try {
      const { data } = (await axios.post(url, new URLSearchParams(values), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })) as { data: any };

      const { access_token, refresh_token, expires_in } = data;
      const expiryDate = new Date(Date.now() + (expires_in as number) * 1000);

      const encryptedRefreshToken = refresh_token
        ? this.encrypt(refresh_token as string)
        : undefined;

      await this.prisma.googleToken.upsert({
        where: { userId },
        create: {
          userId,
          accessToken: access_token as string,
          refreshToken: encryptedRefreshToken,
          expiryDate,
        },
        update: {
          accessToken: access_token as string,
          ...(encryptedRefreshToken
            ? { refreshToken: encryptedRefreshToken }
            : {}),
          expiryDate,
        },
      });

      return { success: true };
    } catch (e: any) {
      console.error('Google OAuth error:', e.response?.data || e.message);
      throw new UnauthorizedException('Failed to exchange code for token');
    }
  }

  async getStatus(userId: string) {
    const token = await this.prisma.googleToken.findUnique({
      where: { userId },
    });
    return {
      connected: !!token?.refreshToken,
    };
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      iv,
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
