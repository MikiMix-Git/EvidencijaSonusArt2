import { useState, useMemo } from 'react';
import { Transaction, formatCurrency } from '../utils/BankStatementParser';
import { Search, Filter, TrendingUp, TrendingDown, Hash } from 'lucide-react';

interface GroupedTransactionsProps {
  transactions: Transaction[];
  currency: string;
}

interface TransactionGroup {
  description: string;
  transactions: Transaction[];
  totalAmount: number;
  totalDebit: number;
  totalCredit: number;
  count: number;
  avgAmount: number;
  firstDate: string;
  lastDate: string;
}

export function GroupedTransactions({ transactions, currency }: GroupedTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'avg'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedData = useMemo(() => {
    const groups = new Map<string, TransactionGroup>();

    transactions.forEach((t) => {
      const key = t.description.trim();
      if (!groups.has(key)) {
        groups.set(key, {
          description: key,
          transactions: [],
          totalAmount: 0,
          totalDebit: 0,
          totalCredit: 0,
          count: 0,
          avgAmount: 0,
          firstDate: t.date,
          lastDate: t.date,
        });
      }

      const group = groups.get(key)!;
      group.transactions.push(t);
      group.totalDebit += t.debit;
      group.totalCredit += t.credit;
      group.totalAmount += Math.max(t.debit, t.credit);
      group.count += 1;

      // Ažuriraj datume
      const [dA, mA, yA] = t.date.split('.').map(Number);
      const dateObj = new Date(yA, mA - 1, dA);
      
      const [dFirst, mFirst, yFirst] = group.firstDate.split('.').map(Number);
      const firstDateObj = new Date(yFirst, mFirst - 1, dFirst);
      
      const [dLast, mLast, yLast] = group.lastDate.split('.').map(Number);
      const lastDateObj = new Date(yLast, mLast - 1, dLast);

      if (dateObj < firstDateObj) group.firstDate = t.date;
      if (dateObj > lastDateObj) group.lastDate = t.date;
    });

    // Izračunaj proseke
    groups.forEach((group) => {
      group.avgAmount = group.totalAmount / group.count;
    });

    return Array.from(groups.values());
  }, [transactions]);

  const filteredAndSorted = useMemo(() => {
    let result = groupedData;

    // Filter
    if (searchTerm) {
      result = result.filter((g) =>
        g.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'total') {
        comparison = a.totalAmount - b.totalAmount;
      } else if (sortBy === 'count') {
        comparison = a.count - b.count;
      } else if (sortBy === 'avg') {
        comparison = a.avgAmount - b.avgAmount;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [groupedData, searchTerm, sortBy, sortOrder]);

  const toggleGroup = (description: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(description)) {
      newExpanded.delete(description);
    } else {
      newExpanded.add(description);
    }
    setExpandedGroups(newExpanded);
  };

  const totalGroups = filteredAndSorted.length;
  const totalTransactions = filteredAndSorted.reduce((sum, g) => sum + g.count, 0);
  const totalAmount = filteredAndSorted.reduce((sum, g) => sum + g.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Ukupno grupa</p>
          <p className="text-2xl font-bold text-white">{totalGroups}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Ukupno transakcija</p>
          <p className="text-2xl font-bold text-white">{totalTransactions}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Ukupan iznos</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalAmount, currency)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pretraži po opisu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="total">Sortiraj po ukupnom iznosu</option>
            <option value="count">Sortiraj po broju transakcija</option>
            <option value="avg">Sortiraj po prosečnom iznosu</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white hover:bg-slate-700/50 transition-colors"
          >
            {sortOrder === 'desc' ? '↓ Opadajuće' : '↑ Rastuće'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Filter size={14} />
        <span>{filteredAndSorted.length} grupa prikazano</span>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {filteredAndSorted.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-8 text-center text-slate-500">
            Nema pronađenih grupa
          </div>
        ) : (
          filteredAndSorted.map((group) => {
            const isExpanded = expandedGroups.has(group.description);
            const isExpense = group.totalDebit > group.totalCredit;

            return (
              <div
                key={group.description}
                className="bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden"
              >
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.description)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isExpense ? 'bg-red-500/10' : 'bg-green-500/10'
                    }`}>
                      {isExpense ? (
                        <TrendingDown size={20} className="text-red-400" />
                      ) : (
                        <TrendingUp size={20} className="text-green-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-white font-medium truncate">{group.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Hash size={10} />
                          {group.count} {group.count === 1 ? 'transakcija' : 'transakcije'}
                        </span>
                        <span>
                          {group.firstDate} - {group.lastDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Ukupno</p>
                      <p className={`text-lg font-bold font-mono ${
                        isExpense ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {formatCurrency(group.totalAmount, currency)}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">Prosek</p>
                      <p className="text-sm font-mono text-slate-300">
                        {formatCurrency(group.avgAmount, currency)}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Transactions */}
                {isExpanded && (
                  <div className="border-t border-slate-700/30 bg-slate-900/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-900/50">
                          <tr>
                            <th className="text-left p-3 text-slate-400 font-medium">Datum</th>
                            <th className="text-right p-3 text-green-400 font-medium">Ulaz</th>
                            <th className="text-right p-3 text-red-400 font-medium">Izlaz</th>
                            <th className="text-right p-3 text-slate-400 font-medium">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.transactions
                            .sort((a, b) => {
                              const [dA, mA, yA] = a.date.split('.').map(Number);
                              const [dB, mB, yB] = b.date.split('.').map(Number);
                              const dateA = new Date(yA, mA - 1, dA);
                              const dateB = new Date(yB, mB - 1, dB);
                              return dateA.getTime() - dateB.getTime();
                            })
                            .map((t, i) => (
                              <tr key={i} className="border-t border-slate-700/20">
                                <td className="p-3 text-slate-300 whitespace-nowrap">{t.date}</td>
                                <td className="p-3 text-right font-mono whitespace-nowrap">
                                  {t.credit > 0 ? (
                                    <span className="text-green-400">+{formatCurrency(t.credit, currency)}</span>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono whitespace-nowrap">
                                  {t.debit > 0 ? (
                                    <span className="text-red-400">-{formatCurrency(t.debit, currency)}</span>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono text-slate-300 whitespace-nowrap">
                                  {t.balance !== undefined ? formatCurrency(t.balance, currency) : '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
