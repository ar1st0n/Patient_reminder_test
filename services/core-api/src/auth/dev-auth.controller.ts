import { Body, Controller, Post } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from './public.decorator';

type DevLoginBody = {
  email: string;
};

@Controller('/dev')
export class DevAuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('/login')
  async login(@Body() body: DevLoginBody) {
    const email = body?.email?.trim()?.toLowerCase();
    if (!email) return { error: 'email is required' };

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const secret = process.env.JWT_DEV_SECRET ?? 'dev_secret_change_me';
    const token = sign(
      { sub: user.id, email: user.email, role: user.role },
      secret,
      {
        expiresIn: '7d',
      },
    );

    return { token, user: { id: user.id, email: user.email, role: user.role } };
  }
}
