import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  InviteUserDto,
  AcceptInviteDto,
} from './dto/auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── Register (creates org + owner user) ──────────────────────

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const slug = this.generateSlug(dto.organisationName);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const { user, org } = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: dto.organisationName,
          slug: `${slug}-${Date.now()}`,
        },
      });

      // Create default location for the org
      await tx.location.create({
        data: {
          orgId: org.id,
          name: 'Main Warehouse',
          isDefault: true,
        },
      });

      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.OWNER,
        },
      });

      return { user, org };
    });

    const tokens = await this.generateTokens(user.id, user.email, org.id, user.role);

    return {
      user: this.sanitizeUser(user),
      organisation: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
      ...tokens,
    };
  }

  // ── Login ────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organisation: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.orgId,
      user.role,
    );

    return {
      user: this.sanitizeUser(user),
      organisation: {
        id: user.organisation.id,
        name: user.organisation.name,
        slug: user.organisation.slug,
        plan: user.organisation.plan,
      },
      ...tokens,
    };
  }

  // ── Refresh token ────────────────────────────────────────────

  async refreshToken(dto: RefreshTokenDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Rotate: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.orgId,
      stored.user.role,
    );

    return tokens;
  }

  // ── Logout ───────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  // ── Invite user ──────────────────────────────────────────────

  async inviteUser(orgId: string, dto: InviteUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        orgId,
        email: dto.email,
        role: dto.role ?? Role.STAFF,
        expiresAt,
      },
    });

    // TODO: send invitation email via Resend
    // await this.mailService.sendInvitation(invitation);

    return { message: 'Invitation sent', invitationToken: invitation.token };
  }

  // ── Accept invite ────────────────────────────────────────────

  async acceptInvite(dto: AcceptInviteDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) throw new NotFoundException('Invalid invitation token');
    if (invitation.accepted) throw new BadRequestException('Invitation already used');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Invitation has expired');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          orgId: invitation.orgId,
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: invitation.role,
        },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { accepted: true },
      });
      return user;
    });

    const tokens = await this.generateTokens(user.id, user.email, user.orgId, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    orgId: string,
    role: string,
  ) {
    const payload = { sub: userId, email, orgId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    // Store hashed refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
