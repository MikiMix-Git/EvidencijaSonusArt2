export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  balance?: number;
}

export interface BankStatement {
  fileName: string;
  accountNumber?: string;
  period?: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
}
