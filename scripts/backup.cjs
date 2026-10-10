const fs = require('fs');
const path = require('path');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve(process.cwd(), 'backups', timestamp);

fs.mkdirSync(backupDir, { recursive: true });

console.log('--- Starting System Backup to:', backupDir);

// 1. Backup SQLite Database
const dbSrc = path.resolve(process.cwd(), 'prisma/dev.db');
const dbDest = path.join(backupDir, 'dev.db');
if (fs.existsSync(dbSrc)) {
  fs.copyFileSync(dbSrc, dbDest);
  console.log('[Backup OK] Database copied: prisma/dev.db');
} else {
  console.log('[Backup Warn] No database file found at prisma/dev.db');
}

// 2. Backup Private Customer Uploads
const uploadsSrc = path.resolve(process.cwd(), 'storage/uploads');
const uploadsDest = path.join(backupDir, 'uploads');
fs.mkdirSync(uploadsDest, { recursive: true });

if (fs.existsSync(uploadsSrc)) {
  const files = fs.readdirSync(uploadsSrc);
  let count = 0;
  for (const file of files) {
    if (file !== '.gitkeep') {
      fs.copyFileSync(path.join(uploadsSrc, file), path.join(uploadsDest, file));
      count++;
    }
  }
  console.log(`[Backup OK] ${count} customer artwork files archived.`);
}

console.log('=== Backup Complete ===');
