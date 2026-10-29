import { useState, useMemo } from 'react';
import { Transaction, formatCurrency } from '../utils/BankStatementParser';
import { 
  tagTransactions, 
  groupByTags, 
  filterTagsByCategory,
  getUsedCategories,
  TagCategory,
  TagGroup,
  TaggedTransaction 
} from '../utils/tagExtractor';
import { Search, Filter, TrendingUp, TrendingDown, Hash, Tag, X, ChevronDown, ChevronRight } from 'lucide-react';

interface GroupedByTagsProps {
  transactions: Transaction[];
  currency: string;
}

const CATEGORY_LABELS: Record<TagCategory, string> = {
  brand: '🏪 Brendovi',
  service: '🔧 Usluge',
  location: '📍 Lokacije',
  payment: '💳 Plaćanje',
  custom: '🏷️ Ostalo',
};

const CATEGORY_COLORS: Record<TagCategory, string> = {
  brand: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  service: 'bg-green-500/10 border-green-500/30 text-green-400',
  location: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  payment: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  custom: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
};

export function GroupedByTags({ transactions, currency }: GroupedByTagsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TagCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'avg' | 'debit' | 'credit'>('total');
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Taguj i grupiši transakcije
  const taggedTransactions = useMemo(() => tagTransactions(transactions), [transactions]);
  const allGroups = useMemo(() => groupByTags(taggedTransactions), [taggedTransactions]);
  
  // Filtriraj po kategoriji
  const filteredByCategory = useMemo(
    () => filterTagsByCategory(allGroups, categoryFilter),
    [allGroups, categoryFilter]
  );

  // Filtriraj po pretrazi
  const filteredGroups = useMemo(() => {
    let result = filteredByCategory;
    
    if (searchTerm) {
      result = result.filter(g => 
        g.tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.transactions.some(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sortiraj
    result.sort((a, b) => {
      switch (sortBy) {
        case 'total': return b.totalAmount - a.totalAmount;
        case 'count': return b.count - a.count;
        case 'avg': return b.avgAmount - a.avgAmount;
        case 'debit': return b.totalDebit - a.totalDebit;
        case 'credit': return b.totalCredit - a.totalCredit;
        default: return 0;
      }
    });
    
    return result;
  }, [filteredByCategory, searchTerm, sortBy]);

  // Ako je izabran specifičan tag, prikaži samo njegove transakcije
  const displayGroups = selectedTag 
    ? filteredGroups.filter(g => g.tag.name === selectedTag)
    : filteredGroups;

  const toggleTag = (tagName: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tagName)) {
      newExpanded.delete(tagName);
    } else {
      newExpanded.add(tagName);
    }
    setExpandedTags(newExpanded);
  };

  const expandAll = () => {
    setExpandedTags(new Set(displayGroups.map(g => g.tag.name)));
  };

  const collapseAll = () => {
    setExpandedTags(new Set());
  };

  // Statistike
  const usedCategories = useMemo(() => getUsedCategories(allGroups), [allGroups]);
  
  const totalStats = useMemo(() => {
    const totalTags = filteredGroups.length;
    const totalTransactions = filteredGroups.reduce((sum, g) => sum + g.count, 0);
    const totalDebit = filteredGroups.reduce((sum, g) => sum + g.totalDebit, 0);
    const totalCredit = filteredGroups.reduce((sum, g) => sum + g.totalCredit, 0);
    return { totalTags, totalTransactions, totalDebit, totalCredit };
  }, [filteredGroups]);

  return (
    <div className="space-y-6">
      {/* Header sa statistikama */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Ukupno tagova</p>
          <p className="text-2xl font-bold text-white">{totalStats.totalTags}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Tagovanih transakcija</p>
          <p className="text-2xl font-bold text-white">{totalStats.totalTransactions}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Ukupni odlivi</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalStats.totalDebit, currency)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Ukupni prilivi</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalStats.totalCredit, currency)}</p>
        </div>
      </div>

      {/* Filteri */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Pretraži tagove ili opise transakcija..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
          />
        </div>
        
        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              categoryFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Svi tagovi
          </button>
          {usedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                categoryFilter === cat 
                  ? CATEGORY_COLORS[cat]
                  : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border-transparent'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Sort i akcije */}
        <div className="flex flex-wrap gap-2 items-center">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)} 
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="total">Sortiraj po: Ukupan iznos</option>
            <option value="count">Sortiraj po: Broj transakcija</option>
            <option value="avg">Sortiraj po: Prosečan iznos</option>
            <option value="debit">Sortiraj po: Najveći odlivi</option>
            <option value="credit">Sortiraj po: Najveći prilivi</option>
          </select>

          <button
            onClick={expandAll}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            Proširi sve
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            Skupi sve
          </button>

          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <X size={14} />
              Poništi filter: {selectedTag}
            </button>
          )}
        </div>
      </div>

      {/* Tag Cloud - vizuelni prikaz svih tagova */}
      {!selectedTag && (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Tag size={16} className="text-blue-400" />
            Tag Cloud — klikni na tag za filtriranje
          </h3>
          <div className="flex flex-wrap gap-2">
            {filteredGroups.map(group => {
              const size = Math.min(1.5, 0.8 + (group.count / 10));
              return (
                <button
                  key={group.tag.name}
                  onClick={() => setSelectedTag(group.tag.name)}
                  className="px-3 py-1.5 rounded-full border transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: `${group.tag.color}20`,
                    borderColor: `${group.tag.color}50`,
                    color: group.tag.color,
                    fontSize: `${size}rem`,
                  }}
                  title={`${group.tag.name}: ${group.count} transakcija, ${formatCurrency(group.totalAmount, currency)}`}
                >
                  {group.tag.name}
                  <span className="ml-1 text-xs opacity-70">({group.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grupe po tagovima */}
      <div className="space-y-3">
        {displayGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>Nema pronađenih tagova</p>
          </div>
        ) : (
          displayGroups.map((group) => (
            <TagGroupCard
              key={group.tag.name}
              group={group}
              currency={currency}
              isExpanded={expandedTags.has(group.tag.name)}
              onToggle={() => toggleTag(group.tag.name)}
              onTagClick={() => setSelectedTag(group.tag.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Kartica za jednu tag grupu
function TagGroupCard({ 
  group, 
  currency, 
  isExpanded, 
  onToggle,
  onTagClick,
}: { 
  group: TagGroup; 
  currency: string; 
  isExpanded: boolean;
  onToggle: () => void;
  onTagClick: () => void;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown size={20} className="text-blue-400 shrink-0" />
          ) : (
            <ChevronRight size={20} className="text-slate-500 shrink-0" />
          )}
          
          {/* Tag badge */}
          <span
            className="px-3 py-1 rounded-full text-sm font-medium border shrink-0"
            style={{ 
              backgroundColor: `${group.tag.color}20`,
              borderColor: `${group.tag.color}50`,
              color: group.tag.color,
            }}
          >
            {group.tag.name}
          </span>
          
          {/* Category label */}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[group.tag.category]}`}>
            {CATEGORY_LABELS[group.tag.category]}
          </span>
          
          {/* Count */}
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Hash size={10} />
            {group.count} {group.count === 1 ? 'transakcija' : 'transakcija'}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-4">
          {group.totalDebit > 0 && (
            <div className="flex items-center gap-1 text-red-400">
              <TrendingDown size={14} />
              <span className="text-sm font-mono font-semibold">
                -{formatCurrency(group.totalDebit, currency)}
              </span>
            </div>
          )}
          {group.totalCredit > 0 && (
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp size={14} />
              <span className="text-sm font-mono font-semibold">
                +{formatCurrency(group.totalCredit, currency)}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-slate-700/30 bg-slate-900/30">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b border-slate-700/30">
            <div>
              <p className="text-xs text-slate-500">Ukupan promet</p>
              <p className="text-sm font-mono text-white">{formatCurrency(group.totalAmount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Prosečan iznos</p>
              <p className="text-sm font-mono text-white">{formatCurrency(group.avgAmount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ukupni odlivi</p>
              <p className="text-sm font-mono text-red-400">{formatCurrency(group.totalDebit, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ukupni prilivi</p>
              <p className="text-sm font-mono text-green-400">{formatCurrency(group.totalCredit, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Neto</p>
              <p className={`text-sm font-mono font-semibold ${group.totalCredit - group.totalDebit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(group.totalCredit - group.totalDebit, currency)}
              </p>
            </div>
          </div>

          {/* Transactions list */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left p-3 text-slate-400 font-medium text-xs">Datum</th>
                  <th className="text-left p-3 text-slate-400 font-medium text-xs">Opis</th>
                  <th className="text-left p-3 text-slate-400 font-medium text-xs">Ostali tagovi</th>
                  <th className="text-right p-3 text-green-400 font-medium text-xs">Priliv</th>
                  <th className="text-right p-3 text-red-400 font-medium text-xs">Odliv</th>
                  <th className="text-right p-3 text-slate-400 font-medium text-xs">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {group.transactions
                  .sort((a, b) => {
                    const [dA, mA, yA] = a.date.split('.').map(Number);
                    const [dB, mB, yB] = b.date.split('.').map(Number);
                    return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
                  })
                  .map((t, i) => (
                    <tr key={`${t.id}_${i}`} className="border-t border-slate-700/20 hover:bg-slate-700/10">
                      <td className="p-3 text-slate-300 text-xs whitespace-nowrap">{t.date}</td>
                      <td className="p-3">
                        <p className="text-white text-xs truncate max-w-xs">{t.description}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {t.tags
                            .filter(tag => tag.name !== group.tag.name)
                            .map(tag => (
                              <span
                                key={tag.id}
                                className="text-xs px-1.5 py-0.5 rounded-full border"
                                style={{ 
                                  backgroundColor: `${tag.color}15`,
                                  borderColor: `${tag.color}40`,
                                  color: tag.color,
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                        {t.credit > 0 ? (
                          <span className="text-green-400">+{formatCurrency(t.credit, currency)}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                        {t.debit > 0 ? (
                          <span className="text-red-400">-{formatCurrency(t.debit, currency)}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-slate-300 whitespace-nowrap">
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
}
