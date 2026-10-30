import { Transaction } from './BankStatementParser';
import { GroupingRule, applyRules } from '../components/GroupingRulesPanel';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaggedTransaction extends Transaction {
  tags: Tag[];
}

export interface TagGroup {
  tag: Tag;
  transactions: TaggedTransaction[];
  totalAmount: number;
  totalDebit: number;
  totalCredit: number;
  count: number;
  avgAmount: number;
}

// Boje za tagove
const TAG_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

/**
 * Taguj transakcije koristeći manuelna pravila
 * Svako pravilo sa tag-om dodeljuje taj tag match-ovanim transakcijama
 */
export function tagTransactionsWithRules(
  transactions: Transaction[],
  rules: GroupingRule[]
): TaggedTransaction[] {
  // Filtriraj samo pravila koja imaju tag i enabled su
  const rulesWithTags = rules.filter(r => r.enabled && r.tag);
  
  return transactions.map(t => {
    const tags: Tag[] = [];
    
    // Proveri svako pravilo sa tagom
    for (let i = 0; i < rulesWithTags.length; i++) {
      const rule = rulesWithTags[i];
      if (applyRules(t.description, [rule])) {
        tags.push({
          id: `tag_${rule.id}`,
          name: rule.tag!,
          color: TAG_COLORS[i % TAG_COLORS.length],
        });
      }
    }
    
    return { ...t, tags };
  });
}

/**
 * Grupiši tagovane transakcije po tagovima
 */
export function groupByTags(taggedTransactions: TaggedTransaction[]): TagGroup[] {
  const tagMap = new Map<string, TagGroup>();
  
  taggedTransactions.forEach(t => {
    t.tags.forEach(tag => {
      if (!tagMap.has(tag.name)) {
        tagMap.set(tag.name, {
          tag,
          transactions: [],
          totalAmount: 0,
          totalDebit: 0,
          totalCredit: 0,
          count: 0,
          avgAmount: 0,
        });
      }
      
      const group = tagMap.get(tag.name)!;
      group.transactions.push(t);
      group.totalDebit += t.debit;
      group.totalCredit += t.credit;
      group.totalAmount += Math.max(t.debit, t.credit);
      group.count += 1;
    });
  });
  
  // Izračunaj prosek
  tagMap.forEach(group => {
    group.avgAmount = group.totalAmount / group.count;
  });
  
  return Array.from(tagMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Filtriraj grupe po pretrazi
 */
export function filterTagGroups(
  groups: TagGroup[],
  searchTerm: string
): TagGroup[] {
  if (!searchTerm) return groups;
  
  const lower = searchTerm.toLowerCase();
  return groups.filter(g => 
    g.tag.name.toLowerCase().includes(lower) ||
    g.transactions.some(t => t.description.toLowerCase().includes(lower))
  );
}
