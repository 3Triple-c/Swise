import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
export declare class CategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<{
        productCount: number;
        _count: undefined;
        id: string;
        orgId: string;
        name: string;
        description: string | null;
    }[]>;
    findOne(orgId: string, id: string): Promise<{
        productCount: number;
        _count: undefined;
        id: string;
        orgId: string;
        name: string;
        description: string | null;
    }>;
    create(orgId: string, dto: CreateCategoryDto): Promise<{
        id: string;
        orgId: string;
        name: string;
        description: string | null;
    }>;
    update(orgId: string, id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        orgId: string;
        name: string;
        description: string | null;
    }>;
    remove(orgId: string, id: string): Promise<{
        message: string;
    }>;
}
