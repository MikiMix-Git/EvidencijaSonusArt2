import { useState, useMemo } from 'react';
import { Transaction, formatCurrency } from '../utils/BankStatementParser';
import { Search, Filter, TrendingUp, TrendingDown, Hash, Tag, Building2, Calendar, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { GroupingRulesPanel, GroupingRule, applyRules } from './GroupingRulesPanel';

interface GroupedTransactionsProps {
  transactions: Transaction[];
  currency: string;
}

interface TransactionGroup {
  id: string;
  name: string;
  type: 'counterparty' | 'pattern' | 'manual' | 'other';
  transactions: Transaction[];
  totalAmount: number;
  totalDebit: number;
  totalCredit: number;
  count: number;
  avgAmount: number;
  firstDate: string;
  lastDate: string;
  counterparty?: string;
  patternName?: string;
}

// ============================================
// COUNTERPARTY EXTRACTION
// ============================================

/**
 * Izvlači ime firme/primaoca iz opisa transakcije
 */
function extractCounterparty(description: string): string {
  const desc = description.toUpperCase();
  
  // Pattern 1: "TD- ELEKTRONIKA D.O.O. CROATIA ZAGREB" ili "TD ELEKTRONIKA D.O.O."
  const tdMatch = desc.match(/TD[-\s]?\s*([A-ZČŽŠĐĆ][A-ZČŽŠĐĆ\s]+(?:D\.O\.O\.|D\.D\.)[\s\w]*)/);
  if (tdMatch) {
    return cleanCounterparty(tdMatch[1]);
  }
  
  // Pattern 2: "ALIQUANTUM IVANA SIBLA" (nakon iznosa)
  const afterAmountMatch = desc.match(/EUR\s+[\d.,]+\s*([A-ZČŽŠĐĆ][A-ZČŽŠĐĆ\s]{3,}?)(?:\s+\d|\s+RACUN|\s+FAKTUR|\s+PRIJENOS|$)/);
  if (afterAmountMatch) {
    return cleanCounterparty(afterAmountMatch[1]);
  }
  
  // Pattern 3: "D.O.O." ili "D.D." bilo gde
  const companyMatch = desc.match(/([A-ZČŽŠĐĆ][A-ZČŽŠĐĆ\s]{2,})\s+(?:D\.O\.O\.|D\.D\.)/);
  if (companyMatch) {
    return cleanCounterparty(companyMatch[1]);
  }
  
  return '';
}

function cleanCounterparty(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\b(D\.O\.O\.|D\.D\.)\b/gi, '')
    .replace(/\b(CROATIA|ZAGREB|BEOGRAD|SARAJEVO|BANJA LUKA)\b/gi, '')
    .replace(/\b(MAGAZINSKA|IVANA SIBLA|ULICA|TRG)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================
// PATTERN-BASED CLASSIFICATION
// ============================================

interface TransactionPattern {
  name: string;
  pattern: RegExp;
  priority: number;
  icon: string;
}

const DEFAULT_PATTERNS: TransactionPattern[] = [
  { name: 'Naknada za konverziju', pattern: /NAKNADA.*KONVERZIJ/i, priority: 1, icon: '💱' },
  { name: 'Konverzija valute', pattern: /EXCH.*KONVERZIJA|KONVERZIJA.*EUR\/BAM/i, priority: 2, icon: '💱' },
  { name: 'Kamata', pattern: /KAMATA/i, priority: 3, icon: '📈' },
  { name: 'GPP naknada', pattern: /GPP/i, priority: 4, icon: '🏦' },
  { name: 'Bankarska provizija', pattern: /PROVIZIJA|NAKNADA.*BANK/i, priority: 5, icon: '🏦' },
  { name: 'Plata', pattern: /PLATA|SALARY|WAGES/i, priority: 6, icon: '💰' },
  { name: 'Stanarina', pattern: /STANARINA|RENT|KIRIJA/i, priority: 7, icon: '🏠' },
  { name: 'Režije', pattern: /ELEKTRO|VODA|PLIN|TOPLAN|TELEKOM|INTERNET|STRUJA/i, priority: 8, icon: '💡' },
  { name: 'Gorivo', pattern: /GORIVO|BENZ|SHELL|INA|NIS|PETROL|FUEL/i, priority: 9, icon: '⛽' },
  { name: 'Transfer', pattern: /PRIJENOS|PLACANJE|FAKTUR/i, priority: 10, icon: '🔄' },
];

function classifyByPattern(description: string): { name: string; icon: string } | null {
  const sortedPatterns = [...DEFAULT_PATTERNS].sort((a, b) => a.priority - b.priority);
  
  for (const { name, pattern, icon } of sortedPatterns) {
    if (pattern.test(description)) {
      return { name, icon };
    }
  }
  
  return null;
}

// ============================================
// SMART GROUPING ALGORITHM
// ============================================

function smartGroupTransactions(
  transactions: Transaction[],
  manualRules: GroupingRule[]
): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>();
  
  transactions.forEach((t, index) => {
    let groupName = '';
    let groupType: TransactionGroup['type'] = 'other';
    let counterparty = '';
    let patternName = '';
    
    // Korak 1: Proveri manuelna pravila (najviši prioritet)
    if (manualRules.length > 0) {
      const matchedRule = applyRules(t.description, manualRules);
      if (matchedRule) {
        groupName = `📌 ${matchedRule.groupName}`;
        groupType = 'manual';
      }
    }
    
    // Korak 2: Ako nema manuelnog pravila, probaj pattern-based
    if (!groupName) {
      const patternMatch = classifyByPattern(t.description);
      if (patternMatch) {
        groupName = `${patternMatch.icon} ${patternMatch.name}`;
        groupType = 'pattern';
        patternName = patternMatch.name;
      }
    }
    
    // Korak 3: Ako nema pattern-a, probaj counterparty extraction
    if (!groupName) {
      counterparty = extractCounterparty(t.description);
      if (counterparty) {
        groupName = `🏢 ${counterparty}`;
        groupType = 'counterparty';
      }
    }
    
    // Korak 4: Ako ništa ne matchuje, grupiši po prvoj značajnoj reči
    if (!groupName) {
      const words = t.description
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !/^\d+$/.test(w));
      
      if (words.length > 0) {
        groupName = `📄 ${words[0].charAt(0).toUpperCase() + words[0].slice(1)}`;
        groupType = 'other';
      } else {
        groupName = '📄 Ostalo';
        groupType = 'other';
      }
    }
    
    // Dodaj transakciju u grupu
    if (!groups.has(groupName)) {
      groups.set(groupName, {
        id: `group_${index}`,
        name: groupName,
        type: groupType,
        transactions: [],
        totalAmount: 0,
        totalDebit: 0,
        totalCredit: 0,
        count: 0,
        avgAmount: 0,
        firstDate: t.date,
        lastDate: t.date,
        counterparty: counterparty || undefined,
        patternName: patternName || undefined,
      });
    }
    
    const group = groups.get(groupName)!;
    group.transactions.push(t);
    group.totalDebit += t.debit;
    group.totalCredit += t.credit;
    group.totalAmount += Math.max(t.debit, t.credit);
    group.count += 1;
    
    // Ažuriraj datume
    if (t.date < group.firstDate) group.firstDate = t.date;
    if (t.date > group.lastDate) group.lastDate = t.date;
  });
  
  // Izračunaj prosek
  groups.forEach(group => {
    group.avgAmount = group.totalAmount / group.count;
  });
  
  return Array.from(groups.values());
}

// ============================================
// KOMPONENTA
// ============================================

export function GroupedTransactions({ transactions, currency }: GroupedTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'avg'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<'all' | 'counterparty' | 'pattern' | 'manual' | 'other'>('all');
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [manualRules, setManualRules] = useState<GroupingRule[]>(() => {
    try {
      const saved = localStorage.getItem('groupingRules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Čuvaj pravila u localStorage
  const handleRulesChange = (rules: GroupingRule[]) => {
    setManualRules(rules);
    try {
      localStorage.setItem('groupingRules', JSON.stringify(rules));
    } catch {
      // Ignoriši greške pri čuvanju
    }
  };

  const groupedData = useMemo(() => {
    let groups = smartGroupTransactions(transactions, manualRules);
    
    // Filtriraj po tipu
    if (typeFilter !== 'all') {
      groups = groups.filter(g => g.type === typeFilter);
    }
    
    // Filtriraj po pretrazi
    if (searchTerm) {
      groups = groups.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.transactions.some(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sortiraj
    groups.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'total') comparison = a.totalAmount - b.totalAmount;
      else if (sortBy === 'count') comparison = a.count - b.count;
      else if (sortBy === 'avg') comparison = a.avgAmount - b.avgAmount;
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return groups;
  }, [transactions, searchTerm, sortBy, sortOrder, typeFilter, manualRules]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupedData.map(g => g.id)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const totalGroups = groupedData.length;
  const totalTransactions = groupedData.reduce((sum, g) => sum + g.count, 0);
  const totalAmount = groupedData.reduce((sum, g) => sum + g.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Hash size={20} className="text-blue-400" />
            Grupisane transakcije
          </h2>
          <p className="text-sm text-slate-400">
            {totalGroups} grupa • {totalTransactions} transakcija • {formatCurrency(totalAmount, currency)}
          </p>
        </div>
        <button
          onClick={() => setShowRulesPanel(!showRulesPanel)}
          className="px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Settings2 size={16} />
          Pravila grupisanja
        </button>
      </div>

      {/* Rules Panel */}
      {showRulesPanel && (
        <GroupingRulesPanel
          rules={manualRules}
          onRulesChange={handleRulesChange}
          onClose={() => setShowRulesPanel(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pretraži grupe ili transakcije..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">Svi tipovi</option>
            <option value="counterparty">🏢 Po primaocu</option>
            <option value="pattern">🏷️ Po obrascu</option>
            <option value="manual">📌 Manuelna pravila</option>
            <option value="other">📄 Ostalo</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="total">Ukupan iznos</option>
            <option value="count">Broj transakcija</option>
            <option value="avg">Prosečan iznos</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white hover:bg-slate-700/50 transition-colors"
          >
            {sortOrder === 'desc' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
          </button>
        </div>
      </div>

      {/* Expand/Collapse All */}
      <div className="flex gap-2">
        <button
          onClick={expandAll}
          className="px-3 py-1.5 text-xs bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 rounded-lg transition-colors"
        >
          Proširi sve
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1.5 text-xs bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 rounded-lg transition-colors"
        >
          Skupi sve
        </button>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {groupedData.map((group) => (
          <div key={group.id} className="bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {expandedGroups.has(group.id) ? (
                  <ChevronDown size={20} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight size={20} className="text-slate-400 shrink-0" />
                )}
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white truncate">{group.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      group.type === 'counterparty' ? 'bg-blue-500/20 text-blue-400' :
                      group.type === 'pattern' ? 'bg-purple-500/20 text-purple-400' :
                      group.type === 'manual' ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-700/50 text-slate-400'
                    }`}>
                      {group.type === 'counterparty' && '🏢 Primalac'}
                      {group.type === 'pattern' && '🏷️ Obrazac'}
                      {group.type === 'manual' && '📌 Pravilo'}
                      {group.type === 'other' && '📄 Ostalo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Hash size={12} />
                      {group.count} transakcija
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {group.firstDate} - {group.lastDate}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-white">
                    {formatCurrency(group.totalAmount, currency)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Prosek: {formatCurrency(group.avgAmount, currency)}
                  </div>
                </div>
              </div>
            </button>
            
            {/* Expanded Transactions */}
            {expandedGroups.has(group.id) && (
              <div className="border-t border-slate-700/30 bg-slate-900/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="text-left p-3 text-slate-400 font-medium">Datum</th>
                        <th className="text-left p-3 text-slate-400 font-medium">Opis</th>
                        <th className="text-right p-3 text-green-400 font-medium">Ulaz</th>
                        <th className="text-right p-3 text-red-400 font-medium">Izlaz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.transactions.map((t, i) => (
                        <tr key={i} className="border-t border-slate-700/20 hover:bg-slate-700/10 transition-colors">
                          <td className="p-3 text-slate-300 whitespace-nowrap">{t.date}</td>
                          <td className="p-3 text-white max-w-md truncate" title={t.description}>
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
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900/50 border-t border-slate-700/30">
                      <tr>
                        <td colSpan={2} className="p-3 text-slate-400 font-medium">Ukupno:</td>
                        <td className="p-3 text-right font-mono text-green-400 font-semibold">
                          {formatCurrency(group.totalCredit, currency)}
                        </td>
                        <td className="p-3 text-right font-mono text-red-400 font-semibold">
                          {formatCurrency(group.totalDebit, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {groupedData.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Filter size={48} className="mx-auto mb-3 opacity-50" />
          <p>Nema grupa koje odgovaraju filterima</p>
        </div>
      )}
    </div>
  );
}
