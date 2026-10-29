import { PageData } from '../types/App.types';

export interface Transaction {
  id: string;
  date: string;
  dateObj: Date;
  description: string;
  counterparty: string;
  amount: number;
  type: 'income' | 'expense';
  debit: number;
  credit: number;
  balance?: number;
  reference?: string;
  category?: string;
  rawLine: string;
  statementDate?: string;
}

export interface BankStatementSummary {
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  statementNumber?: number;
  turnover?: number;
  oldBalance?: number;
  balanceChange?: number;
  newBalance?: number;
}

const CATEGORIES: Record<string, string[]> = {
  'Plata': ['plata', 'plaća', 'salary', 'wages'],
  'Hrana': ['restoran', 'market', 'supermarket', 'hrana', 'kafić', 'pekara'],
  'Režije': ['elektro', 'voda', 'plin', 'toplan', 'telekom', 'internet', 'struja'],
  'Gorivo': ['gorivo', 'benz', 'shell', 'ina', 'nis', 'petrol', 'fuel'],
  'Zdravlje': ['apotek', 'pharmacy', 'bolnic', 'klinika', 'doktor'],
  'Transport': ['taxi', 'uber', 'bolt', 'parking', 'registracija'],
  'Nakupovina': ['shopping', 'trgovina', 'boutique', 'fashion', 'sport'],
  'Stanovanje': ['stanarina', 'rent', 'kirija', 'nekretnin'],
  'Transfer': ['transfer', 'nalog', 'uplata', 'isplata', 'prebacivanje', 'prijenos'],
  'Banka': ['provizija', 'naknada', 'banka', 'commission', 'usluge'],
  'Konverzija': ['konverziju', 'konverzija', 'tečaj', 'tecaj', 'devize', 'exch'],
};

function categorize(description: string): string {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'Ostalo';
}

const DATE_PATTERN = /(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/;

function parseDate(text: string): { date: string; dateObj: Date } | null {
  const match = text.match(DATE_PATTERN);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    let year = parseInt(match[3]);
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1990 && year <= 2030) {
      const dateObj = new Date(year, month, day);
      const date = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
      return { date, dateObj };
    }
  }
  return null;
}

function detectCurrency(text: string, fileName?: string): string {
  if (fileName) {
    const upperFileName = fileName.toUpperCase();
    if (upperFileName.includes('_EUR') || upperFileName.includes('EUR')) return 'EUR';
    if (upperFileName.includes('_BAM') || upperFileName.includes('BAM')) return 'BAM';
  }
  
  const upper = text.toUpperCase();
  if (upper.includes('978') && upper.includes('EUR')) return 'EUR';
  if (upper.includes('BAM') || upper.includes('KM')) return 'BAM';
  if (upper.includes('EUR') || upper.includes('€')) return 'EUR';
  if (upper.includes('USD') || upper.includes('$')) return 'USD';
  return 'EUR';
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(/[€$KM]/g, '');
  if (/^-?\d{1,3}([.,]\d{3})*[.,]\d{2}$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }
  if (/^-?\d+[.,]\d{2}$/.test(cleaned)) {
    const normalized = cleaned.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }
  return null;
}

type TextLine = {
  y: number;
  items: { text: string; x: number }[];
};

function groupItemsIntoLines(items: { text: string; x: number; y: number }[]): TextLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: TextLine[] = [];
  let currentLine: TextLine = { y: sorted[0].y, items: [] };

  for (const item of sorted) {
    if (Math.abs(item.y - currentLine.y) < 3) {
      currentLine.items.push({ text: item.text, x: item.x });
    } else {
      currentLine.items.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = { y: item.y, items: [{ text: item.text, x: item.x }] };
    }
  }
  currentLine.items.sort((a, b) => a.x - b.x);
  lines.push(currentLine);

  return lines;
}

function extractStatementNumber(text: string): number | undefined {
  const match = text.match(/IZVOD\s+br:\s*(\d+)/i);
  if (match) {
    return parseInt(match[1]);
  }
  return undefined;
}

function parseUnicreditFormat(pages: PageData[], fileName?: string): BankStatementSummary {
  const allText = pages.map((p) => p.text).join('\n');
  const currency = detectCurrency(allText, fileName);
  const isBAM = currency === 'BAM';
  const statementNumber = extractStatementNumber(allText);
  const transactions: Transaction[] = [];
  
  let turnover = 0;
  let oldBalance = 0;
  let balanceChange = 0;
  let newBalance = 0;

  for (const page of pages) {
    const items = page.items;
    const lines = groupItemsIntoLines(items);
    
    let currentTransaction: {
      reference?: string;
      dateKnj?: string;
      dateVal?: string;
      description: string[];
      debit: number;
      credit: number;
    } | null = null;

    let statementDate: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineText = line.items.map((item) => item.text).join(' ');

      const statementDateMatch = lineText.match(/Na\s+dan:\s*(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})/i);
      if (statementDateMatch) {
        const dateInfo = parseDate(statementDateMatch[1]);
        if (dateInfo) {
          statementDate = dateInfo.date;
        }
      }

      if (lineText.match(/Stari saldo/i)) {
        const numbers: number[] = [];
        const xMin = isBAM ? 510 : 300;
        const xMax = isBAM ? 560 : 460;
        for (const item of line.items) {
          if (item.x >= xMin && item.x < xMax) {
            const num = parseNumber(item.text);
            if (num !== null) numbers.push(num);
          }
        }
        if (numbers.length > 0) {
          oldBalance = numbers[numbers.length - 1];
        }
        continue;
      }
      if (lineText.match(/Saldo prometa/i)) {
        const numbers: number[] = [];
        const xMin = isBAM ? 440 : 300;
        const xMax = isBAM ? 600 : 460;
        for (const item of line.items) {
          if (item.x >= xMin && item.x < xMax) {
            const num = parseNumber(item.text);
            if (num !== null) numbers.push(num);
          }
        }
        if (numbers.length > 0) {
          balanceChange = numbers[numbers.length - 1];
        }
        continue;
      }
      if (lineText.match(/Promet/i)) {
        const numbers: number[] = [];
        const xMin = isBAM ? 440 : 250;
        const xMax = isBAM ? 520 : 375;
        for (const item of line.items) {
          if (item.x >= xMin && item.x < xMax) {
            const num = parseNumber(item.text);
            if (num !== null) numbers.push(num);
          }
        }
        if (numbers.length > 0) {
          turnover = numbers[0];
        }
        continue;
      }
      if (lineText.match(/Novi saldo/i)) {
        const numbers: number[] = [];
        const xMin = isBAM ? 510 : 300;
        const xMax = isBAM ? 600 : 600;
        
        for (const item of line.items) {
          const num = parseNumber(item.text);
          if (num !== null && item.x >= xMin && item.x < xMax) {
            numbers.push(num);
          }
        }
        
        for (let i = 0; i < numbers.length; i++) {
          if (numbers[i] !== 0) {
            newBalance = numbers[i];
            break;
          }
        }
        continue;
      }

      if (lineText.match(/IZVADAK|IZVOD|Strana:|Datum:|br:|SONUS|Klijent:|Adresa:|BIC:|IBAN:|ID broj:|Knjiženo|Šifra|\* KM protuvrijednost/i)) {
        continue;
      }

      if (line.items.some(item => item.text.match(/^(Referenca|Opis|Duguje|Potražuje)$/i))) {
        continue;
      }

      const reference: string[] = [];
      const dateKnj: string[] = [];
      const dateVal: string[] = [];
      const description: string[] = [];
      const debitEUR: number[] = [];
      const creditEUR: number[] = [];
      const debitBAM: number[] = [];
      const creditBAM: number[] = [];

      for (const item of line.items) {
        const text = item.text.trim();
        if (!text) continue;

        const x = item.x;
        
        if (isBAM) {
          if (x < 80) {
            reference.push(text);
          } else if (x >= 80 && x < 130) {
            dateKnj.push(text);
          } else if (x >= 144 && x < 440) {
            description.push(text);
          } else if (x >= 440 && x < 520) {
            const num = parseNumber(text);
            if (num !== null) debitBAM.push(num);
          } else if (x >= 520 && x < 600) {
            const num = parseNumber(text);
            if (num !== null) creditBAM.push(num);
          }
        } else {
          if (x < 60) {
            reference.push(text);
          } else if (x >= 60 && x < 110) {
            dateKnj.push(text);
          } else if (x >= 110 && x < 160) {
            dateVal.push(text);
          } else if (x >= 160 && x < 300) {
            const num = parseNumber(text);
            if (num !== null && x >= 250) {
              debitEUR.push(num);
            } else {
              description.push(text);
            }
          } else if (x >= 250 && x < 375) {
            const num = parseNumber(text);
            if (num !== null) debitEUR.push(num);
          } else if (x >= 375 && x < 460) {
            const num = parseNumber(text);
            if (num !== null) creditEUR.push(num);
          }
        }
      }

      const hasTransaction = dateKnj.length > 0 && (debitEUR.length > 0 || creditEUR.length > 0 || debitBAM.length > 0 || creditBAM.length > 0);
      
      if (hasTransaction) {
        if (currentTransaction && currentTransaction.dateKnj) {
          const desc = currentTransaction.description.join(' ').trim();
          if (currentTransaction.debit > 0 || currentTransaction.credit > 0) {
            const dateInfo = parseDate(currentTransaction.dateKnj);
            if (dateInfo) {
              let finalDesc = desc;
              if (finalDesc.length === 0) {
                const prevLineIndex = i - 1;
                if (prevLineIndex >= 0) {
                  const prevLine = lines[prevLineIndex];
                  const prevDesc: string[] = [];
                  for (const item of prevLine.items) {
                    if (item.x >= 144 && item.x < 440) {
                      prevDesc.push(item.text.trim());
                    }
                  }
                  finalDesc = prevDesc.join(' ').trim();
                }
              }
              
              transactions.push({
                id: `txn_${page.pageNumber}_${transactions.length}`,
                date: dateInfo.date,
                dateObj: dateInfo.dateObj,
                description: finalDesc || 'Nepoznata stavka',
                counterparty: '',
                amount: Math.max(currentTransaction.debit, currentTransaction.credit),
                type: currentTransaction.credit > currentTransaction.debit ? 'income' : 'expense',
                credit: currentTransaction.credit,
                debit: currentTransaction.debit,
                balance: undefined,
                category: categorize(finalDesc),
                rawLine: finalDesc,
                reference: currentTransaction.reference,
                statementDate: statementDate || undefined,
              });
            }
          }
        }

        let debitAmount = 0;
        let creditAmount = 0;
        
        if (debitEUR.length > 0 || creditEUR.length > 0) {
          debitAmount = debitEUR[0] || 0;
          creditAmount = creditEUR[0] || 0;
        } else if (debitBAM.length > 0 || creditBAM.length > 0) {
          debitAmount = debitBAM[0] || 0;
          creditAmount = creditBAM[0] || 0;
        }

        currentTransaction = {
          reference: reference[0],
          dateKnj: dateKnj[0],
          dateVal: dateVal[0],
          description: description,
          debit: debitAmount,
          credit: creditAmount,
        };
      } else if (currentTransaction && description.length > 0) {
        const filteredDescription = description.filter(item => 
          !item.match(/Promet u valuti:|Iznos odobrenog|overdrafta:|Stari saldo:|Novi saldo:|Saldo prometa:/i)
        );
        currentTransaction.description.push(...filteredDescription);
      }
    }

    if (currentTransaction && currentTransaction.dateKnj) {
      const desc = currentTransaction.description.join(' ').trim();
      if (desc.length > 0 && (currentTransaction.debit > 0 || currentTransaction.credit > 0)) {
        const dateInfo = parseDate(currentTransaction.dateKnj);
        if (dateInfo) {
          transactions.push({
            id: `txn_${page.pageNumber}_${transactions.length}`,
            date: dateInfo.date,
            dateObj: dateInfo.dateObj,
            description: desc,
            counterparty: '',
            amount: Math.max(currentTransaction.debit, currentTransaction.credit),
            type: currentTransaction.credit > currentTransaction.debit ? 'income' : 'expense',
            credit: currentTransaction.credit,
            debit: currentTransaction.debit,
            balance: undefined,
            category: categorize(desc),
            rawLine: desc,
            reference: currentTransaction.reference,
            statementDate: statementDate || undefined,
          });
        }
      }
    }
  }

  transactions.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  if (newBalance !== 0 && transactions.length > 0) {
    transactions[transactions.length - 1].balance = newBalance;
  }

  const totalIncome = transactions.reduce((sum, t) => sum + t.credit, 0);
  const totalExpense = transactions.reduce((sum, t) => sum + t.debit, 0);

  const firstBalance = transactions[0]?.balance;
  const lastBalance = transactions[transactions.length - 1]?.balance;
  const openingBalance: number = firstBalance !== undefined
    ? firstBalance - (transactions[0].credit - transactions[0].debit)
    : oldBalance;
  const closingBalance: number = lastBalance !== undefined
    ? lastBalance
    : newBalance !== 0 ? newBalance : openingBalance + totalIncome - totalExpense;

  return {
    transactions,
    totalIncome,
    totalExpense,
    netChange: totalIncome - totalExpense,
    openingBalance,
    closingBalance,
    currency,
    periodStart: transactions.length > 0 ? transactions[0].date : '',
    periodEnd: transactions.length > 0 ? transactions[transactions.length - 1].date : '',
    transactionCount: transactions.length,
    statementNumber,
    turnover,
    oldBalance,
    balanceChange,
    newBalance,
  };
}

export function parseBankStatement(pages: PageData[], fileName?: string): BankStatementSummary {
  return parseUnicreditFormat(pages, fileName);
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    BAM: 'KM',
    USD: '$',
    RSD: 'RSD',
    HRK: 'kn',
  };
  const symbol = symbols[currency] || currency;
  const formatted = Math.abs(amount).toLocaleString('bs-BA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${formatted} ${symbol}`;
}
