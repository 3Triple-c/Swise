import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
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

  async findOne(orgId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, orgId },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return { ...category, productCount: category._count.products, _count: undefined };
  }

  async create(orgId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { orgId_name: { orgId, name: dto.name } },
    });
    if (existing) throw new ConflictException(`Category "${dto.name}" already exists`);

    return this.prisma.category.create({
      data: { orgId, ...dto },
    });
  }

  async update(orgId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(orgId, id);

    if (dto.name) {
      const existing = await this.prisma.category.findUnique({
        where: { orgId_name: { orgId, name: dto.name } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category "${dto.name}" already exists`);
      }
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(orgId: string, id: string) {
    const category = await this.findOne(orgId, id);
    if (category.productCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ${category.productCount} products. Reassign them first.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
