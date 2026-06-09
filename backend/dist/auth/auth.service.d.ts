import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto, InviteUserDto, AcceptInviteDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
        organisation: {
            id: string;
            name: string;
            slug: string;
            plan: import("@prisma/client").$Enums.Plan;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
        organisation: {
            id: string;
            name: string;
            slug: string;
            plan: import("@prisma/client").$Enums.Plan;
        };
    }>;
    refreshToken(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, refreshToken: string): Promise<{
        message: string;
    }>;
    inviteUser(orgId: string, dto: InviteUserDto): Promise<{
        message: string;
        invitationToken: string;
    }>;
    acceptInvite(dto: AcceptInviteDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    private generateTokens;
    private sanitizeUser;
    private generateSlug;
}
