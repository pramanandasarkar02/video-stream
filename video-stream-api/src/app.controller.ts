import { Controller, Get, Res, Param, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  @Get()
  serveHtml(@Res() res: Response) {
    return res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }

  @Get('videos')
  getVideoList() {
    const videoDir = join(__dirname, '..', 'videos');
    try {
      const files = fs.readdirSync(videoDir).filter(file => file.endsWith('.mp4'));
      return files.map(file => ({ name: file, url: `/video/${file}` }));
    } catch (error) {
      throw new HttpException('Failed to list videos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('video/:filename')
  streamVideo(@Param('filename') filename: string, @Res() res: Response) {
    const videoPath = join(__dirname, '..', 'videos', filename);
    
    if (!fs.existsSync(videoPath)) {
      throw new HttpException('Video not found', HttpStatus.NOT_FOUND);
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = res.getHeader('range') as string;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(HttpStatus.PARTIAL_CONTENT, headers);
      const videoStream = fs.createReadStream(videoPath, { start, end });
      videoStream.pipe(res);
    } else {
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(HttpStatus.OK, headers);
      fs.createReadStream(videoPath).pipe(res);
    }
  }
}