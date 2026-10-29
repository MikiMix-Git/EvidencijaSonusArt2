import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchTerm) {
      result = result.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = a.date.split('.').reverse().join('');
        const dateB = b.date.split('.').reverse().join('');
        comparison = dateA.localeCompare(dateB);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else {
        comparison = a.description.localeCompare(b.description);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchTerm, typeFilter, categoryFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pretraži transakcije..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setCurrentPage(1); }}
              className="pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm appearance-none bg-white cursor-pointer"
            >
              <option value="all">Svi tipovi</option>
              <option value="income">Prihodi</option>
              <option value="expense">Rashodi</option>
            </select>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm appearance-none bg-white cursor-pointer"
          >
            <option value="all">Sve kategorije</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Prikazano {filteredTransactions.length} od {transactions.length} transakcija
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Datum
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center gap-1">
                  Opis
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Kategorija
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Iznos
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  <p className="text-lg">Nema pronađenih transakcija</p>
                  <p className="text-sm mt-1">Pokušajte sa drugim filterima ili uploadujte drugi PDF</p>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {transaction.date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                      ${getCategoryColor(transaction.category)}
                    `}>
                      {transaction.category}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap
                    ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}
                  `}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Prethodna
          </button>
          <span className="text-sm text-gray-600">
            Strana {currentPage} od {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sledeća <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Hrana i piće': 'bg-orange-100 text-orange-700',
    'Transport': 'bg-blue-100 text-blue-700',
    'Stanovanje': 'bg-purple-100 text-purple-700',
    'Zdravlje': 'bg-red-100 text-red-700',
    'Zabava': 'bg-pink-100 text-pink-700',
    'Obrazovanje': 'bg-indigo-100 text-indigo-700',
    'Osiguranje': 'bg-gray-100 text-gray-700',
    'Plata': 'bg-green-100 text-green-700',
    'Transfer': 'bg-cyan-100 text-cyan-700',
    'Ostalo': 'bg-gray-100 text-gray-600',
  };
  return colors[category] || colors['Ostalo'];
}
