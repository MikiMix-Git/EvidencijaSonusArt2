import { openDB, type IDBPDatabase } from 'idb';
import type { BankStatement } from '../types/BankStatement';

const DB_NAME = 'BankStatementDB';
const DB_VERSION = 1;
const STORE_NAME = 'statements';

// Tip za sačuvani statement (bez pages data da ne bude preveliko)
export interface SavedStatement {
  id: string;
  fileName: string;
  uploadDate: string; // ISO string
  metadata: {
    title: string;
    author: string;
    subject: string;
    creator: string;
    producer: string;
    pageCount: number;
    fileSize: string;
    fileName: string;
  };
  summary: BankStatement['summary'];
  savedAt: string; // ISO string
}

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('fileName', 'fileName', { unique: false });
        store.createIndex('uploadDate', 'uploadDate', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    },
  });
  
  return dbInstance;
}

// Čuvanje statementa u bazu
export async function saveStatement(statement: BankStatement): Promise<void> {
  const db = await getDB();
  const saved: SavedStatement = {
    id: statement.id,
    fileName: statement.fileName,
    uploadDate: statement.uploadDate.toISOString(),
    metadata: statement.metadata,
    summary: statement.summary,
    savedAt: new Date().toISOString(),
  };
  await db.put(STORE_NAME, saved);
}

// Čuvanje više statementa
export async function saveStatements(statements: BankStatement[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  
  for (const statement of statements) {
    const saved: SavedStatement = {
      id: statement.id,
      fileName: statement.fileName,
      uploadDate: statement.uploadDate.toISOString(),
      metadata: statement.metadata,
      summary: statement.summary,
      savedAt: new Date().toISOString(),
    };
    await tx.store.put(saved);
  }
  
  await tx.done;
}

// Učitavanje svih statementa iz baze
export async function loadAllStatements(): Promise<BankStatement[]> {
  const db = await getDB();
  const savedStatements = await db.getAll(STORE_NAME);
  
  return savedStatements.map((saved) => ({
    id: saved.id,
    fileName: saved.fileName,
    uploadDate: new Date(saved.uploadDate),
    metadata: saved.metadata,
    summary: saved.summary,
    pages: [], // Pages data se ne čuva u bazi
  }));
}

// Brisanje pojedinačnog statementa
export async function deleteStatement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

// Brisanje cele baze
export async function deleteAllStatements(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

// Provera da li statement postoji u bazi
export async function statementExists(id: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.get(STORE_NAME, id);
  return result !== undefined;
}

// Dobijanje veličine baze (približno)
export async function getDBStats(): Promise<{ count: number; estimatedSize: string }> {
  const db = await getDB();
  const allItems = await db.getAll(STORE_NAME);
  const count = allItems.length;
  
  // Procena veličine
  const jsonSize = JSON.stringify(allItems).length;
  const sizeKB = (jsonSize / 1024).toFixed(1);
  const sizeMB = (jsonSize / (1024 * 1024)).toFixed(2);
  
  const estimatedSize = jsonSize > 1024 * 1024 
    ? `${sizeMB} MB` 
    : `${sizeKB} KB`;
  
  return { count, estimatedSize };
}

// Export baze kao JSON
export async function exportDBAsJSON(): Promise<string> {
  const db = await getDB();
  const allItems = await db.getAll(STORE_NAME);
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    version: DB_VERSION,
    count: allItems.length,
    statements: allItems,
  }, null, 2);
}

// Import baze iz JSON-a
export async function importDBFromJSON(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString);
  const statements: SavedStatement[] = data.statements || [];
  
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  
  for (const stmt of statements) {
    await tx.store.put(stmt);
  }
  
  await tx.done;
  return statements.length;
}
