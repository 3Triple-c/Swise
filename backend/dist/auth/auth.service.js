"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('An account with this email already exists');
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
                    role: client_1.Role.OWNER,
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
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { organisation: true },
        });
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Your account has been deactivated');
        }
        const tokens = await this.generateTokens(user.id, user.email, user.orgId, user.role);
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
    async refreshToken(dto) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: dto.refreshToken },
            include: { user: true },
        });
        if (!stored || stored.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token is invalid or expired');
        }
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
        const tokens = await this.generateTokens(stored.user.id, stored.user.email, stored.user.orgId, stored.user.role);
        return tokens;
    }
    async logout(userId, refreshToken) {
        await this.prisma.refreshToken.deleteMany({
            where: { userId, token: refreshToken },
        });
        return { message: 'Logged out successfully' };
    }
    async inviteUser(orgId, dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('A user with this email already exists');
        }
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const invitation = await this.prisma.invitation.create({
            data: {
                orgId,
                email: dto.email,
                role: dto.role ?? client_1.Role.STAFF,
                expiresAt,
            },
        });
        return { message: 'Invitation sent', invitationToken: invitation.token };
    }
    async acceptInvite(dto) {
        const invitation = await this.prisma.invitation.findUnique({
            where: { token: dto.token },
        });
        if (!invitation)
            throw new common_1.NotFoundException('Invalid invitation token');
        if (invitation.accepted)
            throw new common_1.BadRequestException('Invitation already used');
        if (invitation.expiresAt < new Date())
            throw new common_1.BadRequestException('Invitation has expired');
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
    async generateTokens(userId, email, orgId, role) {
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
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: { userId, token: refreshToken, expiresAt },
        });
        return { accessToken, refreshToken };
    }
    sanitizeUser(user) {
        const { passwordHash, ...rest } = user;
        return rest;
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map