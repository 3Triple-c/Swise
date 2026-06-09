import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('categories')
@UseGuards(RolesGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser('orgId') orgId: string) {
    return this.categoriesService.findAll(orgId);
  }

  @Get(':id')
  findOne(@CurrentUser('orgId') orgId: string, @Param('id') id: string) {
    return this.categoriesService.findOne(orgId, id);
  }

  @Post()
  @Roles(Role.MANAGER)
  create(@CurrentUser('orgId') orgId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(orgId, dto);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  remove(@CurrentUser('orgId') orgId: string, @Param('id') id: string) {
    return this.categoriesService.remove(orgId, id);
  }
}
