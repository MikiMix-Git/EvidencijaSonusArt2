import { Transaction, CategorySummary, MonthlySummary } from '../types';

const CATEGORIES: Record<string, RegExp[]> = {
  'Hrana i piće': [/restaurant/i, /kafic/i, /pekara/i, /supermarket/i, /market/i, /shop/i, /bakery/i, /cafe/i, /food/i, /restoran/i, /maxi/i, /idea/i, /mini maxi/i, /dm shop/i, /univerexport/i, /merkator/i, /dis/i, /lidl/i],
  'Transport': [/taxi/i, /uber/i, /bolt/i, /gorivo/i, /nais/i, /shell/i, /omv/i, /mol/i, /parking/i, /bus/i, /tramvaj/i, /metro/i, /gas station/i, /fuel/i, /petrol/i, /gasoline/i, /putarina/i, /toll/i],
  'Stanovanje': [/stanarina/i, /rent/i, /struja/i, /voda/i, /gas/i, /grejanje/i, /internet/i, /telekom/i, /mts/i, /telenor/i, /a1/i, /yettel/i, /telekomunikacije/i, /utility/i, /electricity/i, /water bill/i, /heating/i, /housing/i],
  'Zdravlje': [/apoteka/i, /pharmacy/i, /bolnica/i, /hospital/i, /doctor/i, /lek/i, /medicina/i, /health/i, /medical/i, /apoteke/i, /benu/i, /srbotrade/i],
  'Zabava': [/cinema/i, /bioskop/i, /netflix/i, /spotify/i, /youtube/i, /hobby/i, /sport/i, /gym/i, /teretana/i, /fitness/i, /entertainment/i, /game/i, /igra/i],
  'Obrazovanje': [/skola/i, /school/i, /univerzitet/i, /university/i, /kurs/i, /course/i, /education/i, /knjiga/i, /book/i, /biblioteka/i, /library/i],
  'Osiguranje': [/osiguranje/i, /insurance/i, /polisa/i, /policy/i],
  'Plata': [/plata/i, /salary/i, /wage/i, /payroll/i, /zarada/i, /neto plata/i],
  'Transfer': [/transfer/i, /prebacivanje/i, /uplata/i, /isplata/i, /payment/i, /withdrawal/i, /deposit/i, /transakcija/i],
};

function categorizeTransaction(description: string): string {
  for (const [category, patterns] of Object.entries(CATEGORIES)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        return category;
      }
    }
  }
  return 'Ostalo';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function parseTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  
  // Common patterns for bank statement transactions
  // Pattern 1: DD.MM.YYYY description amount
  const pattern1 = /(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\s+(.+?)\s+(-?[\d.,]+)\s*$/;
  
  // Pattern 2: Date | Description | Amount
  const pattern2 = /(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\s*[|]\s*(.+?)\s*[|]\s*(-?[\d.,]+)\s*/;
  
  // Pattern 3: DD/MM/YYYY - Description - Amount
  const pattern3 = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+[-–]\s+(.+?)\s+[-–]\s*(-?[\d.,]+)\s*/;
  
  // Pattern 4: Amount with currency (RSD, EUR, etc.)
  const pattern4 = /(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\s+(.+?)\s+(-?[\d.,]+)\s*(?:RSD|EUR|USD|CNY|CNY)/i;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;
    
    let match = trimmed.match(pattern1) || trimmed.match(pattern2) || trimmed.match(pattern3) || trimmed.match(pattern4);
    
    if (match) {
      const dateStr = match[1];
      const description = match[2].trim();
      const amountStr = match[3].replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (!isNaN(amount) && description.length > 1) {
        const formattedDate = formatDate(dateStr);
        transactions.push({
          id: generateId(),
          date: formattedDate,
          description: description,
          amount: Math.abs(amount),
          type: amount >= 0 ? 'income' : 'expense',
          category: categorizeTransaction(description),
        });
      }
    }
  }
  
  // If no structured patterns found, try to extract any amounts
  if (transactions.length === 0) {
    const amountPattern = /(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\s+(.+?)\s+([\d.,]+(?:\s*\d{3})*[.,]\d{2})/g;
    let m;
    while ((m = amountPattern.exec(text)) !== null) {
      const dateStr = m[1];
      const description = m[2].trim();
      const amountStr = m[3].replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (!isNaN(amount) && description.length > 1) {
        transactions.push({
          id: generateId(),
          date: formatDate(dateStr),
          description,
          amount: Math.abs(amount),
          type: 'expense',
          category: categorizeTransaction(description),
        });
      }
    }
  }
  
  return transactions;
}

function formatDate(dateStr: string): string {
  // Normalize date format
  const parts = dateStr.split(/[.\/\-]/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${day}.${month}.${year}`;
  }
  return dateStr;
}

export function calculateSummary(transactions: Transaction[]) {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
  };
}

export function getCategorySummary(transactions: Transaction[]): CategorySummary[] {
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  
  const categoryMap = new Map<string, { total: number; count: number }>();
  
  expenses.forEach(t => {
    const existing = categoryMap.get(t.category) || { total: 0, count: 0 };
    categoryMap.set(t.category, {
      total: existing.total + t.amount,
      count: existing.count + 1,
    });
  });
  
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getMonthlySummary(transactions: Transaction[]): MonthlySummary[] {
  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  
  transactions.forEach(t => {
    const parts = t.date.split('.');
    if (parts.length >= 2) {
      const monthKey = `${parts[1]}/${parts[2] || '2024'}`;
      const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
      
      if (t.type === 'income') {
        existing.income += t.amount;
      } else {
        existing.expenses += t.amount;
      }
      
      monthlyMap.set(monthKey, existing);
    }
  });
  
  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month: month,
      income: data.income,
      expenses: data.expenses,
    }))
    .sort((a, b) => {
      const [monthA, yearA] = a.month.split('/');
      const [monthB, yearB] = b.month.split('/');
      return parseInt(yearA) - parseInt(yearB) || parseInt(monthA) - parseInt(monthB);
    });
}
