import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma, Role } from '@auditor/database';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async register(data: { email: string; password: string; name: string; organizationName?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
      },
    });

    const orgName = data.organizationName || `${data.name}'s Organization`;
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        members: {
          create: {
            userId: user.id,
            role: Role.ADMIN,
          },
        },
      },
    });

    const token = this.generateToken(user.id, user.email, org.id, Role.ADMIN);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: Role.ADMIN, organizationId: org.id },
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { memberships: { include: { organization: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = user.memberships[0];
    const role = membership ? membership.role : Role.MEMBER;
    const orgId = membership ? membership.organizationId : '';

    const token = this.generateToken(user.id, user.email, orgId, role);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role, organizationId: orgId },
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateToken(userId: string, email: string, organizationId: string, role: Role) {
    return this.jwtService.sign({
      sub: userId,
      email,
      organizationId,
      role,
    });
  }
}

