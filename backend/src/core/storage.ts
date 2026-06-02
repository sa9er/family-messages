import fs from 'fs';

export function ensureUploadDirectories() {
  const dirs = ['uploads', 'uploads/media', 'uploads/temp', 'uploads/thumbnails'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}
