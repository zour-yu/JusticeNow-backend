import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import type { Request } from 'express';

const UPLOAD_DIR = './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('storage')
export class StorageController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname) || '';
          const base = file.originalname
            .replace(ext, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_');
          cb(null, `${base}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    // Determine evidence type based on mimetype or extension
    let evidenceType: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (file.mimetype.startsWith('image/')) {
      evidenceType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      evidenceType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      evidenceType = 'audio';
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;

    return {
      success: true,
      statusCode: 201,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        name: file.originalname,
        filename: file.filename,
        size: file.size,
        type: evidenceType,
        mimetype: file.mimetype,
      },
    };
  }
}
