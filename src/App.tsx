import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { StatementsList } from './components/StatementsList';
import { AggregatedDashboard } from './components/AggregatedDashboard';
import { ChronologicalTransactions } from './components/ChronologicalTransactions';
import { AggregatedCharts } from './components/AggregatedCharts';
import { StatementDetail } from './components/StatementDetail';
import { ExportPanel } from './components/ExportPanel';
import { FileInfo } from './components/FileInfo';
import { ParserDebugView } from './components/ParserDebugView';
import { parseBankStatement } from './utils/BankStatementParser';
import type { BankStatement } from './types/BankStatement';
import type { PageData, PDFMetadata } from './types/App.types';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function App() {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'charts' | 'statements' | 'detail' | 'export' | 'info'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParserDebug, setShowParserDebug] = useState(false);

  const selectedStatement = statements.find(s => s.id === selectedStatementId);

  const handleFilesSelect = async (files: File[]) => {
    setLoading(true);
    setError(null);

    const existingFileNames = new Set(statements.map(s => s.fileName));
    const newStatements: BankStatement[] = [];

    for (const file of files) {
      if (existingFileNames.has(file.name)) {
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const pages: PageData[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => ({
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height,
              fontName: item.fontName,
            }));
          
          const text = items.map((item: any) => item.text).join(' ');
          pages.push({ pageNumber: i, text, items });
        }

        const metadata = await pdf.getMetadata().catch(() => null);
        const info = metadata?.info as any;
        
        const pdfMetadata: PDFMetadata = {
          title: info?.Title || file.name,
          author: info?.Author || 'Nepoznato',
          subject: info?.Subject || 'Nepoznato',
          creator: info?.Creator || 'Nepoznato',
          producer: info?.Producer || 'Nepoznato',
          pageCount: numPages,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          fileName: file.name,
        };

        const summary = parseBankStatement(pages, file.name);

        newStatements.push({
          id: `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          uploadDate: new Date(),
          metadata: pdfMetadata,
          summary,
          pages,
        });

        existingFileNames.add(file.name);
      } catch (err) {
        console.error(`Greška pri obradi ${file.name}:`, err);
      }
    }

    if (newStatements.length > 0) {
      setStatements(prev => [...prev, ...newStatements].sort((a, b) => {
        const parseDate = (dateStr: string): Date => {
          if (!dateStr) return new Date('1900-01-01');
          const parts = dateStr.split('.');
          if (parts.length !== 3) return new Date('1900-01-01');
          const [day, month, year] = parts.map(p => parseInt(p));
          return new Date(year, month - 1, day);
        };
        
        const dateA = parseDate(a.summary.periodStart);
        const dateB = parseDate(b.summary.periodStart);
        return dateA.getTime() - dateB.getTime();
      }));
    }

    setLoading(false);
  };

  const handleRemoveStatement = (id: string) => {
    setStatements(prev => prev.filter(s => s.id !== id));
    if (selectedStatementId === id) {
      setSelectedStatementId(null);
      setActiveTab('dashboard');
    }
  };

  const handleSelectStatement = (id: string) => {
    setSelectedStatementId(id);
    setActiveTab('detail');
  };

  const handleReset = () => {
    setStatements([]);
    setSelectedStatementId(null);
    setActiveTab('dashboard');
  };

  const allTransactions = statements.flatMap(s => 
    s.summary.transactions.map(t => ({
      ...t,
      statementFileName: s.fileName,
      statementId: s.id,
    }))
  );

  const aggregatedSummary = {
    transactions: allTransactions,
    totalIncome: statements.reduce((sum, s) => sum + s.summary.totalIncome, 0),
    totalExpense: statements.reduce((sum, s) => sum + s.summary.totalExpense, 0),
    netChange: statements.reduce((sum, s) => sum + s.summary.netChange, 0),
    openingBalance: statements.length > 0 ? statements[0].summary.openingBalance : 0,
    closingBalance: statements.length > 0 ? statements[statements.length - 1].summary.closingBalance : 0,
    currency: 'EUR',
    periodStart: statements.length > 0 ? statements[0].summary.periodStart : '',
    periodEnd: statements.length > 0 ? statements[statements.length - 1].summary.periodEnd : '',
    transactionCount: allTransactions.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Bankovni Izvodi - Analiza
              </h1>
              <p className="text-xs text-slate-400">
                {statements.length > 0 
                  ? `${statements.length} ${statements.length === 1 ? 'izvod' : 'izvoda'} • ${allTransactions.length} transakcija`
                  : 'Praćenje finansijskog stanja iz PDF bankovnih izvoda'}
              </p>
            </div>
          </div>
          {statements.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => document.getElementById('file-input')?.click()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Dodaj izvod
              </button>
              <button
                onClick={() => setShowParserDebug(true)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Parser Debug
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm"
              >
                Obriši sve
              </button>
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleFilesSelect(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {statements.length === 0 ? (
          <FileUpload onFilesSelect={handleFilesSelect} loading={loading} />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 border-b border-slate-700/50 pb-2">
              {[
                { id: 'dashboard', label: 'Pregled' },
                { id: 'transactions', label: 'Sve stavke (hronološki)' },
                { id: 'charts', label: 'Grafici' },
                { id: 'statements', label: 'Izvodi' },
                ...(selectedStatement ? [{ id: 'detail', label: 'Detalji izvoda' }] : []),
                { id: 'export', label: 'Export' },
                ...(selectedStatement ? [{ id: 'info', label: 'Info' }] : []),
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-[500px]">
              {activeTab === 'dashboard' && (
                <AggregatedDashboard summary={aggregatedSummary} statements={statements} />
              )}
              {activeTab === 'transactions' && (
                <ChronologicalTransactions
                  transactions={allTransactions}
                  currency="EUR"
                  statements={statements}
                />
              )}
              {activeTab === 'charts' && (
                <AggregatedCharts summary={aggregatedSummary} />
              )}
              {activeTab === 'statements' && (
                <StatementsList
                  statements={statements}
                  onSelect={handleSelectStatement}
                  onRemove={handleRemoveStatement}
                />
              )}
              {activeTab === 'detail' && selectedStatement && (
                <StatementDetail statement={selectedStatement} />
              )}
              {activeTab === 'export' && (
                <ExportPanel statements={statements} aggregatedSummary={aggregatedSummary} />
              )}
              {activeTab === 'info' && selectedStatement && (
                <FileInfo metadata={selectedStatement.metadata} expanded />
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-medium">Obrada PDF fajlova...</p>
              <p className="text-sm text-slate-400">Ekstrakcija transakcija iz bankovnih izvoda</p>
            </div>
          </div>
        )}

        {showParserDebug && (
          <ParserDebugView 
            statements={statements} 
            onClose={() => setShowParserDebug(false)} 
          />
        )}
      </main>
    </div>
  );
}
