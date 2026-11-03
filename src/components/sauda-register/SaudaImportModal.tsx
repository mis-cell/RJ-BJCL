import React from 'react';
import { Upload, X, Download, RefreshCcw } from 'lucide-react';

interface SaudaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importCsvText: string;
  setImportCsvText: (text: string) => void;
  handleCsvImport: (csvText: string) => void;
  isImporting: boolean;
  importStatusMessage: string;
}

export function SaudaImportModal({
  isOpen,
  onClose,
  importCsvText,
  setImportCsvText,
  handleCsvImport,
  isImporting,
  importStatusMessage,
}: SaudaImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 rounded-xl text-sky-800 font-bold">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Bulk Import Sauda Contracts from CSV</h3>
              <p className="text-xs text-slate-500 font-medium">Upload a CSV file or paste raw CSV text to inject contracts directly into Supabase</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File upload picker */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-extrabold text-slate-700">1. Upload CSV File</label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  const content = evt.target?.result as string;
                  if (content) setImportCsvText(content);
                };
                reader.readAsText(file);
              }
            }}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
          />
        </div>

        {/* CSV Textarea */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-extrabold text-slate-700">2. Or Paste CSV Raw Text</label>
            <a
              href="/sample_sauda_import.csv"
              download="sample_sauda_import.csv"
              className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              <span>Download Sample CSV Template</span>
            </a>
          </div>
          <textarea
            rows={8}
            value={importCsvText}
            onChange={(e) => setImportCsvText(e.target.value)}
            placeholder={`"Order No","Session","PO Type","Date","Broker","Supplier","Area","Agency","Marka","Quality","Rs"\n"BJCL/2026-2027/0586","2026-2027","Normal","14-09-2026","SHREE BRIJDHAM TRADERS","SHREE BRIJDHAM TRADERS","LOWER ASSAM","BILASHIPARA","YUNUS","TD6",13400`}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
          />
        </div>

        {importStatusMessage && (
          <p className="text-xs font-bold text-sky-800 bg-sky-50 p-2.5 rounded-xl border border-sky-200 flex items-center gap-2">
            <RefreshCcw className="h-3.5 w-3.5 animate-spin text-sky-600" />
            <span>{importStatusMessage}</span>
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleCsvImport(importCsvText)}
            disabled={isImporting || !importCsvText.trim()}
            className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span>{isImporting ? "Importing Data..." : "Upload & Inject to Supabase"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
