import { Role } from '@prisma/client';
export declare class RegisterDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organisationName: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class InviteUserDto {
    email: string;
    role?: Role;
}
export declare class AcceptInviteDto {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
}
