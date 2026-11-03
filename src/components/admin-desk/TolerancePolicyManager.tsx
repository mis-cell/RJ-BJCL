import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  Save, 
  X, 
  Sliders, 
  Scale, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { 
  TolerancePolicy, 
  getAllTolerancePolicies, 
  saveTolerancePolicy, 
  toggleTolerancePolicyActive, 
  deleteTolerancePolicy,
  DEFAULT_TOLERANCE_POLICY
} from '../../services/tolerancePolicyService';
import { cn } from '../../lib/utils';

export const TolerancePolicyManager: React.FC = () => {
  const [policies, setPolicies] = useState<TolerancePolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingPolicy, setEditingPolicy] = useState<Partial<TolerancePolicy> | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await getAllTolerancePolicies();
      setPolicies(data);
    } catch (err) {
      console.error("Error loading tolerance policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleToggleActive = async (policy: TolerancePolicy) => {
    const nextActive = !policy.is_active;
    if (policy.id) {
      await toggleTolerancePolicyActive(policy.id, nextActive);
      setSaveStatus(`Policy "${policy.policy_name}" set to ${nextActive ? 'ACTIVE' : 'INACTIVE'}`);
      setTimeout(() => setSaveStatus(null), 3000);
      await fetchPolicies();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy?.policy_name) return;

    try {
      await saveTolerancePolicy(editingPolicy);
      setSaveStatus("✓ Policy saved successfully and applied to Sauda Check Point!");
      setTimeout(() => setSaveStatus(null), 3500);
      setEditingPolicy(null);
      setIsNew(false);
      await fetchPolicies();
    } catch (err: any) {
      alert("Failed to save policy: " + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete tolerance policy "${name}"?`)) {
      await deleteTolerancePolicy(id);
      setSaveStatus(`Policy "${name}" deleted.`);
      setTimeout(() => setSaveStatus(null), 3000);
      await fetchPolicies();
    }
  };

  const activePolicy = policies.find(p => p.is_active) || DEFAULT_TOLERANCE_POLICY;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f4f2ed] p-3 space-y-3 overflow-y-auto font-sans">
      
      {/* Top Banner */}
      <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-900 text-white flex items-center justify-center shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase text-indigo-950 tracking-wide flex items-center gap-2">
              <span>Tolerance Policy Master &amp; Live Configuration</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live Active Policy: {activePolicy.tolerance_pct}% or {activePolicy.max_weight_limit_kg} KG
              </span>
            </h2>
            <p className="text-[11px] text-slate-600">
              Configure allowed weight tolerance rules for Sauda Check Point, Temporary Arrivals, and Excess/Short Weight Settlements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingPolicy({
                policy_name: 'Custom Bales Tolerance Policy',
                tolerance_pct: 2.0,
                max_weight_limit_kg: 1000,
                max_weight_limit_mt: 1,
                applicable_unit: 'BALES || LOOSE || DRUMS || P.BALES || H.BALES',
                is_active: true,
                description: 'Allowed tolerance is the lower of 2% or 1,000 KG (15.00 Qtl / 1.000 MT).'
              });
              setIsNew(true);
            }}
            className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Policy</span>
          </button>
          <button
            onClick={fetchPolicies}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Refresh policies"
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

      {/* Editor Modal / Drawer */}
      {editingPolicy && (
        <div className="bg-white border-2 border-indigo-600 rounded-lg p-4 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>{isNew ? 'Create New Tolerance Policy' : 'Edit Tolerance Policy'}</span>
            </h3>
            <button
              onClick={() => { setEditingPolicy(null); setIsNew(false); }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  value={editingPolicy.policy_name || ''}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, policy_name: e.target.value })}
                  placeholder="e.g. Raw Jute 5% / 1500 KG Standard"
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Tolerance Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={editingPolicy.tolerance_pct ?? 5.0}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, tolerance_pct: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold font-mono text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Max Weight Limit (KG)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={editingPolicy.max_weight_limit_kg ?? 1500}
                  onChange={(e) => {
                    const kg = parseFloat(e.target.value) || 0;
                    setEditingPolicy({ 
                      ...editingPolicy, 
                      max_weight_limit_kg: kg,
                      max_weight_limit_mt: kg / 1000
                    });
                  }}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold font-mono text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Max Weight Limit (MT)</label>
                <input
                  type="number"
                  step="0.001"
                  readOnly
                  value={(editingPolicy.max_weight_limit_mt ?? ((editingPolicy.max_weight_limit_kg || 1500) / 1000)).toFixed(3)}
                  className="bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold font-mono text-slate-600 cursor-not-allowed"
                />
                <span className="text-[9px] text-slate-400 mt-0.5">= {((editingPolicy.max_weight_limit_kg || 1500) / 100).toFixed(2)} Quintal</span>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Applicable Unit</label>
                <select
                  value={editingPolicy.applicable_unit || 'BALES'}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, applicable_unit: e.target.value })}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
                >
                  <option value="BALES">BALES (Standard)</option>
                  <option value="DRUMS">DRUMS</option>
                  <option value="HALF BALES">HALF BALES</option>
                  <option value="ALL">ALL UNITS</option>
                </select>
              </div>

              <div className="flex flex-col justify-center">
                <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Policy Status</label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPolicy.is_active ?? true}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {editingPolicy.is_active ? 'Active (Apply to Sauda Check Point)' : 'Inactive'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold uppercase text-slate-600 mb-1">Description / Notes</label>
              <textarea
                rows={2}
                value={editingPolicy.description || ''}
                onChange={(e) => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                placeholder="Policy details, business justification, or government/mill standard reference"
                className="bg-slate-50 border border-slate-300 rounded p-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Quick Presets:</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingPolicy({
                  ...editingPolicy,
                  policy_name: 'Raw Jute 5% / 1500 KG Policy',
                  tolerance_pct: 5.0,
                  max_weight_limit_kg: 1500,
                  max_weight_limit_mt: 1.5,
                  description: 'Lower of 5% of Sauda Quantity or 1,500 KG (15.00 Qtl / 1.500 MT)'
                })}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-indigo-900 cursor-pointer"
              >
                5% or 1500 KG (Standard)
              </button>
              <button
                type="button"
                onClick={() => setEditingPolicy({
                  ...editingPolicy,
                  policy_name: 'Raw Jute 3% / 1500 KG Policy',
                  tolerance_pct: 3.0,
                  max_weight_limit_kg: 1500,
                  max_weight_limit_mt: 1.5,
                  description: 'Lower of 3% of Sauda Quantity or 1,500 KG (15.00 Qtl / 1.500 MT)'
                })}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700 cursor-pointer"
              >
                3% or 1500 KG
              </button>
              <button
                type="button"
                onClick={() => setEditingPolicy({
                  ...editingPolicy,
                  policy_name: 'Raw Jute 2% / 1000 KG Tight Policy',
                  tolerance_pct: 2.0,
                  max_weight_limit_kg: 1000,
                  max_weight_limit_mt: 1.0,
                  description: 'Lower of 2% of Sauda Quantity or 1,000 KG (10.00 Qtl / 1.000 MT)'
                })}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700 cursor-pointer"
              >
                2% or 1000 KG
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => { setEditingPolicy(null); setIsNew(false); }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save &amp; Apply Policy</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policies Grid Table */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
          <span>Configured Tolerance Policies ({policies.length})</span>
          <span className="text-[10px] text-slate-500 font-normal">Active policy governs calculation in Sauda Check Point</span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-[#D94B5A] text-white sticky top-0 text-[10px] uppercase font-extrabold tracking-wider select-none">
              <tr>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Policy Name</th>
                <th className="p-2.5 text-center">Tolerance %</th>
                <th className="p-2.5 text-right">Max Limit (KG)</th>
                <th className="p-2.5 text-right">Max Limit (MT)</th>
                <th className="p-2.5">Unit</th>
                <th className="p-2.5">Rule / Formula</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    <RefreshCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading tolerance policies...</span>
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500 font-medium">
                    No custom policies found. Default policy is active.
                  </td>
                </tr>
              ) : (
                policies.map((p) => {
                  const isActive = p.is_active;
                  return (
                    <tr 
                      key={p.id || p.policy_name} 
                      className={cn(
                        "hover:bg-slate-50 transition-colors",
                        isActive ? "bg-emerald-50/40 font-medium" : "opacity-80"
                      )}
                    >
                      <td className="p-2.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 cursor-pointer transition-all shadow-2xs",
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

                      <td className="p-2.5 font-bold text-slate-900">
                        <div>{p.policy_name}</div>
                        {p.description && (
                          <div className="text-[10px] text-slate-500 font-normal">{p.description}</div>
                        )}
                      </td>

                      <td className="p-2.5 text-center font-mono font-bold text-indigo-900">
                        {p.tolerance_pct}%
                      </td>

                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {Number(p.max_weight_limit_kg).toLocaleString()} KG
                      </td>

                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {Number(p.max_weight_limit_mt).toFixed(3)} MT
                      </td>

                      <td className="p-2.5 font-mono text-slate-700">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-300">
                          {p.applicable_unit || 'BALES'}
                        </span>
                      </td>

                      <td className="p-2.5 font-mono text-[11px] text-indigo-950">
                        Min({p.tolerance_pct}% of Sauda MT, {Number(p.max_weight_limit_mt).toFixed(3)} MT)
                      </td>

                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPolicy(p);
                              setIsNew(false);
                            }}
                            className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                            title="Edit policy"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {p.id && !p.id.startsWith('default-') && (
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id!, p.policy_name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Delete policy"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
