import { PrismaService } from '../../prisma/prisma.service';
interface LogActionParams {
    orgId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
}
export declare class AuditLogService {
    private prisma;
    constructor(prisma: PrismaService);
    log(params: LogActionParams): Promise<{
        id: string;
        action: string;
        entityType: string;
        entityId: string;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        createdAt: Date;
        orgId: string;
        userId: string;
    }>;
}
export {};
