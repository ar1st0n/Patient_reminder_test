import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DevController } from './dev/dev.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CalendarService } from './calendar/calendar.service';
import { SQSListenerService } from './event-consumer/sqs-listener.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, DevController],
  providers: [CalendarService, SQSListenerService],
})
export class AppModule {}
