export interface GroupingRule {
  id: string;
  pattern: string; // regex ili plain text
  groupName: string;
  isRegex: boolean;
  enabled: boolean;
  tag?: string; // Opcioni tag za grupisanje po tagovima
}

/**
 * Primenjuje manuelna pravila na opis transakcije
 * Vraća prvo matched pravilo ili null
 * Jedno pravilo može sadržati više uslova odvojenih zarezom (OR logika)
 */
export function applyRules(description: string, rules: GroupingRule[]): GroupingRule | null {
  const enabledRules = rules.filter(r => r.enabled);
  
  for (const rule of enabledRules) {
    try {
      // Podeli pattern po zarezima za više uslova
      const conditions = rule.pattern.split(',').map(c => c.trim()).filter(c => c.length > 0);
      
      // Testiraj svaki uslov - ako bilo koji match-uje, pravilo se primenjuje
      for (const condition of conditions) {
        const regex = rule.isRegex 
          ? new RegExp(condition, 'i')
          : new RegExp(condition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        
        if (regex.test(description)) {
          return rule;
        }
      }
    } catch (err) {
      console.error('Greška u regex pravilu:', rule.pattern, err);
    }
  }
  
  return null;
}
