import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  Save, 
  X, 
  Search,
  Layers,
  Database
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dbModule } from '../../services/dbModule';
import { logChange } from '../../services/auditLogService';
import { cn } from '../../lib/utils';

export interface DeductionItem {
  id?: string;
  deduction: string;
  rate_per_qntl?: number | null;
  rate_per_unit?: number | null;
  is_active?: boolean;
  created_at?: string;
}

export const DeductionMasterManager: React.FC = () => {
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingItem, setEditingItem] = useState<Partial<DeductionItem> | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetchDeductions = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('deduction_master')
          .select('*')
          .order('deduction', { ascending: true });

        if (!error && data) {
          setDeductions(data);
          setLoading(false);
          return;
        }
      }
      const local = await dbModule.fetchAll('deduction_master').catch(() => []);
      setDeductions(local || []);
    } catch (err) {
      console.error("Error fetching deduction_master:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeductions();
  }, []);

  const handleToggleActive = async (item: DeductionItem) => {
    const nextActive = item.is_active === false ? true : false;
    try {
      if (supabase && item.id) {
        await supabase
          .from('deduction_master')
          .update({ is_active: nextActive })
          .eq('id', item.id);
      }
      setDeductions(prev => prev.map(d => (d.id === item.id || d.deduction === item.deduction) ? { ...d, is_active: nextActive } : d));
      setSaveStatus(`"${item.deduction}" set to ${nextActive ? 'ACTIVE' : 'INACTIVE'}`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Error toggling deduction active:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.deduction) return;

    const payload: Partial<DeductionItem> = {
      deduction: editingItem.deduction.trim().toUpperCase(),
      rate_per_qntl: editingItem.rate_per_qntl !== undefined && editingItem.rate_per_qntl !== null && editingItem.rate_per_qntl > 0 ? Number(editingItem.rate_per_qntl) : null,
      rate_per_unit: editingItem.rate_per_unit !== undefined && editingItem.rate_per_unit !== null && editingItem.rate_per_unit > 0 ? Number(editingItem.rate_per_unit) : null,
      is_active: editingItem.is_active !== undefined ? editingItem.is_active : true
    };

    try {
      if (supabase) {
        if (editingItem.id) {
          await supabase
            .from('deduction_master')
            .update(payload)
            .eq('id', editingItem.id);
        } else {
          await supabase
            .from('deduction_master')
            .insert(payload);
        }
      } else {
        if (editingItem.id) {
          await dbModule.update('deduction_master', 'id', editingItem.id, payload);
        } else {
          await dbModule.insert('deduction_master', payload);
        }
      }

      await logChange({
        module: 'Admin Desk / Deduction Master',
        entity_name: 'Deduction Master',
        record_id: payload.deduction || 'DEDUCTION',
        action: editingItem.id ? 'UPDATE' : 'CREATE',
        field_name: 'deduction_master',
        field_label: payload.deduction || 'Deduction',
        old_value: 'N/A',
        new_value: `₹${payload.rate_per_qntl || 0}/Qtl, ₹${payload.rate_per_unit || 0}/Unit`,
        user_name: 'Admin',
        remarks: 'Updated deduction master item'
      });

      setSaveStatus("✓ Deduction saved successfully to deduction_master!");
      setTimeout(() => setSaveStatus(null), 3500);
      setEditingItem(null);
      setIsNew(false);
      await fetchDeductions();
    } catch (err: any) {
      alert("Error saving deduction: " + err.message);
    }
  };

  const handleDelete = async (id: string | undefined, name: string) => {
    if (!window.confirm(`Are you sure you want to delete deduction "${name}" from deduction_master?`)) return;
    try {
      if (supabase && id) {
        await supabase.from('deduction_master').delete().eq('id', id);
      } else if (supabase) {
        await supabase.from('deduction_master').delete().eq('deduction', name);
      }
      setSaveStatus(`Deduction "${name}" deleted.`);
      setTimeout(() => setSaveStatus(null), 3000);
      await fetchDeductions();
    } catch (err) {
      console.error("Error deleting deduction:", err);
    }
  };

  const filtered = deductions.filter(d => 
    d.deduction.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f4f2ed] p-3 space-y-3 overflow-y-auto font-sans">
      
      {/* Top Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
              <span>Deduction Master Frontend</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Table: deduction_master ({deductions.length} rules)
              </span>
            </h2>
            <p className="text-[11px] text-slate-600">
              Manage quality claim deductions, defect damage penalties, rate per quintal, and rate per unit for Mill Inspection and Settlements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingItem({
                deduction: '',
                rate_per_qntl: null,
                rate_per_unit: 200,
                is_active: true
              });
              setIsNew(true);
            }}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Deduction</span>
          </button>
          <button
            onClick={fetchDeductions}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Refresh deductions"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Editor Modal */}
      {editingItem && (
        <div className="bg-white border-2 border-emerald-600 rounded-lg p-4 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>{isNew ? 'Add New Deduction Master Item' : 'Edit Deduction Master Item'}</span>
            </h3>
            <button
              onClick={() => { setEditingItem(null); setIsNew(false); }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="flex flex-col md:col-span-2">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Deduction Name / Defect Description</label>
                <input
                  type="text"
                  required
                  value={editingItem.deduction || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, deduction: e.target.value })}
                  placeholder="e.g. GODOWN DAMAGE FOR BALES"
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Rate / Quintal (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional (₹/Qtl)"
                  value={editingItem.rate_per_qntl !== null && editingItem.rate_per_qntl !== undefined ? editingItem.rate_per_qntl : ''}
                  onChange={(e) => setEditingItem({ ...editingItem, rate_per_qntl: e.target.value ? parseFloat(e.target.value) : null })}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold font-mono text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Rate / Unit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional (₹/Unit e.g. Bale)"
                  value={editingItem.rate_per_unit !== null && editingItem.rate_per_unit !== undefined ? editingItem.rate_per_unit : ''}
                  onChange={(e) => setEditingItem({ ...editingItem, rate_per_unit: e.target.value ? parseFloat(e.target.value) : null })}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold font-mono text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.is_active !== false}
                  onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  {editingItem.is_active !== false ? 'Active Deduction Rule' : 'Inactive'}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setEditingItem(null); setIsNew(false); }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Deduction</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <span>Deduction Rules ({filtered.length})</span>
          
          <div className="relative flex items-center bg-white border border-slate-300 rounded px-2 py-0.5 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search deductions..."
              className="bg-transparent border-none outline-none text-slate-800 w-44 font-medium"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-[#D94B5A] text-white sticky top-0 text-[10px] uppercase font-extrabold tracking-wider select-none">
              <tr>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Deduction Description</th>
                <th className="p-2.5 text-right">Rate / Quintal</th>
                <th className="p-2.5 text-right">Rate / Unit</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    <RefreshCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading deduction_master...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">
                    No matching deductions found.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const isActive = item.is_active !== false;
                  return (
                    <tr 
                      key={item.id || item.deduction || idx} 
                      className={cn(
                        "hover:bg-slate-50 transition-colors",
                        isActive ? "" : "opacity-60 bg-slate-50/60"
                      )}
                    >
                      <td className="p-2.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase border flex items-center gap-1 cursor-pointer transition-all shadow-2xs",
                            isActive 
                              ? "bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                          )}
                          title="Click to toggle Active / Inactive"
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>INACTIVE</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-2.5 font-bold text-slate-900 uppercase">
                        {item.deduction}
                      </td>

                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {item.rate_per_qntl !== null && item.rate_per_qntl !== undefined && Number(item.rate_per_qntl) > 0 ? (
                          <span className="text-emerald-700 font-black">₹{Number(item.rate_per_qntl).toFixed(2)} / Qtl</span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {item.rate_per_unit !== null && item.rate_per_unit !== undefined && Number(item.rate_per_unit) > 0 ? (
                          <span className="text-indigo-700 font-black">₹{Number(item.rate_per_unit).toFixed(2)} / Unit</span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsNew(false);
                            }}
                            className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                            title="Edit deduction"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.deduction)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                            title="Delete deduction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
