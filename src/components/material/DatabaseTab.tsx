import React from "react";
import { canEditOrDelete } from "../../lib/permissions";
import {
  Database,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Search,
  Lock,
  Terminal,
  Monitor,
  ChevronRight,
  FileSpreadsheet,
  X,
  Save,
} from "lucide-react";

interface DatabaseTabProps {
  tables: any[];
  selectedTable: any;
  setSelectedTable: (t: any) => void;
  data: any[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  setEditingRow: (r: any) => void;
  activeSchemaTab: "row" | "column" | "sql" | "event_log" | "table" | "reconciliation_log";
  setActiveSchemaTab: (tab: any) => void;
  sqlQuery: string;
  setSqlQuery: (q: string) => void;
  sqlResult: any;
  sqlExecuting: boolean;
  runSqlQuery: () => void;
  currentColumns: any[];
  handleDelete: (id: any) => void;
  handleDeleteColumn: (name: string) => void;
  newFieldName: string;
  setNewFieldName: (s: string) => void;
  newFieldType: string;
  setNewFieldType: (s: string) => void;
  handleAddField: () => void;
  newTableName: string;
  setNewTableName: (s: string) => void;
  handleCreateTable: () => void;
  initializeDatabase: () => void;
  confirmDeleteTable: string | null;
  setConfirmDeleteTable: (s: string | null) => void;
  handleDropTable: (s: string) => void;
  handleCsvImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDatabaseExport?: () => void;
  isExporting?: boolean;
}

export default function DatabaseTab({
  tables,
  selectedTable,
  setSelectedTable,
  data,
  loading,
  searchTerm,
  setSearchTerm,
  setEditingRow,
  activeSchemaTab,
  setActiveSchemaTab,
  sqlQuery,
  setSqlQuery,
  sqlResult,
  sqlExecuting,
  runSqlQuery,
  currentColumns,
  handleDelete,
  handleDeleteColumn,
  newFieldName,
  setNewFieldName,
  newFieldType,
  setNewFieldType,
  handleAddField,
  newTableName,
  setNewTableName,
  handleCreateTable,
  initializeDatabase,
  confirmDeleteTable,
  setConfirmDeleteTable,
  handleDropTable,
  handleCsvImport,
  onDatabaseExport,
  isExporting,
}: DatabaseTabProps) {
  
  // Filter core items matching term
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  return (
    <div className="grid grid-cols-12 gap-6 h-full min-h-0">
      {/* Left Column: Database Tables Navigator */}
      <div className="col-span-12 md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between p-3.5 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-[#1a237e] text-white p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                System Tables
              </span>
            </div>
            <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded italic">
              {tables.length} Detected
            </span>
          </div>

          <div className="space-y-1 max-h-96 md:max-h-[500px] overflow-y-auto pr-1">
            {tables.map((tbl) => (
              <button
                key={tbl.name}
                onClick={() => { setSelectedTable(tbl); setActiveSchemaTab("row"); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between rounded-lg border transition-all text-xs font-bold ${
                  selectedTable?.name === tbl.name
                    ? "bg-[#ec407a] text-white border-pink-400 shadow-sm"
                    : "bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {React.createElement(tbl.icon || Database, { className: "h-3.5 w-3.5" })}
                  <span className="truncate uppercase">{tbl.label || tbl.name.replace(/_/g, " ")}</span>
                </div>
                {selectedTable?.name === tbl.name && <ChevronRight className="h-4 w-4 animate-pulse" />}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Database Bootstrap Actions */}
        <div className="space-y-2 border-t border-slate-200 pt-3">
          {onDatabaseExport && (
            <button
              onClick={onDatabaseExport}
              disabled={isExporting}
              className="w-full bg-[#1a237e] hover:bg-slate-900 duration-150 text-white text-[9px] font-black uppercase tracking-wider py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm border border-transparent active:scale-[0.98]"
            >
              <Download className="h-3 w-3" />
              <span>{isExporting ? "EXPORTING BACKUP..." : "DB OFFLINE BACKUP (JSON)"}</span>
            </button>
          )}

          <button
            onClick={initializeDatabase}
            className="w-full bg-[#3f51b5] hover:bg-[#303f9f] text-white text-[9px] font-black uppercase tracking-wider py-2 rounded-lg transition-colors"
          >
            BOOTSTRAP ENTIRE DB
          </button>
          
          <div className="space-y-1.5 bg-white p-2 border border-slate-200 rounded-lg">
            <input
 id="new_table_160" name="new_table" aria-label="NEW TABLE..."              className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px] uppercase font-bold outline-none"
              placeholder="NEW TABLE..."
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value.toLowerCase())}
            />
            <button
              onClick={handleCreateTable}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase py-1.5 rounded"
            >
              CREATE NEW TABLE
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Grid and Details View */}
      <div className="col-span-12 md:col-span-9 bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-4 flex flex-col justify-between">
        {/* Schema Control Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(
              [
                { id: "row", label: "Inspect Rows" },
                { id: "column", label: "Fields Schema" },
                { id: "sql", label: "SQL Shell" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSchemaTab(item.id)}
                className={`px-3.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-md transition-all ${
                  activeSchemaTab === item.id
                    ? "bg-white text-pink-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-[10px] uppercase font-semibold text-slate-400">
            Primary Key: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700">{selectedTable?.pk || "id"}</span>
          </div>
        </div>

        {/* Dynamic Schema Tab Content */}
        <div className="flex-1 min-h-[400px]">
          
          {/* TAB 1: Rows Inspector */}
          {activeSchemaTab === "row" && (
            <div className="space-y-4">

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 max-w-sm w-full bg-slate-50/50">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
 id="search_visible_grid_cells_218" name="search_visible_grid_cells" aria-label="Search visible grid cells..."                    className="flex-1 text-xs font-semibold outline-none bg-transparent"
                    placeholder="Search visible grid cells..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* CSV triggers */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-100">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Import CSV</span>
                    <input
 id="file_231" name="file" aria-label="file"                      type="file"
                      accept=".csv"
                      onChange={handleCsvImport}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={() => {
                      if (data.length === 0) return;
                      const headers = Object.keys(data[0]).join(",");
                      const rows = data.map((r) => Object.values(r).map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","));
                      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `${selectedTable?.name}_dump.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>

                  {onDatabaseExport && (
                    <button
                      onClick={onDatabaseExport}
                      disabled={isExporting}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95"
                    >
                      <Database className="h-3.5 w-3.5 text-purple-600" />
                      <span>{isExporting ? "SYS BACKUP..." : "DB BACKUP (JSON)"}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setEditingRow({})}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ec407a] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-pink-700 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>
              </div>

              {/* Table rendering panel */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-xs font-bold text-slate-400">
                    Retrieving master records from database...
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="p-8 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
                    No matching records found.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-xs bg-white">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5">Actions</th>
                        {currentColumns.map((col) => (
                          <th key={col.name} className="p-2.5 truncate">{col.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 font-mono text-[10px]">
                          <td className="p-2 flex gap-1.5 items-center">
                            {canEditOrDelete() && (
                              <>
                                <button
                                  onClick={() => setEditingRow(row)}
                                  className="p-1 hover:bg-slate-200 text-indigo-700 rounded"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(row[selectedTable?.pk || "id"])}
                                  className="p-1 hover:bg-slate-200 text-rose-600 rounded"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                          {currentColumns.map((col) => (
                            <td key={col.name} className="p-2.5 max-w-[150px] truncate">
                              {row[col.name] !== null ? String(row[col.name]) : <span className="opacity-40 font-sans">NULL</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Fields Schema modifications */}
          {activeSchemaTab === "column" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Current Field Schema</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50/30">
                  {currentColumns.map((col) => (
                    <div key={col.name} className="p-3 flex justify-between items-center text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-800">{col.name}</span>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">{col.type}</span>
                      </div>
                      {col.name !== selectedTable?.pk && col.name !== "created_at" && canEditOrDelete() && (
                        <button
                          onClick={() => handleDeleteColumn(col.name)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Column controls */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Append New Field Column</h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="column_field_name_366" className="text-[10px] font-black uppercase text-slate-400">Column/Field Name</label>
                    <input
 id="column_field_name_366" name="column_field_name" aria-label="Column/Field Name"                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold uppercase outline-none"
                      placeholder="e.g. delivery_notes"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="data_standard_type_376" className="text-[10px] font-black uppercase text-slate-400">Data Standard Type</label>
                    <select
 id="data_standard_type_376" name="data_standard_type" aria-label="Data Standard Type"                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold outline-none"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                    >
                      <option value="TEXT">Text String</option>
                      <option value="DOUBLE PRECISION">Decimal Numeric (double)</option>
                      <option value="BIGINT">Large integer (bigint)</option>
                      <option value="DATE">Standard Date (YYYY-MM-DD)</option>
                      <option value="BOOLEAN">Boolean binary</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAddField}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow"
                  >
                    DEPLOY FIELD PATH
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Direct PostgreSQL scratch shell */}
          {activeSchemaTab === "sql" && (
            <div className="space-y-4">
              <div className="p-2 border border-blue-200 bg-blue-50 text-blue-900 rounded-xl flex items-start gap-2 text-xs">
                <Terminal className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
                <span>
                  <strong>Postgres Scratchpad Console:</strong> Run arbitrary PostgreSQL statements against real public schema resources. Avoid structural updates here in production.
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2 h-96">
                <div className="flex-1 font-mono text-xs text-emerald-400">
                  <textarea
 id="write_query_here_e_g_nsel_412" name="write_query_here_e_g_nsel" aria-label="-- Write query here, e.g.\nSELECT * FROM user_master LIMIT 5;"                    className="w-full h-full bg-transparent border-none resize-none outline-none font-mono text-xs text-white p-2"
                    placeholder="-- Write query here, e.g.\nSELECT * FROM user_master LIMIT 5;"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                  />
                </div>
                <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center bg-slate-950 px-2.5 py-1.5 rounded-lg">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase">
                    Status: Direct Sandbox Connected
                  </span>
                  <button
                    onClick={runSqlQuery}
                    className="px-4 py-1.5 bg-[#ec407a] hover:bg-pink-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md transition-colors"
                    disabled={sqlExecuting}
                  >
                    {sqlExecuting ? "Executing query..." : "Execute Statement"}
                  </button>
                </div>
              </div>

              {/* SQL Prompt execution results preview */}
              {sqlResult && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-56 overflow-auto">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Statement Output</span>
                  <pre className="font-mono text-[10px] text-slate-700 whitespace-pre font-semibold leading-relaxed">
                    {JSON.stringify(sqlResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
