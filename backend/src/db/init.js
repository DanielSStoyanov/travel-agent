import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(__dirname, '../../data/travel.db');
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase() {
  const database = getDatabase();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  database.exec(schema);
  console.log('Database initialized');
}
