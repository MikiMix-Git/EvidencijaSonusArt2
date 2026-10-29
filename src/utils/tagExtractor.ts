import { Transaction } from './BankStatementParser';

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  color: string;
}

export type TagCategory = 
  | 'brand'       // Brendovi/prodavnice
  | 'service'     // Tip usluge
  | 'location'    // Lokacija
  | 'payment'     // Tip plaćanja
  | 'custom';     // Korisnički definisani

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

// Boje za različite kategorije tagova
const TAG_COLORS: Record<TagCategory, string[]> = {
  brand: ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#3b82f6'],
  service: ['#10b981', '#34d399', '#059669', '#047857', '#10b981'],
  location: ['#f59e0b', '#fbbf24', '#d97706', '#b45309', '#f59e0b'],
  payment: ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#8b5cf6'],
  custom: ['#ec4899', '#f472b6', '#db2777', '#be185d', '#ec4899'],
};

// Baza poznatih tagova - može se proširiti
const KNOWN_TAGS: { pattern: RegExp; tag: Omit<Tag, 'id'> }[] = [
  // === BRENDOVI / PRODAVNICE ===
  { pattern: /maxi|mini\s*maxi/i, tag: { name: 'Maxi', category: 'brand', color: '#3b82f6' } },
  { pattern: /idea/i, tag: { name: 'Idea', category: 'brand', color: '#60a5fa' } },
  { pattern: /dis\s*market|dis market/i, tag: { name: 'DIS', category: 'brand', color: '#2563eb' } },
  { pattern: /lidl/i, tag: { name: 'Lidl', category: 'brand', color: '#1d4ed8' } },
  { pattern: /merkator/i, tag: { name: 'Merkator', category: 'brand', color: '#3b82f6' } },
  { pattern: /univerexport/i, tag: { name: 'Univerexport', category: 'brand', color: '#60a5fa' } },
  { pattern: /rodic/i, tag: { name: 'Rodić', category: 'brand', color: '#2563eb' } },
  
  // Drogerije
  { pattern: /\bdm\b|dm\s*shop/i, tag: { name: 'DM', category: 'brand', color: '#f59e0b' } },
  { pattern: /benu/i, tag: { name: 'Benu', category: 'brand', color: '#10b981' } },
  { pattern: /srbotrade/i, tag: { name: 'Srbotrade', category: 'brand', color: '#34d399' } },
  
  // Gorivo
  { pattern: /\bshell\b/i, tag: { name: 'Shell', category: 'brand', color: '#fbbf24' } },
  { pattern: /\bomv\b/i, tag: { name: 'OMV', category: 'brand', color: '#d97706' } },
  { pattern: /\bmol\b/i, tag: { name: 'MOL', category: 'brand', color: '#b45309' } },
  { pattern: /\bnais\b|nais\s*petrol/i, tag: { name: 'NAIS', category: 'brand', color: '#f59e0b' } },
  { pattern: /\beps\b.*petrol|petrol.*\beps\b/i, tag: { name: 'EPS Petrol', category: 'brand', color: '#d97706' } },
  
  // Restorani / Kafići
  { pattern: /mcdonald/i, tag: { name: 'McDonald\'s', category: 'brand', color: '#ef4444' } },
  { pattern: /burger\s*king/i, tag: { name: 'Burger King', category: 'brand', color: '#f97316' } },
  { pattern: /starbucks/i, tag: { name: 'Starbucks', category: 'brand', color: '#059669' } },
  
  // Transport
  { pattern: /uber/i, tag: { name: 'Uber', category: 'brand', color: '#1f2937' } },
  { pattern: /bolt/i, tag: { name: 'Bolt', category: 'brand', color: '#22c55e' } },
  { pattern: /\bwolt\b/i, tag: { name: 'Wolt', category: 'brand', color: '#0ea5e9' } },
  { pattern: /glovo/i, tag: { name: 'Glovo', category: 'brand', color: '#fbbf24' } },
  
  // Digitalne usluge
  { pattern: /netflix/i, tag: { name: 'Netflix', category: 'brand', color: '#dc2626' } },
  { pattern: /spotify/i, tag: { name: 'Spotify', category: 'brand', color: '#22c55e' } },
  { pattern: /youtube.*premium|premium.*youtube/i, tag: { name: 'YouTube', category: 'brand', color: '#ef4444' } },
  { pattern: /apple/i, tag: { name: 'Apple', category: 'brand', color: '#6b7280' } },
  { pattern: /google.*play|play.*store/i, tag: { name: 'Google Play', category: 'brand', color: '#3b82f6' } },
  { pattern: /amazon/i, tag: { name: 'Amazon', category: 'brand', color: '#f59e0b' } },
  
  // === TIP USLUGE ===
  { pattern: /restoran|restaurant/i, tag: { name: 'Restoran', category: 'service', color: '#10b981' } },
  { pattern: /kafic|cafe|kavana/i, tag: { name: 'Kafić', category: 'service', color: '#34d399' } },
  { pattern: /pekara|bakery/i, tag: { name: 'Pekara', category: 'service', color: '#059669' } },
  { pattern: /supermarket|market|trgovina/i, tag: { name: 'Market', category: 'service', color: '#047857' } },
  { pattern: /apotek|pharmacy/i, tag: { name: 'Apoteka', category: 'service', color: '#10b981' } },
  { pattern: /gorivo|benz|dizel|fuel/i, tag: { name: 'Gorivo', category: 'service', color: '#f59e0b' } },
  { pattern: /parking/i, tag: { name: 'Parking', category: 'service', color: '#d97706' } },
  { pattern: /taxi/i, tag: { name: 'Taxi', category: 'service', color: '#fbbf24' } },
  { pattern: /struja|electric|elektro/i, tag: { name: 'Struja', category: 'service', color: '#eab308' } },
  { pattern: /voda|vodovod/i, tag: { name: 'Voda', category: 'service', color: '#0ea5e9' } },
  { pattern: /internet|broadband/i, tag: { name: 'Internet', category: 'service', color: '#6366f1' } },
  { pattern: /mobitel|mobile|telefon/i, tag: { name: 'Telefon', category: 'service', color: '#8b5cf6' } },
  { pattern: /stanarina|rent|kirija/i, tag: { name: 'Stanarina', category: 'service', color: '#a855f7' } },
  { pattern: /osiguranje|insurance/i, tag: { name: 'Osiguranje', category: 'service', color: '#7c3aed' } },
  { pattern: /teretana|gym|fitness/i, tag: { name: 'Teretana', category: 'service', color: '#ec4899' } },
  { pattern: /bioskop|cinema|cineplexx/i, tag: { name: 'Bioskop', category: 'service', color: '#f43f5e' } },
  { pattern: /plata|salary|wage/i, tag: { name: 'Plata', category: 'service', color: '#22c55e' } },
  { pattern: /provizija|commission|naknada/i, tag: { name: 'Provizija', category: 'service', color: '#6b7280' } },
  { pattern: /transfer|nalog/i, tag: { name: 'Transfer', category: 'service', color: '#06b6d4' } },
  { pattern: /konverzij|exchange|deviz/i, tag: { name: 'Konverzija', category: 'service', color: '#14b8a6' } },
  
  // === LOKACIJE ===
  { pattern: /beograd/i, tag: { name: 'Beograd', category: 'location', color: '#f59e0b' } },
  { pattern: /novi\s*sad/i, tag: { name: 'Novi Sad', category: 'location', color: '#d97706' } },
  { pattern: /nis\b/i, tag: { name: 'Niš', category: 'location', color: '#b45309' } },
  { pattern: /kragujevac/i, tag: { name: 'Kragujevac', category: 'location', color: '#f59e0b' } },
  { pattern: /subotica/i, tag: { name: 'Subotica', category: 'location', color: '#d97706' } },
  { pattern: /sarajevo/i, tag: { name: 'Sarajevo', category: 'location', color: '#b45309' } },
  { pattern: /banja\s*luka/i, tag: { name: 'Banja Luka', category: 'location', color: '#f59e0b' } },
  { pattern: /mostar/i, tag: { name: 'Mostar', category: 'location', color: '#d97706' } },
  { pattern: /tuzla/i, tag: { name: 'Tuzla', category: 'location', color: '#b45309' } },
  { pattern: /zenica/i, tag: { name: 'Zenica', category: 'location', color: '#f59e0b' } },
  
  // === TIP PLAĆANJA ===
  { pattern: /kartica|card|visa|mastercard/i, tag: { name: 'Kartica', category: 'payment', color: '#8b5cf6' } },
  { pattern: /atm|automat|withdrawal/i, tag: { name: 'ATM', category: 'payment', color: '#a78bfa' } },
  { pattern: /online|web|internet.*plac/i, tag: { name: 'Online', category: 'payment', color: '#7c3aed' } },
  { pattern: /contactless|contact.*less|beskontaktn/i, tag: { name: 'Contactless', category: 'payment', color: '#6d28d9' } },
];

let tagIdCounter = 0;
function generateTagId(): string {
  return `tag_${++tagIdCounter}`;
}

// Ekstrahuje tagove iz opisa transakcije
export function extractTags(description: string): Tag[] {
  const tags: Tag[] = [];
  const seenNames = new Set<string>();
  
  for (const { pattern, tag } of KNOWN_TAGS) {
    if (pattern.test(description) && !seenNames.has(tag.name)) {
      tags.push({
        ...tag,
        id: generateTagId(),
      });
      seenNames.add(tag.name);
    }
  }
  
  // Ako nema prepoznatih tagova, dodaj "Ostalo"
  if (tags.length === 0) {
    tags.push({
      id: generateTagId(),
      name: 'Neprepoznato',
      category: 'custom',
      color: '#6b7280',
    });
  }
  
  return tags;
}

// Taguj sve transakcije
export function tagTransactions(transactions: Transaction[]): TaggedTransaction[] {
  return transactions.map(t => ({
    ...t,
    tags: extractTags(t.description),
  }));
}

// Grupiši transakcije po tagovima
export function groupByTags(taggedTransactions: TaggedTransaction[]): TagGroup[] {
  const tagMap = new Map<string, TagGroup>();
  
  taggedTransactions.forEach(t => {
    t.tags.forEach(tag => {
      const key = tag.name;
      if (!tagMap.has(key)) {
        tagMap.set(key, {
          tag,
          transactions: [],
          totalAmount: 0,
          totalDebit: 0,
          totalCredit: 0,
          count: 0,
          avgAmount: 0,
        });
      }
      
      const group = tagMap.get(key)!;
      group.transactions.push(t);
      group.count++;
      group.totalDebit += t.debit;
      group.totalCredit += t.credit;
      group.totalAmount += Math.max(t.debit, t.credit);
    });
  });
  
  // Izračunaj prosek
  tagMap.forEach(group => {
    group.avgAmount = group.count > 0 ? group.totalAmount / group.count : 0;
  });
  
  return Array.from(tagMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

// Filtriraj tagove po kategoriji
export function filterTagsByCategory(groups: TagGroup[], category: TagCategory | 'all'): TagGroup[] {
  if (category === 'all') return groups;
  return groups.filter(g => g.tag.category === category);
}

// Dobij sve unikatne kategorije koje postoje
export function getUsedCategories(groups: TagGroup[]): TagCategory[] {
  const categories = new Set<TagCategory>();
  groups.forEach(g => categories.add(g.tag.category));
  return Array.from(categories);
}
