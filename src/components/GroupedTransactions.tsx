import { useState, useMemo } from 'react';
import { Transaction, formatCurrency } from '../utils/BankStatementParser';
import { Search, Filter, TrendingUp, TrendingDown, Hash, Tag } from 'lucide-react';

interface GroupedTransactionsProps {
  transactions: Transaction[];
  currency: string;
}

interface TransactionGroup {
  keywords: string[];
  transactions: Transaction[];
  totalAmount: number;
  totalDebit: number;
  totalCredit: number;
  count: number;
  avgAmount: number;
  firstDate: string;
  lastDate: string;
}

// Stop words koje ne nose značenje
const STOP_WORDS = new Set([
  'i', 'u', 'na', 'se', 'za', 'sa', 'po', 'od', 'do', 'the', 'a', 'an', 'of', 'to', 'in', 'is', 'it',
  'that', 'this', 'was', 'are', 'be', 'has', 'had', 'have', 'but', 'or', 'and', 'not', 'you', 'all',
  'can', 'had', 'her', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may',
  'new', 'now', 'old', 'see', 'way', 'who', 'boy', 'did', 'let', 'say', 'she', 'too', 'use', 'br',
  'nr', 'ref', 'id', 'no', 'datum', 'iznos', 'opis', 'stavka', 'transakcija', 'nalog', 'uplata',
  'isplata', 'promet', 'saldo'
]);

function extractKeywords(description: string): string[] {
  // Normalizuj i tokenizuj
  const normalized = description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Zameni specijalne karaktere sa razmakom
    .replace(/\s+/g, ' ') // Višestruki razmaci u jedan
    .trim();
  
  // Podeli u reči i filtriraj
  const words = normalized.split(' ')
    .filter(word => {
      // Ukloni prekratke reči, brojeve i stop words
      if (word.length < 3) return false;
      if (/^\d+$/.test(word)) return false; // Samo brojevi
      if (STOP_WORDS.has(word)) return false;
      return true;
    });
  
  // Vrati jedinstvene ključne reči
  return Array.from(new Set(words));
}

function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  // Jaccard sličnost
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function GroupedTransactions({ transactions, currency }: GroupedTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'avg'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);

  const groupedData = useMemo(() => {
    // Ekstraktuj ključne reči za svaku transakciju
    const transactionsWithKeywords = transactions.map(t => ({
      ...t,
      keywords: extractKeywords(t.description),
    }));

    // Grupiši po sličnosti
    const groups: TransactionGroup[] = [];

    transactionsWithKeywords.forEach((t) => {
      let bestMatch = -1;
      let bestSimilarity = 0;

      // Pronađi najbolju postojeću grupu
      groups.forEach((group, idx) => {
        const similarity = calculateSimilarity(t.keywords, group.keywords);
        if (similarity > bestSimilarity && similarity >= similarityThreshold) {
          bestSimilarity = similarity;
          bestMatch = idx;
        }
      });

      if (bestMatch >= 0) {
        // Dodaj u postojeću grupu
        const group = groups[bestMatch];
        group.transactions.push(t);
        group.totalDebit += t.debit;
        group.totalCredit += t.credit;
        group.totalAmount += Math.max(t.debit, t.credit);
        group.count += 1;

        // Ažuriraj ključne reči (unija)
        const allKeywords = new Set([...group.keywords, ...t.keywords]);
        group.keywords = Array.from(allKeywords);

        // Ažuriraj datume
        const [dA, mA, yA] = t.date.split('.').map(Number);
        const dateObj = new Date(yA, mA - 1, dA);
        
        const [dFirst, mFirst, yFirst] = group.firstDate.split('.').map(Number);
        const firstDateObj = new Date(yFirst, mFirst - 1, dFirst);
        
        const [dLast, mLast, yLast] = group.lastDate.split('.').map(Number);
        const lastDateObj = new Date(yLast, mLast - 1, dLast);

        if (dateObj < firstDateObj) group.firstDate = t.date;
        if (dateObj > lastDateObj) group.lastDate = t.date;
      } else {
        // Kreiraj novu grupu
        groups.push({
          keywords: [...t.keywords],
          transactions: [t],
          totalAmount: Math.max(t.debit, t.credit),
          totalDebit: t.debit,
          totalCredit: t.credit,
          count: 1,
          avgAmount: Math.max(t.debit, t.credit),
          firstDate: t.date,
          lastDate: t.date,
        });
      }
    });

    // Izračunaj proseke
    groups.forEach((group) => {
      group.avgAmount = group.totalAmount / group.count;
    });

    return groups;
  }, [transactions, similarityThreshold]);

  const filteredAndSorted = useMemo(() => {
    let result = groupedData;

    // Filter
    if (searchTerm) {
      result = result.filter((g) =>
        g.keywords.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const toggleGroup = (index: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
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
            placeholder="Pretraži po ključnim rečima..."
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
        {/* Similarity Threshold */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-300">Prag sličnosti</label>
            <span className="text-sm font-mono text-blue-400">{(similarityThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Labavo grupisanje</span>
            <span>Strogo grupisanje</span>
          </div>
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
          filteredAndSorted.map((group, idx) => {
            const isExpanded = expandedGroups.has(idx);
            const isExpense = group.totalDebit > group.totalCredit;
            const displayKeywords = group.keywords.slice(0, 5); // Prikaži max 5 ključnih reči

            return (
              <div
                key={idx}
                className="bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden"
              >
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(idx)}
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
                      <div className="flex flex-wrap gap-1 mb-1">
                        {displayKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs"
                          >
                            <Tag size={8} />
                            {kw}
                          </span>
                        ))}
                        {group.keywords.length > 5 && (
                          <span className="text-xs text-slate-500">+{group.keywords.length - 5}</span>
                        )}
                      </div>
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
