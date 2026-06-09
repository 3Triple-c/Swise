import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,   limit: 10  },
      { name: 'medium', ttl: 60_000, limit: 100 },
    ]),
    PrismaModule,
    CommonModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    // Phase 3+: PurchasesModule, SalesModule, SuppliersModule
  ],
  providers: [
    { provide: APP_GUARD,       useClass: ThrottlerGuard        },
    { provide: APP_GUARD,       useClass: JwtAuthGuard          },
    { provide: APP_GUARD,       useClass: RolesGuard            },
    { provide: APP_FILTER,      useClass: AllExceptionsFilter   },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor  },
  ],
})
export class AppModule {}
