"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class MediaService {
    uploadDir;
    tempDir;
    constructor(uploadDir = 'uploads/media', tempDir = 'uploads/temp') {
        this.uploadDir = uploadDir;
        this.tempDir = tempDir;
        this.ensureDirectories();
    }
    ensureDirectories() {
        ['uploads/media', 'uploads/temp', 'uploads/thumbnails', 'uploads/original'].forEach(dir => {
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
        });
    }
    async processVideo(inputPath, messageId) {
        const outputPath = path.join(this.uploadDir, `${messageId}.mp4`);
        const thumbnailPath = path.join('uploads/thumbnails', `${messageId}.jpg`);
        console.log(`Processing video: ${inputPath}`);
        const inputStats = fs.statSync(inputPath);
        console.log(`Input size: ${inputStats.size} bytes`);
        // Get duration
        let duration = 0;
        try {
            const { stdout: probeOut } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`);
            duration = parseFloat(probeOut.trim()) || 0;
            console.log(`Detected duration: ${duration} seconds`);
        }
        catch (err) {
            console.error('ffprobe failed:', err);
        }
        if (duration < 0.5) {
            console.warn('Video duration is very short, may be corrupted');
        }
        // Process video with better error handling
        try {
            await execAsync(`
        ffmpeg -i "${inputPath}" \
          -c:v libx264 -preset ultrafast -crf 28 \
          -maxrate 1M -bufsize 2M \
          -vf "scale='min(854,iw)':-2" \
          -c:a aac -b:a 96k \
          -movflags +faststart \
          -y "${outputPath}" 2>&1
      `);
            const outputStats = fs.statSync(outputPath);
            console.log(`Output size: ${outputStats.size} bytes`);
            // Generate thumbnail
            await execAsync(`
        ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 \
          -vf "scale=320:-1" -q:v 2 \
          -y "${thumbnailPath}" 2>&1
      `);
            fs.unlinkSync(inputPath);
            return {
                originalPath: inputPath,
                compressedPath: outputPath,
                thumbnailPath,
                duration: Math.round(duration),
                size: outputStats.size,
                mimeType: 'video/mp4'
            };
        }
        catch (err) {
            console.error('FFmpeg video processing failed:', err);
            throw err;
        }
    }
    async processAudio(inputPath, messageId) {
        const outputPath = path.join(this.uploadDir, `${messageId}.m4a`);
        console.log(`Processing audio: ${inputPath}`);
        const inputStats = fs.statSync(inputPath);
        console.log(`Input size: ${inputStats.size} bytes`);
        // Get duration
        let duration = 0;
        try {
            const { stdout: probeOut } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`);
            duration = parseFloat(probeOut.trim()) || 0;
            console.log(`Detected duration: ${duration} seconds`);
        }
        catch (err) {
            console.error('ffprobe failed:', err);
        }
        if (duration < 0.5 && inputStats.size > 10000) {
            console.warn('Duration detection may be incorrect, using file size estimate');
            duration = Math.max(1, inputStats.size / 16000); // Rough estimate
        }
        // Process audio with better compatibility
        try {
            await execAsync(`
        ffmpeg -i "${inputPath}" \
          -c:a aac -b:a 64k \
          -ac 2 -ar 44100 \
          -movflags +faststart \
          -y "${outputPath}" 2>&1
      `);
            const outputStats = fs.statSync(outputPath);
            console.log(`Output size: ${outputStats.size} bytes`);
            if (outputStats.size < 1000 && inputStats.size > 1000) {
                console.warn('Output file is very small, input may be corrupted');
            }
            fs.unlinkSync(inputPath);
            return {
                originalPath: inputPath,
                compressedPath: outputPath,
                duration: Math.max(1, Math.round(duration)),
                size: outputStats.size,
                mimeType: 'audio/mp4'
            };
        }
        catch (err) {
            console.error('FFmpeg audio processing failed:', err);
            throw err;
        }
    }
    getMediaUrl(filename) {
        return `/media/${filename}`;
    }
}
exports.MediaService = MediaService;
//# sourceMappingURL=MediaService.js.map