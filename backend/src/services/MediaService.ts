import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface ProcessedMedia {
  originalPath: string;
  compressedPath: string;
  thumbnailPath?: string;
  duration: number;
  size: number;
  mimeType: string;
}

export class MediaService {
  private uploadDir: string;
  private tempDir: string;

  constructor(uploadDir: string = 'uploads/media', tempDir: string = 'uploads/temp') {
    this.uploadDir = uploadDir;
    this.tempDir = tempDir;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    ['uploads/media', 'uploads/temp', 'uploads/thumbnails'].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  async processVideo(inputPath: string, messageId: string): Promise<ProcessedMedia> {
    const outputPath = path.join(this.uploadDir, `${messageId}.mp4`);
    const thumbnailPath = path.join('uploads/thumbnails', `${messageId}.jpg`);
    
    let duration = 0;
    try {
      const { stdout: probeOut } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`
      );
      duration = parseFloat(probeOut.trim()) || 0;
    } catch (err) {}

    await execAsync(`
      ffmpeg -i "${inputPath}" \
        -c:v libx264 -preset ultrafast -crf 28 \
        -maxrate 1M -bufsize 2M \
        -vf "scale='min(854,iw)':-2" \
        -c:a aac -b:a 128k -ar 44100 \
        -movflags +faststart \
        -y "${outputPath}"
    `);
    
    await execAsync(`
      ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 \
        -vf "scale=320:-1" -q:v 2 \
        -y "${thumbnailPath}"
    `);
    
    const stats = fs.statSync(outputPath);
    fs.unlinkSync(inputPath);
    
    return {
      originalPath: inputPath,
      compressedPath: outputPath,
      thumbnailPath,
      duration: Math.round(duration),
      size: stats.size,
      mimeType: 'video/mp4'
    };
  }

  async processAudio(inputPath: string, messageId: string): Promise<ProcessedMedia> {
    const outputPath = path.join(this.uploadDir, `${messageId}.m4a`);
    
    console.log(`Processing audio: ${inputPath}`);
    const inputStats = fs.statSync(inputPath);
    console.log(`Input file size: ${inputStats.size} bytes`);
    
    let duration = 0;
    try {
      const { stdout: probeOut } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`
      );
      duration = parseFloat(probeOut.trim()) || 0;
      console.log(`Detected duration: ${duration} seconds`);
    } catch (err) {
      console.error('ffprobe failed, estimating duration...');
      duration = Math.max(1, inputStats.size / 16000);
    }
    
    // Convert WAV or other formats to AAC
    await execAsync(`
      ffmpeg -i "${inputPath}" \
        -c:a aac -b:a 128k -ar 44100 \
        -ac 2 -ar 44100 \
        -movflags +faststart \
        -y "${outputPath}"
    `);
    
    const outputStats = fs.statSync(outputPath);
    console.log(`Output file size: ${outputStats.size} bytes`);
    fs.unlinkSync(inputPath);
    
    return {
      originalPath: inputPath,
      compressedPath: outputPath,
      duration: Math.max(1, Math.round(duration)),
      size: outputStats.size,
      mimeType: 'audio/mp4'
    };
  }

  getMediaUrl(filename: string): string {
    return `/media/${filename.split("/").pop()}`;
  }
}
