import { useState } from 'react';
import { Plus, Trash2, X, Save, AlertCircle } from 'lucide-react';

export interface GroupingRule {
  id: string;
  pattern: string; // regex ili plain text
  groupName: string;
  isRegex: boolean;
  enabled: boolean;
}

interface GroupingRulesPanelProps {
  rules: GroupingRule[];
  onRulesChange: (rules: GroupingRule[]) => void;
  onClose: () => void;
}

/**
 * Primenjuje manuelna pravila na opis transakcije
 * Vraća prvo matched pravilo ili null
 */
export function applyRules(description: string, rules: GroupingRule[]): GroupingRule | null {
  const enabledRules = rules.filter(r => r.enabled);
  
  for (const rule of enabledRules) {
    try {
      const regex = rule.isRegex 
        ? new RegExp(rule.pattern, 'i')
        : new RegExp(rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      
      if (regex.test(description)) {
        return rule;
      }
    } catch (err) {
      console.error('Greška u regex pravilu:', rule.pattern, err);
    }
  }
  
  return null;
}

export function GroupingRulesPanel({ rules, onRulesChange, onClose }: GroupingRulesPanelProps) {
  const [newPattern, setNewPattern] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newIsRegex, setNewIsRegex] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRule = () => {
    if (!newPattern.trim() || !newGroupName.trim()) {
      setError('Pattern i naziv grupe su obavezni');
      return;
    }
    
    // Testiraj regex ako je uključen
    if (newIsRegex) {
      try {
        new RegExp(newPattern, 'i');
      } catch (err) {
        setError('Nevažeći regex pattern');
        return;
      }
    }
    
    const newRule: GroupingRule = {
      id: `rule_${Date.now()}`,
      pattern: newPattern.trim(),
      groupName: newGroupName.trim(),
      isRegex: newIsRegex,
      enabled: true,
    };
    
    onRulesChange([...rules, newRule]);
    setNewPattern('');
    setNewGroupName('');
    setNewIsRegex(false);
    setError(null);
  };

  const removeRule = (id: string) => {
    onRulesChange(rules.filter(r => r.id !== id));
  };

  const toggleRule = (id: string) => {
    onRulesChange(rules.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const updateRule = (id: string, updates: Partial<GroupingRule>) => {
    onRulesChange(rules.map(r => 
      r.id === id ? { ...r, ...updates } : r
    ));
  };

  // Primeri pravila
  const examples: { pattern: string; groupName: string; isRegex: boolean }[] = [
    { pattern: 'ELEKTRONIKA', groupName: 'Dobavljač - Elektronika', isRegex: false },
    { pattern: 'KONVERZIJA', groupName: 'Banka - Konverzija', isRegex: false },
    { pattern: 'KAMATA', groupName: 'Banka - Kamata', isRegex: false },
    { pattern: 'GPP', groupName: 'Banka - GPP naknada', isRegex: false },
    { pattern: 'ALIQUANTUM', groupName: 'Dobavljač - Aliquantum', isRegex: false },
    { pattern: 'NAKNADA.*KONVERZIJ', groupName: 'Naknada za konverziju', isRegex: true },
  ];

  return (
    <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📌 Manuelna pravila grupisanja
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <X size={20} className="text-slate-400" />
        </button>
      </div>

      <p className="text-sm text-slate-400">
        Definišite pravila za grupisanje transakcija. Pravila se primenjuju po redosledu (prvo match-ovano pravilo pobeđuje).
      </p>

      {/* Add New Rule */}
      <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium text-white">Dodaj novo pravilo</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Pattern (tekst ili regex)</label>
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="npr. ELEKTRONIKA ili KONVERZIJA.*EUR"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Naziv grupe</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="npr. Dobavljač - Elektronika"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newIsRegex}
              onChange={(e) => setNewIsRegex(e.target.checked)}
              className="w-4 h-4 bg-slate-700 border-slate-600 text-purple-500 rounded"
            />
            <span className="text-sm text-slate-300">Koristi regex</span>
          </label>
          
          <button
            onClick={addRule}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Dodaj pravilo
          </button>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Existing Rules */}
      {rules.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Aktivna pravila ({rules.length})</h4>
          
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                className={`bg-slate-900/50 rounded-lg p-3 flex items-center gap-3 ${
                  !rule.enabled ? 'opacity-50' : ''
                }`}
              >
                <span className="text-xs text-slate-500 font-mono w-6">#{index + 1}</span>
                
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRule(rule.id)}
                  className="w-4 h-4 bg-slate-700 border-slate-600 text-green-500 rounded"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs bg-slate-800 px-2 py-0.5 rounded text-purple-400 font-mono">
                      {rule.pattern}
                    </code>
                    {rule.isRegex && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                        regex
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={rule.groupName}
                    onChange={(e) => updateRule(rule.id, { groupName: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700/50 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                </div>
                
                <button
                  onClick={() => removeRule(rule.id)}
                  className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white">💡 Primeri pravila</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {examples.map((example, i) => (
            <button
              key={i}
              onClick={() => {
                setNewPattern(example.pattern);
                setNewGroupName(example.groupName);
                setNewIsRegex(example.isRegex);
              }}
              className="text-left p-2 bg-slate-900/30 hover:bg-slate-800/50 border border-slate-700/30 rounded-lg text-xs transition-colors"
            >
              <div className="text-purple-400 font-mono mb-1">{example.pattern}</div>
              <div className="text-slate-400">{example.groupName}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
        <strong>💡 Kako funkcioniše:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Pravila se primenjuju po redosledu (prvo match-ovano pravilo pobeđuje)</li>
          <li>Pattern može biti običan tekst ili regex (ako je uključeno)</li>
          <li>Match-ovane transakcije se grupišu pod nazivom grupe</li>
          <li>Manuelna pravila imaju prioritet nad automatskim grupisanjem</li>
        </ul>
      </div>
    </div>
  );
}
