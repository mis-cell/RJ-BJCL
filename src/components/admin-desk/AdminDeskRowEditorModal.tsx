import React from 'react';
import { Save, X, ShieldAlert, Sparkles } from 'lucide-react';
import { TableDef } from './adminDeskTypes';
import {
  ALL_SYSTEM_MODULES,
  normalizeAllowedModules,
  getCanonicalModuleId,
  getCurrentUserContext
} from '../../lib/permissions';

interface AdminDeskRowEditorModalProps {
  editingRow: any;
  setEditingRow: React.Dispatch<React.SetStateAction<any>>;
  isNewRow: boolean;
  selectedTable: TableDef | null;
  editorColumns: string[];
  currentColumns: Array<{ name: string; type: string }>;
  data: any[];
  loading: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const AdminDeskRowEditorModal: React.FC<AdminDeskRowEditorModalProps> = ({
  editingRow,
  setEditingRow,
  isNewRow,
  selectedTable,
  editorColumns,
  currentColumns,
  data,
  loading,
  onSave,
  onClose
}) => {
  // Populate defaults when opening editor for new row without triggering render loops
  React.useEffect(() => {
    if (!editingRow || !selectedTable) return;

    let updates: any = null;
    if (selectedTable.name === "user_master") {
      if ((!editingRow.user_id || editingRow.user_id === "") && isNewRow) {
        let nextNum = 1;
        if (data && data.length > 0) {
          const numericIds = data
            .filter((r) => String(r.user_id || "").length < 10)
            .map((r) => {
              const matched = String(r.user_id).match(/\d+/);
              return matched ? parseInt(matched[0], 10) : NaN;
            })
            .filter((n) => !isNaN(n));
          if (numericIds.length > 0) {
            nextNum = Math.max(...numericIds) + 1;
          }
        }
        updates = { ...(updates || {}), user_id: String(nextNum).padStart(3, "0") };
      }
      if (!editingRow.created_at) {
        updates = { ...(updates || {}), created_at: new Date().toISOString() };
      }
    } else if (selectedTable.name === "user_activity_logs") {
      if (!editingRow.created_at) {
        updates = { ...(updates || {}), created_at: new Date().toISOString() };
      }
      if (!editingRow.username) {
        updates = { ...(updates || {}), username: getCurrentUserContext().username || 'ADMIN' };
      }
      if (!editingRow.ip_address) {
        updates = { ...(updates || {}), ip_address: 'Local' };
      }
    }

    if (updates) {
      setEditingRow((prev: any) => ({ ...prev, ...updates }));
    }
  }, [selectedTable?.name]);

  if (!editingRow || !selectedTable) return null;

  const renderEditField = (col: string) => {
    const val = editingRow?.[col] ?? "";
    const colType = currentColumns.find((c) => c.name === col)?.type || "text";

    // Dynamic auto-generation for USER_ID in user_master
    if (selectedTable?.name === "user_master" && col === "user_id") {
      return (
        <input
          id="system_generated_serial_input"
          name="system_generated_serial"
          aria-label="System Generated Serial"
          type="text"
          value={val}
          onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value }))}
          className="w-full bg-white border border-slate-300 p-2 text-xs font-black font-mono rounded outline-none focus:border-indigo-500"
          placeholder="System Generated Serial"
        />
      );
    }

    // Dynamic auto-generation for CREATED_AT in user_master
    if (selectedTable?.name === "user_master" && col === "created_at") {
      return (
        <input
          id="creation_timestamp_input"
          name="creation_timestamp"
          aria-label="Creation Timestamp"
          type="text"
          value={val || new Date().toISOString()}
          disabled
          className="w-full bg-slate-100 border border-slate-300 p-2 text-xs font-black font-mono rounded outline-none cursor-not-allowed opacity-80"
          placeholder="Creation Timestamp"
        />
      );
    }

    // Overrides for user_activity_logs
    if (selectedTable?.name === "user_activity_logs") {
      if (col === "log_id") {
        return (
          <input
            id="system_seq_log_id"
            name="system_seq_log_id"
            aria-label="System Sequential Unique Key"
            type="text"
            value={val || "AUTO_GENERATED"}
            disabled
            className="w-full bg-slate-100 border border-slate-300 p-2 text-xs font-black font-mono rounded outline-none cursor-not-allowed opacity-80"
            placeholder="System Sequential Unique Key"
          />
        );
      }
      if (col === "created_at") {
        return (
          <input
            id="event_timestamp_input"
            name="event_timestamp"
            aria-label="Event Timestamp"
            type="text"
            value={val || new Date().toISOString()}
            disabled
            className="w-full bg-slate-100 border border-slate-300 p-2 text-xs font-black font-mono rounded outline-none cursor-not-allowed opacity-80"
            placeholder="Event Timestamp"
          />
        );
      }
      if (col === "username") {
        return (
          <input
            type="text"
            value={val || getCurrentUserContext().username || 'ADMIN'}
            onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value }))}
            className="w-full bg-white border border-slate-300 p-2 text-xs font-mono rounded outline-none focus:border-indigo-500"
          />
        );
      }
      if (col === "ip_address") {
        return (
          <input
            type="text"
            value={val || "Local"}
            onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value }))}
            className="w-full bg-white border border-slate-300 p-2 text-xs font-mono rounded outline-none focus:border-indigo-500"
          />
        );
      }
    }

    if (col === "role") {
      const activeRole = val || "OPERATOR";
      return (
        <select
          id="user_role_select"
          name="user_role"
          aria-label="Role"
          value={activeRole}
          onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value }))}
          className="w-full bg-white border border-slate-300 p-2 text-xs font-bold rounded outline-none cursor-pointer"
        >
          <option value="OPERATOR">OPERATOR</option>
          <option value="USER">USER</option>
          <option value="SUPER USER">SUPER USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      );
    }

    if (col.toLowerCase() === "level") {
      const activeLevel = val || "L1";
      return (
        <select
          id="user_level_select"
          name="user_level"
          aria-label="Level"
          value={activeLevel}
          onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value }))}
          className="w-full bg-white border border-slate-300 p-2 text-xs font-bold rounded outline-none cursor-pointer"
        >
          <option value="L1">L1</option>
          <option value="L2">L2</option>
          <option value="L3">L3</option>
          <option value="L4">L4</option>
          <option value="L5">L5</option>
        </select>
      );
    }

    if (col === "status") {
      return (
        <select
          id="user_status_select"
          name="user_status"
          aria-label="Status"
          value={val || "Active"}
          onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value }))}
          className="w-full bg-white border border-slate-300 p-2 text-xs font-bold rounded outline-none cursor-pointer"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      );
    }

    if (col === "is_active" || col.toLowerCase() === "is_active") {
      const activeVal = String(val).toLowerCase() === "true" || val === "1" || val === 1 || val === "Active" || val === true;
      return (
        <select
          id="user_is_active_select"
          name="user_is_active"
          aria-label="Is Active"
          value={activeVal ? "true" : "false"}
          onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value === "true" }))}
          className="w-full bg-white border border-slate-300 p-2 text-xs font-bold rounded outline-none cursor-pointer"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      );
    }

    if (col === "allowed_modules") {
      const allModulesList = ALL_SYSTEM_MODULES;

      const currentVal = (String(val) || "").trim();
      const isAll = currentVal === "*";
      const selectedList = isAll 
        ? allModulesList.map(m => m.id) 
        : normalizeAllowedModules(currentVal);

      const handleToggle = (id: string) => {
        const canonicalId = getCanonicalModuleId(id);
        let newList: string[];
        if (selectedList.includes(canonicalId)) {
          newList = selectedList.filter(x => x !== canonicalId);
        } else {
          newList = [...selectedList, canonicalId];
        }
        const valToSave = newList.length === allModulesList.length ? "*" : newList.join(",");
        setEditingRow((prev: any) => ({ ...prev, [col]: valToSave }));
      };

      const handleToggleAll = () => {
        if (isAll) {
          setEditingRow((prev: any) => ({ ...prev, [col]: "" }));
        } else {
          setEditingRow((prev: any) => ({ ...prev, [col]: "*" }));
        }
      };

      const handleApplyPreset = (presetModules: string[]) => {
        const normalizedPresets = normalizeAllowedModules(presetModules);
        const valToSave = normalizedPresets.join(",");
        setEditingRow((prev: any) => ({ ...prev, [col]: valToSave }));
      };

      const categories = Array.from(new Set(allModulesList.map(m => m.category)));

      return (
        <div className="border border-slate-300 p-3 rounded-lg bg-slate-50 space-y-3 max-h-[320px] overflow-y-auto w-full text-left font-sans shadow-inner col-span-2">
          {/* Quick Select Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <input
                name="checkbox"
                aria-label="Full access"
                type="checkbox"
                id="module-all"
                checked={isAll}
                onChange={handleToggleAll}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="module-all" className="text-xs font-black text-indigo-900 cursor-pointer uppercase tracking-wider">
                👑 Super Admin (Full Access: *)
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="text-slate-400 uppercase tracking-wider mr-1">Role Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(['dashboard', 'sauda_check_point', 'sauda', 'reports'])}
                className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded border border-amber-300 transition"
              >
                Commercial Officer
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(['dashboard', 'temporary_material_received', 'final_arrival', 'material_inspection'])}
                className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded border border-emerald-300 transition"
              >
                Mill Receiving & QC
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(['dashboard', 'payment', 'mr_settlement', 'reports'])}
                className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded border border-blue-300 transition"
              >
                Accounts & Billing
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(['dashboard', 'stock_summary', 'mill_issue', 'issue_master', 'inventory'])}
                className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded border border-purple-300 transition"
              >
                Godown Keeper
              </button>
            </div>
          </div>

          {/* Module Categories Grid */}
          <div className="space-y-3">
            {categories.map((cat) => {
              const catModules = allModulesList.filter(m => m.category === cat);
              return (
                <div key={cat} className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5 border-b border-slate-100 pb-1">
                    {cat}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {catModules.map((m) => {
                      const canonicalId = getCanonicalModuleId(m.id);
                      const isChecked = isAll || selectedList.includes(canonicalId);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer p-1.5 rounded transition ${
                            isChecked ? 'bg-indigo-50/80 text-indigo-900 border border-indigo-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggle(m.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="truncate" title={m.label}>{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <input
        id={`editor_field_${col}`}
        name={col}
        aria-label={col}
        type={colType === "number" ? "number" : "text"}
        value={val}
        onChange={(e) => setEditingRow((prev: any) => ({ ...prev, [col]: e.target.value }))}
        className="w-full bg-white border border-slate-300 p-2 text-xs font-semibold rounded outline-none focus:border-indigo-500"
        placeholder={`Enter ${col}`}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-400/30 text-indigo-300">
              {isNewRow ? <Sparkles className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                {isNewRow ? "Add New Record" : "Edit Table Record"}
              </h3>
              <p className="text-[11px] text-indigo-200 font-mono">
                Target Table: <span className="font-bold text-amber-300">{selectedTable.name}</span> ({selectedTable.pk})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editorColumns.map((col) => (
              <div key={col} className={col === "allowed_modules" ? "col-span-1 sm:col-span-2" : ""}>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  {col.replace(/_/g, " ")}
                  {col === selectedTable.pk && <span className="text-rose-500 ml-1 font-bold">(Primary Key)</span>}
                </label>
                {renderEditField(col)}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Saving..." : isNewRow ? "Create Record" : "Save Changes"}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
