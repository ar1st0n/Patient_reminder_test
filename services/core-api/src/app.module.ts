import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { FamilyAccessModule } from './family-access/family-access.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { CalendarModule } from './calendar/calendar.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FamilyAccessModule,
    PrescriptionsModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
