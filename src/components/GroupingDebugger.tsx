import { useState, useMemo } from 'react';
import { Transaction } from '../utils/BankStatementParser';
import { X, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface GroupingDebuggerProps {
  transactions: Transaction[];
  onClose: () => void;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);
}

function findLongestCommonSubsequence(words1: string[], words2: string[]): string[] {
  let longest: string[] = [];
  
  for (let i = 0; i < words1.length; i++) {
    for (let len = 1; len <= words1.length - i; len++) {
      const subseq = words1.slice(i, i + len);
      
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

export function GroupingDebugger({ transactions, onClose }: GroupingDebuggerProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [compareWith, setCompareWith] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [minWords, setMinWords] = useState(2);

  const transactionsWithWords = useMemo(() => {
    return transactions.map((t, idx) => ({
      ...t,
      index: idx,
      words: tokenize(t.description),
    }));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactionsWithWords;
    return transactionsWithWords.filter(t =>
      t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactionsWithWords, searchTerm]);

  const comparison = useMemo(() => {
    if (selectedTransaction === null || compareWith === null) return null;
    
    const t1 = transactionsWithWords[selectedTransaction];
    const t2 = transactionsWithWords[compareWith];
    
    if (!t1 || !t2) return null;
    
    const commonWords = findLongestCommonSubsequence(t1.words, t2.words);
    
    // Pronađi SVE zajedničke podnizove (ne samo najduži)
    const allCommonSubsequences: string[][] = [];
    for (let i = 0; i < t1.words.length; i++) {
      for (let len = 1; len <= t1.words.length - i; len++) {
        const subseq = t1.words.slice(i, i + len);
        
        let found = false;
        for (let j = 0; j <= t2.words.length - len; j++) {
          const candidate = t2.words.slice(j, j + len);
          if (JSON.stringify(subseq) === JSON.stringify(candidate)) {
            found = true;
            break;
          }
        }
        
        if (found && len >= minWords) {
          // Proveri da li je ovaj podniz već sadržan u nekom dužem
          const isSubsequence = allCommonSubsequences.some(existing => {
            if (existing.length <= subseq.length) return false;
            for (let k = 0; k <= existing.length - subseq.length; k++) {
              if (JSON.stringify(existing.slice(k, k + subseq.length)) === JSON.stringify(subseq)) {
                return true;
              }
            }
            return false;
          });
          
          if (!isSubsequence) {
            allCommonSubsequences.push(subseq);
          }
        }
      }
    }
    
    return {
      t1,
      t2,
      longestCommon: commonWords,
      allCommon: allCommonSubsequences.sort((a, b) => b.length - a.length),
      canGroup: commonWords.length >= minWords,
    };
  }, [selectedTransaction, compareWith, transactionsWithWords, minWords]);

  // Simulacija grupisanja
  const groupingSimulation = useMemo(() => {
    const groups: { id: number; commonPhrase: string; transactions: number[] }[] = [];
    const decisions: { transactionIdx: number; decision: string; groupId: number | null; reason: string }[] = [];

    transactionsWithWords.forEach((t, idx) => {
      let bestMatch = -1;
      let bestCommonPhrase: string[] = [];

      groups.forEach((group, groupIdx) => {
        let matchesAll = true;
        let shortestCommon: string[] = t.words;

        for (const existingIdx of group.transactions) {
          const existingT = transactionsWithWords[existingIdx];
          const commonWords = findLongestCommonSubsequence(t.words, existingT.words);
          
          if (commonWords.length < minWords) {
            matchesAll = false;
            break;
          }
          
          if (commonWords.length < shortestCommon.length) {
            shortestCommon = commonWords;
          }
        }

        if (matchesAll && shortestCommon.length > bestCommonPhrase.length) {
          bestCommonPhrase = shortestCommon;
          bestMatch = groupIdx;
        }
      });

      if (bestMatch >= 0) {
        groups[bestMatch].transactions.push(idx);
        decisions.push({
          transactionIdx: idx,
          decision: 'ADDED',
          groupId: bestMatch,
          reason: `Zajednički niz: "${bestCommonPhrase.join(' ')}" (${bestCommonPhrase.length} reči)`,
        });
      } else {
        groups.push({
          id: groups.length,
          commonPhrase: t.words.join(' '),
          transactions: [idx],
        });
        decisions.push({
          transactionIdx: idx,
          decision: 'NEW_GROUP',
          groupId: groups.length - 1,
          reason: 'Nema zajedničkog niza sa postojećim grupama',
        });
      }
    });

    return { groups, decisions };
  }, [transactionsWithWords, minWords]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-auto p-4">
      <div className="max-w-7xl mx-auto bg-slate-900 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">🔍 Grouping Debugger</h2>
          <button onClick={onClose} className="text-white hover:text-red-400">
            <X size={24} />
          </button>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pretraži transakcije..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
            />
          </div>
          <div className="bg-slate-800 p-3 rounded-lg">
            <label className="text-sm text-slate-300 mb-2 block">
              Minimalan broj zajedničkih reči: <span className="text-blue-400 font-mono">{minWords}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={minWords}
              onChange={(e) => setMinWords(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Transaction List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Transakcije ({filteredTransactions.length})
            </h3>
            <div className="bg-slate-800 rounded-lg overflow-auto max-h-[400px]">
              {filteredTransactions.map((t) => (
                <button
                  key={t.index}
                  onClick={() => setSelectedTransaction(t.index)}
                  className={`w-full text-left p-3 border-b border-slate-700 hover:bg-slate-700 transition-colors ${
                    selectedTransaction === t.index ? 'bg-blue-600/20 border-blue-500' : ''
                  }`}
                >
                  <div className="text-xs text-slate-500 mb-1">
                    #{t.index} • {t.date}
                  </div>
                  <div className="text-sm text-white truncate">{t.description}</div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    [{t.words.length} reči] {t.words.slice(0, 8).join(' ')}...
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Poređenje transakcija
            </h3>
            {selectedTransaction !== null && (
              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-500 mb-1">Izabrana #{selectedTransaction}</div>
                <div className="text-sm text-white mb-2">{transactionsWithWords[selectedTransaction]?.description}</div>
                <div className="text-xs text-blue-400 font-mono break-all">
                  {transactionsWithWords[selectedTransaction]?.words.join(' | ')}
                </div>
              </div>
            )}
            <div className="bg-slate-800 rounded-lg overflow-auto max-h-[300px]">
              {filteredTransactions
                .filter(t => t.index !== selectedTransaction)
                .map((t) => (
                  <button
                    key={t.index}
                    onClick={() => setCompareWith(t.index)}
                    className={`w-full text-left p-3 border-b border-slate-700 hover:bg-slate-700 transition-colors ${
                      compareWith === t.index ? 'bg-green-600/20 border-green-500' : ''
                    }`}
                  >
                    <div className="text-xs text-slate-500 mb-1">
                      #{t.index} • {t.date}
                    </div>
                    <div className="text-sm text-white truncate">{t.description}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Comparison Result */}
        {comparison && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Rezultat poređenja</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900 p-3 rounded">
                <div className="text-xs text-slate-500 mb-1">Transakcija 1 (#{comparison.t1.index})</div>
                <div className="text-sm text-white mb-2">{comparison.t1.description}</div>
              </div>
              <div className="bg-slate-900 p-3 rounded">
                <div className="text-xs text-slate-500 mb-1">Transakcija 2 (#{comparison.t2.index})</div>
                <div className="text-sm text-white mb-2">{comparison.t2.description}</div>
              </div>
            </div>

            <div className={`p-4 rounded-lg mb-4 ${comparison.canGroup ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {comparison.canGroup ? (
                  <span className="text-green-400 font-semibold">✓ MOGU SE GRUPISATI</span>
                ) : (
                  <span className="text-red-400 font-semibold">✗ NE MOGU SE GRUPISATI</span>
                )}
              </div>
              <div className="text-sm text-slate-300">
                Najduži zajednički niz: <span className="font-mono text-blue-400">"{comparison.longestCommon.join(' ')}"</span>
                <span className="text-slate-500 ml-2">({comparison.longestCommon.length} reči, min: {minWords})</span>
              </div>
            </div>

            {comparison.allCommon.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Svi zajednički podnizovi (≥ {minWords} reči):</h4>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {comparison.allCommon.slice(0, 10).map((subseq, idx) => (
                    <div key={idx} className="bg-slate-900 p-2 rounded text-sm font-mono text-slate-300">
                      "{subseq.join(' ')}" <span className="text-slate-500">({subseq.length} reči)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grouping Simulation */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Simulacija grupisanja ({groupingSimulation.groups.length} grupa)
          </h3>
          
          <div className="space-y-4 max-h-[500px] overflow-auto">
            {groupingSimulation.groups.map((group) => (
              <div key={group.id} className="bg-slate-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-blue-400 font-semibold">Grupa {group.id + 1}</span>
                    <span className="text-slate-500 ml-2">({group.transactions.length} transakcija)</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mb-2 font-mono break-all">
                  Common phrase: "{group.commonPhrase}"
                </div>
                <div className="space-y-1">
                  {group.transactions.map((tIdx) => {
                    const decision = groupingSimulation.decisions.find(d => d.transactionIdx === tIdx);
                    const t = transactionsWithWords[tIdx];
                    return (
                      <div key={tIdx} className="text-xs bg-slate-800 p-2 rounded">
                        <div className="text-slate-300">
                          #{tIdx} • {t.date} • {t.description.slice(0, 80)}...
                        </div>
                        {decision && (
                          <div className={`mt-1 ${decision.decision === 'NEW_GROUP' ? 'text-green-400' : 'text-blue-400'}`}>
                            → {decision.decision === 'NEW_GROUP' ? 'Nova grupa' : `Dodato u grupu ${decision.groupId}`}
                            {decision.reason && <span className="text-slate-500 ml-2">({decision.reason})</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
