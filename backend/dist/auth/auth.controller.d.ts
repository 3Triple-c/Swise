import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, InviteUserDto, AcceptInviteDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, dto: RefreshTokenDto): Promise<{
        message: string;
    }>;
    me(user: any): any;
    inviteUser(orgId: string, dto: InviteUserDto): Promise<{
        message: string;
        invitationToken: string;
    }>;
    acceptInvite(dto: AcceptInviteDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
}
