import { useState } from 'react';
import { Plus, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { GroupingRule } from '../types/GroupingRule';

interface GroupingRulesPanelProps {
  rules: GroupingRule[];
  onRulesChange: (rules: GroupingRule[]) => void;
  onClose: () => void;
}

export function GroupingRulesPanel({ rules, onRulesChange, onClose }: GroupingRulesPanelProps) {
  const [newPattern, setNewPattern] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newIsRegex, setNewIsRegex] = useState(false);
  const [newTag, setNewTag] = useState('');
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
      tag: newTag.trim() || undefined,
    };
    
    onRulesChange([...rules, newRule]);
    setNewPattern('');
    setNewGroupName('');
    setNewIsRegex(false);
    setNewTag('');
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
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Pattern (tekst ili regex)</label>
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="npr. ELEKTRONIKA, KONVERZIJA, KAMATA"
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
          
          <div>
            <label className="text-xs text-slate-400 mb-1 block">🏷️ Tag (opciono)</label>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="npr. Dobavljač, Banka, Režije..."
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
                className={`bg-slate-900/50 rounded-lg p-3 flex items-start gap-3 ${
                  !rule.enabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex flex-col items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
                  
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                    className="w-4 h-4 bg-slate-700 border-slate-600 text-green-500 rounded"
                    title={rule.enabled ? 'Onemogući pravilo' : 'Omogući pravilo'}
                  />
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Pattern input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rule.pattern}
                      onChange={(e) => updateRule(rule.id, { pattern: e.target.value })}
                      placeholder="uslov1, uslov2, uslov3..."
                      className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700/50 rounded text-sm text-purple-400 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={rule.isRegex}
                        onChange={(e) => updateRule(rule.id, { isRegex: e.target.checked })}
                        className="w-3.5 h-3.5 bg-slate-700 border-slate-600 text-blue-500 rounded"
                      />
                      <span className="text-xs text-slate-400">Regex</span>
                    </label>
                  </div>
                  
                  {/* Group name input */}
                  <input
                    type="text"
                    value={rule.groupName}
                    onChange={(e) => updateRule(rule.id, { groupName: e.target.value })}
                    placeholder="Naziv grupe"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700/50 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                  
                  {/* Tag input */}
                  <div>
                    <label className="text-xs text-slate-500 mb-0.5 block">🏷️ Tag</label>
                    <input
                      type="text"
                      value={rule.tag || ''}
                      onChange={(e) => updateRule(rule.id, { tag: e.target.value || undefined })}
                      placeholder="Tag za grupisanje po tagovima (opciono)"
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700/50 rounded text-sm text-cyan-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => removeRule(rule.id)}
                  className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  title="Obriši pravilo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
        <strong>💡 Kako funkcioniše:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Pravila se primenjuju po redosledu (prvo match-ovano pravilo pobeđuje)</li>
          <li>Pattern može biti običan tekst ili regex (ako je uključeno)</li>
          <li>Jedno pravilo može sadržati više uslova odvojenih zarezom (OR logika)</li>
          <li>Match-ovane transakcije se grupišu pod nazivom grupe</li>
          <li>Uz svako pravilo možete dodati <strong>tag</strong> za grupisanje po tagovima</li>
          <li>Sve transakcije koje ne matchuju nijedno pravilo idu u "Negrupisano"</li>
        </ul>
      </div>
    </div>
  );
}
