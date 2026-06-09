"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CategoriesService = class CategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(orgId) {
        const categories = await this.prisma.category.findMany({
            where: { orgId },
            include: {
                _count: { select: { products: true } },
            },
            orderBy: { name: 'asc' },
        });
        return categories.map((c) => ({
            ...c,
            productCount: c._count.products,
            _count: undefined,
        }));
    }
    async findOne(orgId, id) {
        const category = await this.prisma.category.findFirst({
            where: { id, orgId },
            include: { _count: { select: { products: true } } },
        });
        if (!category)
            throw new common_1.NotFoundException('Category not found');
        return { ...category, productCount: category._count.products, _count: undefined };
    }
    async create(orgId, dto) {
        const existing = await this.prisma.category.findUnique({
            where: { orgId_name: { orgId, name: dto.name } },
        });
        if (existing)
            throw new common_1.ConflictException(`Category "${dto.name}" already exists`);
        return this.prisma.category.create({
            data: { orgId, ...dto },
        });
    }
    async update(orgId, id, dto) {
        await this.findOne(orgId, id);
        if (dto.name) {
            const existing = await this.prisma.category.findUnique({
                where: { orgId_name: { orgId, name: dto.name } },
            });
            if (existing && existing.id !== id) {
                throw new common_1.ConflictException(`Category "${dto.name}" already exists`);
            }
        }
        return this.prisma.category.update({ where: { id }, data: dto });
    }
    async remove(orgId, id) {
        const category = await this.findOne(orgId, id);
        if (category.productCount > 0) {
            throw new common_1.ConflictException(`Cannot delete category with ${category.productCount} products. Reassign them first.`);
        }
        await this.prisma.category.delete({ where: { id } });
        return { message: 'Category deleted' };
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map