import { useState, useCallback } from 'react';
import { FileText, BarChart3, Table, Database, Sparkles, Info, Download } from 'lucide-react';
import PDFUploader from './components/PDFUploader';
import SummaryCards from './components/SummaryCards';
import TransactionTable from './components/TransactionTable';
import Charts from './components/Charts';
import { extractTextFromPDF } from './utils/pdfParser';
import { parseTransactions, calculateSummary } from './utils/transactionParser';
import { Transaction } from './types';

type TabType = 'overview' | 'transactions' | 'charts';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [fileName, setFileName] = useState<string>('');
  const [hasData, setHasData] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const text = await extractTextFromPDF(file);
      const parsed = parseTransactions(text);
      
      if (parsed.length === 0) {
        setError('Nisu pronađene transakcije u ovom PDF-u. Aplikacija pokušava da prepoznata datume, opise i iznose. Možda format bankovnog izvoda nije podržan.');
      }
      
      setTransactions(parsed);
      setHasData(true);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Greška pri čitanju PDF fajla. Molimo pokušajte ponovo ili koristite drugi PDF.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDemoData = useCallback(() => {
    const demoTransactions: Transaction[] = [
      { id: '1', date: '01.01.2024', description: 'Plata - January', amount: 120000, type: 'income', category: 'Plata' },
      { id: '2', date: '03.01.2024', description: 'Maxi supermarket', amount: 5430, type: 'expense', category: 'Hrana i piće' },
      { id: '3', date: '05.01.2024', description: 'Stanarina - Rent', amount: 45000, type: 'expense', category: 'Stanovanje' },
      { id: '4', date: '07.01.2024', description: 'Uber ride', amount: 890, type: 'expense', category: 'Transport' },
      { id: '5', date: '08.01.2024', description: 'Netflix pretplata', amount: 1290, type: 'expense', category: 'Zabava' },
      { id: '6', date: '10.01.2024', description: 'Apoteka Benu', amount: 2340, type: 'expense', category: 'Zdravlje' },
      { id: '7', date: '12.01.2024', description: 'MTS internet', amount: 2990, type: 'expense', category: 'Stanovanje' },
      { id: '8', date: '14.01.2024', description: 'Shell gorivo', amount: 6500, type: 'expense', category: 'Transport' },
      { id: '9', date: '15.01.2024', description: 'Restaurant Italia', amount: 3200, type: 'expense', category: 'Hrana i piće' },
      { id: '10', date: '17.01.2024', description: 'Gym - Teretana', amount: 4500, type: 'expense', category: 'Zabava' },
      { id: '11', date: '19.01.2024', description: 'Idea Market', amount: 3870, type: 'expense', category: 'Hrana i piće' },
      { id: '12', date: '20.01.2024', description: 'Parking centar', amount: 450, type: 'expense', category: 'Transport' },
      { id: '13', date: '22.01.2024', description: 'Struja - EPS', amount: 7800, type: 'expense', category: 'Stanovanje' },
      { id: '25', date: '25.01.2024', description: 'Kurs - English language', amount: 12000, type: 'expense', category: 'Obrazovanje' },
      { id: '14', date: '28.01.2024', description: 'Freelance uplata', amount: 35000, type: 'income', category: 'Plata' },
      { id: '15', date: '01.02.2024', description: 'Plata - February', amount: 120000, type: 'income', category: 'Plata' },
      { id: '16', date: '03.02.2024', description: 'Maxi supermarket', amount: 6120, type: 'expense', category: 'Hrana i piće' },
      { id: '17', date: '05.02.2024', description: 'Stanarina - Rent', amount: 45000, type: 'expense', category: 'Stanovanje' },
      { id: '18', date: '08.02.2024', description: 'Spotify Premium', amount: 599, type: 'expense', category: 'Zabava' },
      { id: '19', date: '10.02.2024', description: 'Bolt taxi', amount: 750, type: 'expense', category: 'Transport' },
      { id: '20', date: '12.02.2024', description: 'DM Shop', amount: 2890, type: 'expense', category: 'Hrana i piće' },
      { id: '21', date: '15.02.2024', description: 'Osiguranje polisa', amount: 8500, type: 'expense', category: 'Osiguranje' },
      { id: '22', date: '18.02.2024', description: 'Bioskop - Cineplexx', amount: 1200, type: 'expense', category: 'Zabava' },
      { id: '23', date: '20.02.2024', description: 'OMV gorivo', amount: 7200, type: 'expense', category: 'Transport' },
      { id: '24', date: '25.02.2024', description: 'Voda - Beogradski vodovod', amount: 2100, type: 'expense', category: 'Stanovanje' },
    ];

    setTransactions(demoTransactions);
    setHasData(true);
    setFileName('demo_izvod.pdf');
    setError(null);
  }, []);

  const { totalIncome, totalExpenses, netBalance } = calculateSummary(transactions);

  const exportCSV = useCallback(() => {
    const headers = ['Datum', 'Opis', 'Kategorija', 'Tip', 'Iznos (RSD)'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.description}"`,
      t.category,
      t.type === 'income' ? 'Prihod' : 'Rashod',
      t.amount.toFixed(2),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bankovni_izvod_analiza.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [transactions]);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Pregled', icon: BarChart3 },
    { id: 'transactions', label: 'Transakcije', icon: Table },
    { id: 'charts', label: 'Grafikoni', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BankAnalyzer</h1>
                <p className="text-xs text-gray-500">Analiza bankovnih izvoda</p>
              </div>
            </div>
            
            {hasData && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Izvezi CSV</span>
                </button>
                <button
                  onClick={loadDemoData}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-200"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Demo podaci</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {!hasData ? 'Učitaj bankovni izvod' : 'Učitaj novi izvod'}
            </h2>
            {fileName && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {fileName}
              </span>
            )}
          </div>
          <PDFUploader onFileSelect={handleFileSelect} isLoading={isLoading} />
          
          {!hasData && !isLoading && (
            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={loadDemoData}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
                Učitaj demo podatke za pregled
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Napomena</p>
              <p className="text-sm text-amber-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {hasData && transactions.length > 0 && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${activeTab === tab.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <SummaryCards
                  totalIncome={totalIncome}
                  totalExpenses={totalExpenses}
                  netBalance={netBalance}
                  transactionCount={transactions.length}
                />
                <Charts transactions={transactions} />
              </div>
            )}

            {activeTab === 'transactions' && (
              <TransactionTable transactions={transactions} />
            )}

            {activeTab === 'charts' && (
              <Charts transactions={transactions} />
            )}
          </>
        )}

        {/* Empty State */}
        {!hasData && !isLoading && (
          <div className="mt-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Analizirajte vaše bankovne izvode
              </h3>
              <p className="text-gray-500 mb-6">
                Uploadujte PDF bankovnog izvoda i aplikacija će automatski prepoznati i kategorizovati sve transakcije.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Upload PDF</p>
                  <p className="text-xs text-gray-500 mt-1">Prevucite ili izaberite PDF fajl</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-green-600 font-bold text-sm">2</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Automatska analiza</p>
                  <p className="text-xs text-gray-500 mt-1">AI prepoznavanje transakcija</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-purple-600 font-bold text-sm">3</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Pregled rezultata</p>
                  <p className="text-xs text-gray-500 mt-1">Tabele, grafikoni i statistika</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-xs text-gray-400">
            BankAnalyzer — Alat za analizu bankovnih izvoda iz PDF dokumenata. Svi podaci se obrađuju lokalno u vašem pretraživaču.
          </p>
        </div>
      </footer>
    </div>
  );
}
