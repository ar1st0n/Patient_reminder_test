import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { diskStorage } from 'multer';
import crypto from 'node:crypto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { PrescriptionsService } from './prescriptions.service';

@Controller()
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Post('/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir =
            process.env.FILE_STORAGE_LOCAL_DIR ??
            path.join(process.cwd(), 'data', 'uploads');
          fs.mkdir(dir, { recursive: true })
            .then(() => cb(null, dir))
            .catch((err: unknown) =>
              cb(
                err instanceof Error
                  ? err
                  : new Error('Failed to create upload dir'),
                dir,
              ),
            );
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '';
          cb(null, `${crypto.randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype.startsWith('image/') ||
          file.mimetype === 'application/pdf';
        cb(ok ? null : new Error('Invalid file type'), ok);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const created = await this.prescriptions.createUpload(
      user.userId,
      file.filename,
    );
    return {
      id: created.id,
      sourceFileKey: created.sourceFileKey,
      status: created.status,
    };
  }

  @Post('/api/prescription/:id/process')
  async process(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.prescriptions.processPrescription(
      user.userId,
      id,
    );
    return {
      prescriptionId: result.prescription.id,
      status: result.prescription.status,
      ocrText: result.ocr.ocrText,
      language: result.ocr.language,
      parsed: result.ocr.parsed,
    };
  }

  @Post('/api/prescription/:id/confirm')
  async confirm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const updated = await this.prescriptions.confirmPrescription(
      user.userId,
      id,
      body,
    );
    return { ok: true, prescriptionId: updated.id, status: updated.status };
  }

  @Get('/api/prescription/:id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const p = await this.prescriptions.getPrescription(user.userId, id);
    return p;
  }

  @Get('/api/prescription/:id/file')
  async getFile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const p = await this.prescriptions.getPrescription(user.userId, id);
    const dir =
      process.env.FILE_STORAGE_LOCAL_DIR ??
      path.join(process.cwd(), 'data', 'uploads');
    const filePath = path.join(dir, p.sourceFileKey);
    const stream = createReadStream(filePath);
    return new StreamableFile(stream);
  }

  @Get('/prescriptions')
  async list(
    @CurrentUser() user: AuthUser,
    @Query('disease') disease?: string,
  ) {
    return this.prescriptions.listPrescriptions(user.userId, disease);
  }
}
