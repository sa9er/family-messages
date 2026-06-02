import fs from 'fs';
import path from 'path';

export function ensureUploadDirectories() {
  const dirs = ['uploads', 'uploads/media', 'uploads/temp', 'uploads/thumbnails'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}
