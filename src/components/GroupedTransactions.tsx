import { useState, useMemo } from 'react';
import { Transaction, formatCurrency } from '../utils/BankStatementParser';
import { Search, Filter, TrendingUp, TrendingDown, Hash, Tag } from 'lucide-react';

interface GroupedTransactionsProps {
  transactions: Transaction[];
  currency: string;
}

interface TransactionGroup {
  commonPhrase: string;
  transactions: Transaction[];
  totalAmount: number;
  totalDebit: number;
  totalCredit: number;
  count: number;
  avgAmount: number;
  firstDate: string;
  lastDate: string;
}

// Tokenizuj opis u reči
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

// Nađi najduži zajednički substring reči između dva niza
function findLongestCommonSubsequence(words1: string[], words2: string[]): string[] {
  let longest: string[] = [];
  
  // Probaj sve moguće podnizove iz words1
  for (let i = 0; i < words1.length; i++) {
    for (let len = 1; len <= words1.length - i; len++) {
      const subseq = words1.slice(i, i + len);
      
      // Proveri da li ovaj podniz postoji u words2 (uzastopno)
      let found = false;
      for (let j = 0; j <= words2.length - len; j++) {
        const candidate = words2.slice(j, j + len);
        if (JSON.stringify(subseq) === JSON.stringify(candidate)) {
          found = true;
          break;
        }
      }
      
      if (found && subseq.length > longest.length) {
        longest = subseq;
      }
    }
  }
  
  return longest;
}

export function GroupedTransactions({ transactions, currency }: GroupedTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'avg'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [minWords, setMinWords] = useState(1);

  const groupedData = useMemo(() => {
    // Tokenizuj svaku transakciju
    const transactionsWithWords = transactions.map(t => ({
      ...t,
      words: tokenize(t.description),
    }));

    const groups: TransactionGroup[] = [];

    transactionsWithWords.forEach((t) => {
      let bestMatch = -1;
      let bestCommonPhrase: string[] = [];

      // Pronađi najbolju postojeću grupu
      groups.forEach((group, idx) => {
        // Proveri da li nova transakcija ima zajednički niz sa SVIM transakcijama u grupi
        let matchesAll = true;
        let shortestCommon: string[] = t.words; // Počni sa svim rečima

        for (const existingT of group.transactions) {
          const existingWords = tokenize(existingT.description);
          const commonWords = findLongestCommonSubsequence(t.words, existingWords);
          
          if (commonWords.length < minWords) {
            matchesAll = false;
            break;
          }
          
          // Uzmi najkraći zajednički niz (najstrožiji kriterijum)
          if (commonWords.length < shortestCommon.length) {
            shortestCommon = commonWords;
          }
        }

        if (matchesAll && shortestCommon.length > bestCommonPhrase.length) {
          bestCommonPhrase = shortestCommon;
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
          commonPhrase: t.words.join(' '),
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

    // Ažuriraj commonPhrase za svaku grupu (nađi zajednički niz za SVE transakcije)
    groups.forEach((group) => {
      if (group.transactions.length > 1) {
        // Nađi najduži zajednički niz koji je zajednički za SVE transakcije u grupi
        let commonToAll: string[] | null = null;
        
        for (let i = 0; i < group.transactions.length; i++) {
          const words1 = tokenize(group.transactions[i].description);
          
          for (let j = i + 1; j < group.transactions.length; j++) {
            const words2 = tokenize(group.transactions[j].description);
            const common = findLongestCommonSubsequence(words1, words2);
            
            if (commonToAll === null) {
              commonToAll = common;
            } else {
              // Nađi presek između current commonToAll i novog common
              const intersection = findLongestCommonSubsequence(commonToAll, common);
              commonToAll = intersection;
            }
          }
        }
        
        if (commonToAll && commonToAll.length >= minWords) {
          group.commonPhrase = commonToAll.join(' ');
        } else {
          // Ako nema zajedničkog niza za sve, grupu treba razbiti
          // Ali za sada samo prikaži prvu transakciju kao fallback
          group.commonPhrase = tokenize(group.transactions[0].description).join(' ');
        }
      }
      
      // Izračunaj prosek
      group.avgAmount = group.totalAmount / group.count;
    });

    return groups;
  }, [transactions, minWords]);

  const filteredAndSorted = useMemo(() => {
    let result = groupedData;

    // Filter
    if (searchTerm) {
      result = result.filter((g) =>
        g.commonPhrase.toLowerCase().includes(searchTerm.toLowerCase())
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
        {/* Minimum Words */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-300">Minimalan broj zajedničkih reči</label>
            <span className="text-sm font-mono text-blue-400">{minWords}</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={minWords}
            onChange={(e) => setMinWords(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1 reč (šire grupe)</span>
            <span>5 reči (uže grupe)</span>
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
            const commonWords = group.commonPhrase.split(' ');

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
                        {commonWords.map((word, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium"
                          >
                            {word}
                          </span>
                        ))}
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
                            <th className="text-left p-3 text-slate-400 font-medium">Opis</th>
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
                                <td className="p-3 text-slate-400 max-w-xs truncate" title={t.description}>
                                  {t.description}
                                </td>
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
