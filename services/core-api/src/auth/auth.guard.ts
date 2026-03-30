import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { verify, decode } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser, Role } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';
import jwksRsa from 'jwks-rsa';

type JwtPayload = {
  sub: string;
  email: string;
  role?: Role;
};

@Injectable()
export class AuthGuard implements CanActivate {
  private jwksClient: jwksRsa.JwksClient | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    const issuer = process.env.COGNITO_ISSUER;
    if (issuer) {
      this.jwksClient = jwksRsa({
        jwksUri: `${issuer}/.well-known/jwks.json`,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const authHeader = request.headers['authorization'];
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const mode = process.env.AUTH_MODE ?? 'local_jwt';

    let payload: JwtPayload;

    if (mode === 'local_jwt') {
      const secret = process.env.JWT_DEV_SECRET;
      if (!secret) throw new UnauthorizedException('Missing JWT_DEV_SECRET');
      try {
        payload = verify(token, secret) as JwtPayload;
      } catch {
        throw new UnauthorizedException('Invalid local token');
      }
    } else if (mode === 'cognito') {
      if (!this.jwksClient)
        throw new UnauthorizedException('Cognito issuer not configured');

      const decodedToken = decode(token, { complete: true });
      if (
        !decodedToken ||
        typeof decodedToken === 'string' ||
        !decodedToken.header.kid
      ) {
        throw new UnauthorizedException('Invalid cognito token format');
      }

      try {
        const key = await this.jwksClient.getSigningKey(
          decodedToken.header.kid,
        );
        const publicKey = key.getPublicKey();
        payload = verify(token, publicKey) as JwtPayload;
      } catch (e: any) {
        console.error('Cognito verify error:', e);
        throw new UnauthorizedException('Invalid cognito token');
      }
    } else {
      throw new UnauthorizedException('Unsupported auth mode');
    }

    const email = payload.email?.toLowerCase();
    if (!payload.sub || !email)
      throw new UnauthorizedException('Invalid token payload');

    // Upsert user based on sub (id) or email
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ id: payload.sub }, { email }] },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: payload.sub,
          email,
          role: payload.role ?? 'USER',
        },
      });
    } else if (user.id !== payload.sub || user.email !== email) {
      // In case of ID mismatch, maybe update or throw error?
      // Usually sub is the stable identifier.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { id: payload.sub, email }, // Sync sub
      });
    }

    const authUser: AuthUser = {
      userId: user.id,
      email: user.email,
      role: (user.role as unknown as Role) ?? 'USER',
    };
    request.user = authUser;
    return true;
  }
}
