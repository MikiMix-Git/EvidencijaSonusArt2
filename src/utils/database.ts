import { openDB, IDBPDatabase } from 'idb';
import type { BankStatement } from '../types/BankStatement';

const DB_NAME = 'BankovniIzvodiDB';
const DB_VERSION = 1;
const STORE_NAME = 'statements';

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  
  return dbInstance;
}

/**
 * Učitaj sve sačuvane izvode iz baze
 */
export async function loadAllStatements(): Promise<BankStatement[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  // Rekonstruiši Date objekte iz stringova (JSON serializacija gubi Date tip)
  return all.map((stmt: any) => ({
    ...stmt,
    uploadDate: new Date(stmt.uploadDate),
    summary: {
      ...stmt.summary,
      transactions: stmt.summary.transactions.map((t: any) => ({
        ...t,
        dateObj: new Date(t.dateObj),
      })),
    },
  }));
}

/**
 * Sačuvaj jedan izvod u bazu (insert ili update)
 */
export async function saveStatement(statement: BankStatement): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, statement);
}

/**
 * Sačuvaj sve izvode u bazu (zameni celu bazu)
 */
export async function saveAllStatements(statements: BankStatement[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Obriši sve postojeće
  await store.clear();
  
  // Sačuvaj sve nove
  for (const stmt of statements) {
    await store.put(stmt);
  }
  
  await tx.done;
}

/**
 * Obriši jedan izvod iz baze po ID-u
 */
export async function deleteStatement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Obriši SVE izvode iz baze (prazna baza)
 */
export async function deleteAllStatements(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}

/**
 * Vrati statistike o bazi (broj izvoda, procenjena veličina)
 */
export async function getDBStats(): Promise<{ count: number; estimatedSize: string }> {
  const db = await getDB();
  const count = await db.count(STORE_NAME);
  
  // Procenjena veličina na osnovu broja izvoda
  // Prosečan izvod ima ~50 transakcija, svaka ~200 bajta JSON
  const estimatedBytes = count * 50 * 200;
  let estimatedSize: string;
  if (estimatedBytes < 1024) {
    estimatedSize = `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    estimatedSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    estimatedSize = `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  return { count, estimatedSize };
}

/**
 * Exportuj celu bazu kao JSON string
 */
export async function exportDBAsJSON(): Promise<string> {
  const statements = await loadAllStatements();
  const exportData = {
    version: DB_VERSION,
    exportDate: new Date().toISOString(),
    statementCount: statements.length,
    statements,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Importuj bazu iz JSON stringa
 * @returns broj uvezenih izvoda
 */
export async function importDBFromJSON(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString);
  
  if (!data.statements || !Array.isArray(data.statements)) {
    throw new Error('Nevažeći format baze podataka. Očekuje se polje "statements".');
  }
  
  const statements: BankStatement[] = data.statements.map((stmt: any) => ({
    ...stmt,
    uploadDate: new Date(stmt.uploadDate),
    summary: {
      ...stmt.summary,
      transactions: stmt.summary.transactions.map((t: any) => ({
        ...t,
        dateObj: new Date(t.dateObj),
      })),
    },
  }));
  
  await saveAllStatements(statements);
  return statements.length;
}

/**
 * Proveri da li baza postoji i ima podatke
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const db = await getDB();
  const count = await db.count(STORE_NAME);
  return count === 0;
}
