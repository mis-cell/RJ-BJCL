import React from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Search,
  RefreshCcw,
  X
} from 'lucide-react';
import { TableDef } from './adminDeskTypes';

interface AdminDeskClassicLayoutProps {
  tables: TableDef[];
  selectedTable: TableDef | null;
  setSelectedTable: (table: TableDef | null) => void;
  data: any[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentColumns: Array<{ name: string; type: string }>;
  editorColumns: string[];
  setEditingRow: (row: any) => void;
  setIsNewRow?: (val: boolean) => void;
  handleDelete: (pkValue: any) => void;
  handleCsvImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDatabaseExport: () => void;
  isExporting: boolean;
  fetchData: () => void;
  onClose?: () => void;
}

export const AdminDeskClassicLayout: React.FC<AdminDeskClassicLayoutProps> = ({
  tables,
  selectedTable,
  setSelectedTable,
  data,
  loading,
  searchTerm,
  setSearchTerm,
  currentColumns,
  editorColumns,
  setEditingRow,
  setIsNewRow,
  handleDelete,
  handleCsvImport,
  handleDatabaseExport,
  isExporting,
  fetchData,
  onClose
}) => {
  const [maintenanceEnabled, setMaintenanceEnabled] = React.useState(false);
  const [showBackupModal, setShowBackupModal] = React.useState(false);
  const [backupList, setBackupList] = React.useState<any[]>([]);
  const [backupDir, setBackupDir] = React.useState("/home/ubuntu/backups");
  const [dbConnInfo, setDbConnInfo] = React.useState<{ host: string; port: number; database: string }>({
    host: "127.0.0.1",
    port: 5432,
    database: "bjcl_db",
  });
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

  const loadAdminServerState = React.useCallback(async () => {
    try {
      const [mRes, bRes] = await Promise.all([
        fetch("/api/maintenance"),
        fetch("/api/admin/backups"),
      ]);
      if (mRes.ok) {
        const mJson = await mRes.json();
        setMaintenanceEnabled(Boolean(mJson?.enabled));
      }
      if (bRes.ok) {
        const bJson = await bRes.json();
        if (Array.isArray(bJson?.backups)) setBackupList(bJson.backups);
        if (bJson?.backupDir) setBackupDir(bJson.backupDir);
        if (bJson?.dbConnection) setDbConnInfo(bJson.dbConnection);
      }
    } catch (_e) {}
  }, []);

  React.useEffect(() => {
    loadAdminServerState();
    const onMaintChanged = () => loadAdminServerState();
    window.addEventListener("maintenance-mode-changed", onMaintChanged);
    return () => window.removeEventListener("maintenance-mode-changed", onMaintChanged);
  }, [loadAdminServerState]);

  const handleToggleMaintenance = async () => {
    try {
      setBusyAction("maintenance");
      const next = !maintenanceEnabled;
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next,
          message: "Server update in progress. Please wait and try again shortly.",
          updatedBy: "ADMIN",
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setMaintenanceEnabled(Boolean(d?.maintenance?.enabled));
        window.dispatchEvent(new CustomEvent("maintenance-mode-changed"));
        setActionFeedback(
          d?.maintenance?.enabled
            ? "Maintenance Mode is now ON. Non-admin logins & features are locked with: 'Server update in progress. Please wait and try again shortly.'"
            : "Maintenance Mode is now OFF. All users can log in and use the application normally."
        );
      }
    } catch (e: any) {
      setActionFeedback(`Error toggling maintenance mode: ${e?.message || e}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunBackupNow = async () => {
    try {
      setBusyAction("backup");
      setActionFeedback("Running verified pg_dump & pg_dumpall backup across all PostgreSQL databases...");
      const res = await fetch("/api/admin/backups/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual_admin_desk_backup" }),
      });
      const json = await res.json();
      setActionFeedback(json?.message || "Backup finished.");
      await loadAdminServerState();
    } catch (e: any) {
      setActionFeedback(`Backup failed: ${e?.message || e}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestoreBackup = async (filePath: string, fileName: string) => {
    try {
      setBusyAction(`restore:${fileName}`);
      setActionFeedback(`Creating pre-restore safety backup of current database, then restoring ${fileName}...`);
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, fileName }),
      });
      const json = await res.json();
      setActionFeedback(json?.message || "Restore complete.");
      await loadAdminServerState();
      fetchData();
    } catch (e: any) {
      setActionFeedback(`Restore failed: ${e?.message || e}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRecoverMissingData = async () => {
    try {
      setBusyAction("recover");
      setActionFeedback(
        "Creating safety backup of current DB, then scanning Docker 54322, local DBs, backups & Supabase Cloud for missing records..."
      );
      const res = await fetch("/api/admin/recover-missing-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      setActionFeedback(json?.message || "Data recovery completed.");
      await loadAdminServerState();
      fetchData();
    } catch (e: any) {
      setActionFeedback(`Recovery failed: ${e?.message || e}`);
    } finally {
      setBusyAction(null);
    }
  };

  const filteredData = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="w-full h-full bg-[#FBCFCB] flex flex-col font-sans overflow-hidden text-slate-800">
      {/* Title Bar */}
      <div className="bg-[#D94B5A] text-white px-3 py-1 flex justify-between items-center h-8 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-white" />
          <span className="text-[11px] font-black uppercase tracking-wider italic">
            System Administration Console - Relational Schema &amp; Business Policy Desk
          </span>
          <span className="hidden md:inline-block ml-2 px-2 py-0.5 rounded bg-black/25 text-[10px] font-mono font-bold">
            PostgreSQL: {dbConnInfo.host}:{dbConnInfo.port}/{dbConnInfo.database}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 py-0.5 bg-[#FBCFCB] hover:bg-rose-600 hover:text-white text-slate-900 border-t-white border-l-white border-b-black border-r-black border text-[10px] font-black cursor-pointer transition-colors"
            title="Close Admin Console"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-2 overflow-hidden bg-[#FBCFCB]">
        {/* Row Data Browser */}
        <div className="flex-1 bg-[#E8E6E1] border-t-white border-l-white border-b-slate-800 border-r-slate-800 border-2 p-3 flex flex-col min-h-0 overflow-hidden shadow-inner">
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Action Feedback Banner */}
            {actionFeedback && (
              <div className="bg-amber-50 border border-amber-500 text-amber-950 px-3 py-1.5 text-xs font-bold flex items-center justify-between gap-2">
                <span>{actionFeedback}</span>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 text-[10px] font-black rounded cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FBCFCB] p-2 border-t-white border-l-white border-b-slate-700 border-r-slate-700 border">
              {/* Left Controls: Select Table & Refresh */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-slate-700">Select Table:</span>
                <select
                  value={selectedTable?.name || ""}
                  onChange={(e) => {
                    const t = tables.find((x) => x.name === e.target.value);
                    if (t) setSelectedTable(t);
                  }}
                  className="bg-white border border-slate-400 p-1 text-xs font-bold outline-none cursor-pointer"
                >
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.label} ({t.name})
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchData}
                  className="px-2.5 py-1 bg-[#FBCFCB] hover:bg-slate-200 border-t-white border-l-white border-b-black border-r-black border text-xs font-bold cursor-pointer transition-colors"
                >
                  <RefreshCcw className="h-3.5 w-3.5 inline mr-1" />
                  Refresh
                </button>

                {/* Maintenance Mode Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleMaintenance}
                  disabled={busyAction === "maintenance"}
                  className={`px-2.5 py-1 font-black text-xs border cursor-pointer transition-colors ${
                    maintenanceEnabled
                      ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-950"
                      : "bg-slate-800 hover:bg-slate-900 text-white border-black"
                  }`}
                >
                  {maintenanceEnabled ? "● Maintenance Mode: ON (Click to Turn OFF)" : "Maintenance Mode: OFF"}
                </button>

                {/* PostgreSQL Backups & Restore Modal Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    loadAdminServerState();
                    setShowBackupModal(true);
                  }}
                  className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-black text-xs border border-teal-950 cursor-pointer transition-colors"
                >
                  <Database className="h-3.5 w-3.5 inline mr-1" />
                  PG Backups ({backupList.length})
                </button>

                {/* Recover Missing Data Button */}
                <button
                  type="button"
                  onClick={handleRecoverMissingData}
                  disabled={busyAction === "recover"}
                  className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs border border-purple-950 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {busyAction === "recover" ? "Recovering..." : "Recover Missing Data"}
                </button>
              </div>

              {/* Right Controls: Search, New Record, Export, Import */}
              <div className="flex items-center gap-2">
                <div className="relative flex items-center bg-white border border-slate-400 px-2 py-0.5 text-xs">
                  <Search className="h-3.5 w-3.5 text-slate-500 mr-1 shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search records..."
                    className="bg-transparent border-none outline-none text-slate-900 w-36 font-semibold"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!selectedTable) return;
                    const emptyRow: any = {};
                    editorColumns.forEach((c) => (emptyRow[c] = ""));
                    if (setIsNewRow) setIsNewRow(true);
                    setEditingRow(emptyRow);
                  }}
                  className="px-3 py-1 bg-[#D94B5A] text-white font-black text-xs border-t-blue-400 border-l-blue-400 border-b-blue-950 border-r-blue-950 border cursor-pointer hover:bg-blue-900 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 inline mr-1" />
                  + New Record
                </button>

                <button
                  onClick={handleDatabaseExport}
                  disabled={isExporting}
                  className="px-3 py-1 bg-emerald-700 text-white font-black text-xs border-t-emerald-400 border-l-emerald-400 border-b-emerald-950 border-r-emerald-950 border cursor-pointer hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 inline mr-1" />
                  {isExporting ? "Exporting..." : "Export All DB"}
                </button>

                <label className="px-3 py-1 bg-indigo-700 text-white font-black text-xs border-t-indigo-400 border-l-indigo-400 border-b-indigo-950 border-r-indigo-950 border cursor-pointer hover:bg-indigo-800 transition-colors">
                  <Upload className="h-3.5 w-3.5 inline mr-1" />
                  Import CSV
                  <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
                </label>
              </div>
            </div>

            {/* PostgreSQL Backups & Restore Modal */}
            {showBackupModal && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div className="bg-white border-2 border-slate-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                  <div className="bg-[#D94B5A] text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        PostgreSQL Automated Backups &amp; Safe Restore ({backupDir})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBackupModal(false)}
                      className="text-white hover:text-amber-200 font-black text-sm cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-800">
                        Active Database: <span className="font-mono text-teal-800">{dbConnInfo.host}:{dbConnInfo.port}/{dbConnInfo.database}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Automatic daily &amp; hourly backups of all PostgreSQL databases (<span className="font-mono">bjcl_db</span>, <span className="font-mono">postgres</span>, <span className="font-mono">SQC</span>) with 30-day retention. Every restore automatically creates a <span className="font-mono">pre_restore_safety_*</span> backup first.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRunBackupNow}
                        disabled={busyAction === "backup"}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-black text-xs rounded cursor-pointer disabled:opacity-50"
                      >
                        {busyAction === "backup" ? "Backing up..." : "+ Backup All Databases Now"}
                      </button>
                      <button
                        type="button"
                        onClick={handleRecoverMissingData}
                        disabled={busyAction === "recover"}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded cursor-pointer disabled:opacity-50"
                      >
                        {busyAction === "recover" ? "Scanning..." : "Scan & Recover Missing Data"}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    {backupList.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 font-semibold">
                        No backup files found in {backupDir} yet. Click &ldquo;+ Backup All Databases Now&rdquo; to create and verify one immediately.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse border border-slate-300">
                        <thead className="bg-slate-200 text-slate-800 font-black uppercase text-[11px]">
                          <tr>
                            <th className="p-2 border border-slate-300">Backup File</th>
                            <th className="p-2 border border-slate-300">Database(s)</th>
                            <th className="p-2 border border-slate-300">Size</th>
                            <th className="p-2 border border-slate-300">Timestamp</th>
                            <th className="p-2 border border-slate-300 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          {backupList.map((b) => (
                            <tr key={b.filePath} className="hover:bg-slate-50">
                              <td className="p-2 border border-slate-200 font-bold text-slate-900">{b.fileName}</td>
                              <td className="p-2 border border-slate-200">{b.database}</td>
                              <td className="p-2 border border-slate-200">{b.sizeFormatted}</td>
                              <td className="p-2 border border-slate-200">{new Date(b.createdAt).toLocaleString()}</td>
                              <td className="p-2 border border-slate-200 text-center font-sans">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreBackup(b.filePath, b.fileName)}
                                  disabled={busyAction !== null}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded uppercase cursor-pointer disabled:opacity-50"
                                >
                                  {busyAction === `restore:${b.fileName}` ? "Restoring..." : "Safe Restore"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="flex-1 bg-white border-t-slate-800 border-l-slate-800 border-b-white border-r-white border-2 overflow-auto font-mono">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#D94B5A] text-white sticky top-0 font-sans text-[11px] font-black uppercase tracking-wider shadow-xs">
                  <tr>
                    <th className="p-2 text-center w-20 border-r border-blue-900">ACTIONS</th>
                    {currentColumns.map((col) => (
                      <th key={col.name} className="p-2 border-r border-blue-900 whitespace-nowrap">
                        {col.name.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={currentColumns.length + 1} className="p-8 text-center text-slate-500 font-sans italic font-bold">
                        Querying table records...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={currentColumns.length + 1} className="p-8 text-center text-slate-500 font-sans italic font-bold">
                        No records found in table {selectedTable?.name}.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row, idx) => {
                      const pkVal = selectedTable ? row[selectedTable.pk] : idx;
                      return (
                        <tr key={pkVal || idx} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-1.5 text-center whitespace-nowrap border-r border-slate-200 font-sans">
                            <button
                              onClick={() => {
                                if (setIsNewRow) setIsNewRow(false);
                                setEditingRow(row);
                              }}
                              className="px-2 py-0.5 bg-[#FBCFCB] hover:bg-slate-300 text-slate-900 text-[10px] font-bold border border-slate-600 mr-1 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(pkVal)}
                              className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold border border-rose-900 cursor-pointer hover:bg-rose-700"
                            >
                              Del
                            </button>
                          </td>
                          {currentColumns.map((col) => (
                            <td key={col.name} className="p-1.5 border-r border-slate-200 max-w-xs truncate font-medium text-slate-800">
                              {typeof row[col.name] === "object"
                                ? JSON.stringify(row[col.name])
                                : String(row[col.name] ?? "")}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Status */}
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 bg-[#FBCFCB] px-2 py-1 border border-slate-400">
              <span>
                Showing {filteredData.length} records in {selectedTable?.name}
              </span>
              <span>Total Tables: {tables.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
