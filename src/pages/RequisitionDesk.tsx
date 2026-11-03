import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Printer, 
  X, 
  Check, 
  RefreshCw, 
  AlertTriangle,
  Archive,
  Layers,
  FileText,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { cn, canDeleteData } from '../lib/utils';
import { PaginationControls } from '../components/PaginationControls';
import LegacyLayout, { LegacyFieldset } from '../components/LegacyLayout';
import { supabase } from '../lib/supabase';
import { EditableComboBox } from '../components/MaterialIssueEntry';
import PrintModal from '../components/PrintModal';

const GRADES = ["TD5", "TD6", "TD7", "TD8", "TD4", "W5", "W6", "TD5/6", "TD6/7"];
const CROP_YEARS = ["2025-26", "2024-25", "2023-24"];
const STOCK_GROUPS = ["RAW JUTE", "BARDANA", "STORES"];

interface Requisition {
  id?: string;
  requisition_no: string;
  requisition_date: string;
  department: string;
  issued_for: string;
  batch_order: string;
  stock_group: string;
  crop_year?: string;
  grade_name: string;
  marka: string;
  qty_bales: number;
  weight_kgs: number;
  status: 'PENDING' | 'APPROVED' | 'ISSUED' | 'CANCELLED';
  remarks: string;
  created_at?: string;
}

export default function RequisitionDesk({ onClose }: { onClose: () => void }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  
  // 100-rows per page pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, statusFilter]);
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<Requisition>>({
    requisition_no: '',
    requisition_date: new Date().toISOString().split('T')[0],
    department: 'BATCHING',
    issued_for: 'MAIN MILL',
    batch_order: '',
    stock_group: 'RAW JUTE',
    crop_year: '2025-26',
    grade_name: 'TD5',
    marka: 'NO MARK',
    qty_bales: 0,
    weight_kgs: 0,
    status: 'PENDING',
    remarks: ''
  });

  // Masters
  const [departments, setDepartments] = useState<string[]>(['BATCHING', 'PREPARING', 'SPINNING', 'WINDING']);
  const [batchOptions, setBatchOptions] = useState<string[]>([]);
  const [gradeOptions, setGradeOptions] = useState<string[]>(GRADES);
  const [markaOptions, setMarkaOptions] = useState<string[]>(["NO MARK"]);
  const [showToast, setShowToast] = useState<string | null>(null);

  // Print Slip State
  const [printTarget, setPrintTarget] = useState<Requisition | null>(null);

  useEffect(() => {
    fetchRequisitions();
    fetchMasters();
  }, []);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  async function fetchMasters() {
    try {
      if (supabase) {
        // Fetch departments
        const { data: deptData } = await supabase
          .from('department_master')
          .select('dept_name')
          .order('dept_name');
        if (deptData && deptData.length > 0) {
          const names = deptData
            .map(d => typeof d.dept_name === 'string' ? d.dept_name : (d.dept_name?.name || String(d.dept_name || '')))
            .filter(Boolean);
          if (names.length > 0) {
            setDepartments(Array.from(new Set(names)));
          }
        }

        // Fetch batches
        const { data: batchData } = await supabase
          .from('batch_master')
          .select('batch_name')
          .order('batch_name');
        if (batchData && batchData.length > 0) {
          setBatchOptions(Array.from(new Set(batchData.map(b => b.batch_name).filter(Boolean))));
        }

        // Fetch grades
        const { data: gradeData } = await supabase
          .from('grade_master')
          .select('*')
          .limit(200);
        if (gradeData && gradeData.length > 0) {
          const names = gradeData.map((g: any) => g.grade_name || g.name || g.code).filter(Boolean);
          setGradeOptions(Array.from(new Set(names)));
        }

        // Fetch markas
        const { data: markaData } = await supabase
          .from('marka_master')
          .select('*')
          .limit(200);
        if (markaData && markaData.length > 0) {
          const names = markaData.map((m: any) => m.marka_name || m.name || m.marka_code).filter(Boolean);
          setMarkaOptions(Array.from(new Set(names)));
        }
      }
    } catch (e) {
      console.warn("Failed fetching masters:", e);
    }
  }

  async function fetchRequisitions() {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('requisitions')
          .select('*')
          .order('requisition_date', { ascending: false });
        if (data) {
          setRequisitions(data);
        }
      }
    } catch (e) {
      console.error(e);
      triggerToast("Error loading requisitions");
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate Requisition Number
  const generateReqNo = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `REQ-2627-${num}`;
    setFormData(prev => ({ ...prev, requisition_no: code }));
  };

  const handleOpenNew = () => {
    setEditId(null);
    setFormErrors({});
    setFormData({
      requisition_no: `REQ-2627-${Math.floor(1000 + Math.random() * 9000)}`,
      requisition_date: new Date().toISOString().split('T')[0],
      department: departments[0] || 'BATCHING',
      issued_for: 'MAIN MILL',
      batch_order: '',
      stock_group: 'RAW JUTE',
      crop_year: '2025-26',
      grade_name: 'TD5',
      marka: 'NO MARK',
      qty_bales: 0,
      weight_kgs: 0,
      status: 'PENDING',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (req: Requisition) => {
    setEditId(req.id || null);
    setFormErrors({});
    setFormData({ ...req });
    setIsModalOpen(true);
  };

  const handleDelete = async ( id: string) => {
    if (!canDeleteData()) {
      alert("Only Admin can delete data.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this requisition?")) return;
    try {
      if (!supabase) throw new Error("Database client unavailable.");
      const { error } = await supabase.from('requisitions').delete().eq('id', id);
      if (error) throw error;
      setRequisitions(prev => prev.filter(r => r.id !== id));
      triggerToast("Requisition deleted successfully from database");
    } catch (e: any) {
      console.error("Requisition delete failed:", e);
      triggerToast("Failed to delete record: " + (e.message || e));
      alert("Delete failed: " + (e.message || e));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: Record<string, string> = {};
    if (!formData.requisition_no) errors.requisition_no = "Required";
    if (!formData.department) errors.department = "Required";
    if (Number(formData.qty_bales) <= 0) errors.qty_bales = "Must be > 0";
    if (Number(formData.weight_kgs) <= 0) errors.weight_kgs = "Must be > 0";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const payload = {
        requisition_no: formData.requisition_no!,
        requisition_date: formData.requisition_date!,
        department: formData.department!,
        issued_for: formData.issued_for || 'MAIN MILL',
        batch_order: formData.batch_order || '',
        stock_group: formData.stock_group || 'RAW JUTE',
        crop_year: formData.crop_year || '',
        grade_name: formData.grade_name || 'TD5',
        marka: formData.marka || 'NO MARK',
        qty_bales: Number(formData.qty_bales),
        weight_kgs: Number(formData.weight_kgs),
        status: formData.status || 'PENDING',
        remarks: formData.remarks || ''
      };

      if (supabase) {
        if (editId) {
          const { error } = await supabase.from('requisitions').update(payload).eq('id', editId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('requisitions').insert([payload]);
          if (error) throw error;
        }
      }

      await fetchRequisitions();
      setIsModalOpen(false);
      triggerToast(editId ? "Requisition updated successfully" : "New Requisition added successfully");
    } catch (e) {
      console.error(e);
      triggerToast("Error saving requisition. Please check duplicate Req No.");
    }
  };

  // Stats computed values
  const totalReqs = requisitions.length;
  const totalBales = requisitions.reduce((acc, r) => acc + Number(r.qty_bales || 0), 0);
  const totalWeightKgs = requisitions.reduce((acc, r) => acc + Number(r.weight_kgs || 0), 0);

  // Filtered List
  const filteredList = requisitions.filter(req => {
    const matchesSearch = 
      req.requisition_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.batch_order.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.remarks.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = deptFilter === 'ALL' || req.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-6 bg-[#FBCFCB] min-h-screen font-sans space-y-6">
      
      {/* Dynamic Toast Notification */}
      {showToast && (
        <div className="fixed top-5 right-5 z-[9999] bg-slate-900 border-2 border-white text-white px-5 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] font-mono text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{showToast}</span>
        </div>
      )}

      {/* Main retro window wrapper */}
      <div className="bg-[#FBCFCB] border-t-white border-l-white border-b-slate-800 border-r-slate-800 border-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">
        
        {/* Retro Header Strip */}
        <div className="bg-gradient-to-r from-indigo-950 to-indigo-800 text-white px-3 py-1.5 flex justify-between items-center h-10 ">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-300" />
            <span className="text-xs font-black uppercase tracking-widest italic font-display">
              REQUISITION
            </span>
          </div>
          <button 
            onClick={onClose}
            className="bg-[#FBCFCB] hover:bg-slate-300 text-black px-2 border-t-white border-l-white border-b-slate-800 border-r-slate-800 border font-bold text-xs cursor-pointer active:translate-x-[0.5px] active:translate-y-[0.5px] h-6 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Dashboard Stats Panel */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-100 border-b border-slate-300">
          <div className="bg-white border-2 border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Requisitions</p>
              <h3 className="text-2xl font-black text-slate-800">{loading ? '...' : totalReqs}</h3>
            </div>
            <div className="bg-indigo-50 p-2.5 rounded text-indigo-700 font-mono text-[10px] border border-indigo-100 font-black">REQ</div>
          </div>

          <div className="bg-white border-2 border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-sky-600 uppercase">Total Requested Bales</p>
              <h3 className="text-2xl font-black text-sky-700">{loading ? '...' : totalBales} Bales</h3>
            </div>
            <div className="bg-sky-50 p-2.5 rounded text-sky-600 font-mono text-[10px] border border-sky-100 font-black">QUANTITY</div>
          </div>

          <div className="bg-white border-2 border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Requested Weight</p>
              <h3 className="text-2xl font-black text-emerald-700">{loading ? '...' : (totalWeightKgs / 1000).toFixed(3)} M.T</h3>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded text-emerald-600 font-mono text-[10px] border border-emerald-100 font-black">WEIGHT</div>
          </div>
        </div>

        {/* Filters and Control Row */}
        <div className="p-4 bg-slate-50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded px-2 py-1.5 w-[260px] shadow-sm">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input  id="search_req_no_batch_remar_347" name="search_req_no_batch_remar" aria-label="Search Req No, Batch, Remarks..."
                type="text" 
                placeholder="Search Req No, Batch, Remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Dept:</span>
              <select  id="deptfilter_359" name="deptfilter" aria-label="deptfilter"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded text-xs font-bold px-2 py-1.5 outline-none cursor-pointer text-slate-700"
              >
                <option value="ALL">ALL DEPARTMENTS</option>
                {departments.map((d, idx) => {
                  const val = typeof d === 'string' ? d : (d as any)?.name || String(d);
                  return <option key={val + idx} value={val}>{val}</option>;
                })}
              </select>
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setDeptFilter('ALL'); }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Clear Search & Filters"
            >
              <X className="h-3.5 w-3.5 text-red-600" />
              <span>Clear</span>
            </button>
            <button 
              onClick={fetchRequisitions}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              disabled={loading}
              title="Refresh database records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button 
              onClick={handleOpenNew}
              className="bg-indigo-900 hover:bg-indigo-950 text-white rounded px-4 py-1.5 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              <span>NEW REQUISITION</span>
            </button>
          </div>
        </div>

        {/* Data Grid table */}
        <div className="p-4 bg-[#FBCFCB]">
          <div className="bg-white border-2 border-slate-200 overflow-hidden rounded shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b-2 border-slate-200">
                    <th className="py-3 px-2 text-center w-12">Srl</th>
                    <th className="py-3 px-3 text-left w-[130px]">Requisition No</th>
                    <th className="py-3 px-3 text-center w-[110px]">Req Date</th>
                    <th className="py-3 px-3 text-left w-[140px]">Department</th>
                    <th className="py-3 px-3 text-left w-[130px]">Issued For</th>
                    <th className="py-3 px-3 text-left">Batching / Order Reference</th>
                    <th className="py-3 px-2 text-center w-[90px]">Grade</th>
                    <th className="py-3 px-2 text-right w-[90px]">Bales</th>
                    <th className="py-3 px-3 text-right w-[110px]">Weight (Kgs)</th>
                    <th className="py-3 px-3 text-center w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] font-bold text-slate-800 divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-slate-400 italic">Loading requisition master records...</td>
                    </tr>
                  ) : filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-slate-400 italic">No matching requisition found. Click "NEW REQUISITION" to create one.</td>
                    </tr>
                  ) : (
                    filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((req, index) => (
                      <tr key={req.id || index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-2 text-center text-slate-400 font-mono text-[10px]">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="py-3 px-3 text-left text-indigo-900 font-extrabold font-mono select-all">{req.requisition_no}</td>
                        <td className="py-3 px-3 text-center text-slate-600 font-mono">
                          {req.requisition_date ? new Date(req.requisition_date).toLocaleDateString('en-GB') : '--'}
                        </td>
                        <td className="py-3 px-3 text-left uppercase">{req.department}</td>
                        <td className="py-3 px-3 text-left uppercase text-slate-500 font-black text-[10px]">{req.issued_for}</td>
                        <td className="py-3 px-3 text-left text-slate-700 italic max-w-[200px] truncate">{req.batch_order || 'N/A'}</td>
                        <td className="py-3 px-2 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-[10px]">{req.grade_name}</span></td>
                        <td className="py-3 px-2 text-right font-mono font-black text-slate-900">{req.qty_bales}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-indigo-950">{(Number(req.weight_kgs) || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleOpenEdit(req)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-950 cursor-pointer"
                              title="Edit Requisition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => setPrintTarget(req)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700 cursor-pointer"
                              title="Print Slip"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => req.id && handleDelete(req.id)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete Requisition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2 p-2 bg-white">
              <PaginationControls
                currentPage={currentPage}
                totalItems={filteredList.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </div>

      </div>

      {/* -------------------- NEW/EDIT REQUISITION DIALOG MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#FBCFCB] border-t-white border-l-white border-b-slate-800 border-r-slate-800 border-2 shadow-[4px_4px_16px_rgba(0,0,0,0.3)]">
            
            {/* Modal Title Bar */}
            <div className="bg-gradient-to-r from-indigo-950 to-indigo-800 text-white px-3 py-1 flex justify-between items-center h-8 ">
              <span className="text-[10px] font-black uppercase tracking-widest italic font-mono">
                {editId ? 'UPDATE REQUISITION DETAILS' : 'RECORD NEW REQUISITION'}
              </span>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-[#FBCFCB] hover:bg-slate-300 text-black px-1.5 border border-black/20 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Req Number */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Requisition No</label>
                    <button 
                      type="button" 
                      onClick={generateReqNo}
                      className="text-[9px] font-black text-indigo-700 underline hover:text-indigo-950 cursor-pointer"
                    >
                      Generate New
                    </button>
                  </div>
                  <input  id="formdata_requisition_no_514" name="formdata_requisition_no" aria-label="formdata requisition no"
                    type="text" 
                    value={formData.requisition_no || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, requisition_no: e.target.value.toUpperCase() }))}
                    className={cn(
                      "border px-2.5 py-1.5 rounded font-black font-mono outline-none text-[13px] uppercase",
                      formErrors.requisition_no ? "border-rose-500 bg-rose-50 text-rose-900" : "border-slate-300 text-indigo-950"
                    )}
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="requisition_date_528" className="text-[10px] font-black text-slate-500 uppercase">Requisition Date</label>
                  <input  id="requisition_date_528" name="requisition_date" aria-label="Requisition Date"
                    type="date" 
                    value={formData.requisition_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, requisition_date: e.target.value }))}
                    className="border border-slate-300 px-2.5 py-1.5 rounded font-bold text-slate-700 outline-none text-[13px]"
                  />
                </div>

                {/* Department */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="department_name_539" className="text-[10px] font-black text-slate-500 uppercase">Department Name</label>
                  <select  id="department_name_539" name="department_name" aria-label="Department Name"
                    value={formData.department || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="border border-slate-300 px-2.5 py-1.5 rounded font-bold text-slate-700 outline-none text-[13px] cursor-pointer bg-white"
                  >
                    {departments.map((d, idx) => {
                      const val = typeof d === 'string' ? d : (d as any)?.name || String(d);
                      return <option key={val + idx} value={val}>{val}</option>;
                    })}
                  </select>
                </div>

                {/* Issued For */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Issued For</label>
                  <EditableComboBox
                    value={formData.issued_for || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, issued_for: val }))}
                    options={["MAIN MILL"]}
                    placeholder="Select or enter Issued For"
                  />
                </div>

                {/* Batch Order */}
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Batching / Order Reference</label>
                  <EditableComboBox
                    value={formData.batch_order || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, batch_order: val }))}
                    options={batchOptions}
                    placeholder="Select or enter batching order"
                  />
                </div>

                {/* Stock Group */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="stock_group_575" className="text-[10px] font-black text-slate-500 uppercase">Stock Group</label>
                  <select  id="stock_group_575" name="stock_group" aria-label="Stock Group"
                    value={formData.stock_group || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock_group: e.target.value }))}
                    className="border border-slate-300 px-2.5 py-1.5 rounded font-bold text-slate-700 outline-none text-[13px] cursor-pointer bg-white"
                  >
                    {STOCK_GROUPS.map(sg => (
                      <option key={sg} value={sg}>{sg}</option>
                    ))}
                  </select>
                </div>

                {/* Grade Name (Multi-select) */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Select Grade(s) [Multiple Selection Allowed]</label>
                    <span className="text-[10px] text-indigo-600 font-bold">Click tags to toggle multiple grades</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {GRADES.map(g => {
                      const currentGrades = (formData.grade_name || '').split(',').map(s => s.trim()).filter(Boolean);
                      const isSelected = currentGrades.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            let updated: string[];
                            if (isSelected) {
                              updated = currentGrades.filter(x => x !== g);
                            } else {
                              updated = [...currentGrades, g];
                            }
                            setFormData(prev => ({ ...prev, grade_name: updated.join(', ') }));
                          }}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-black rounded border transition-all cursor-pointer",
                            isSelected
                              ? "bg-indigo-700 text-white border-indigo-800 shadow-xs"
                              : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                          )}
                        >
                          {isSelected ? `✓ ${g}` : `+ ${g}`}
                        </button>
                      );
                    })}
                  </div>
                  <EditableComboBox
                    value={formData.grade_name || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, grade_name: val }))}
                    options={gradeOptions}
                    placeholder="Selected Grades (comma separated or select above)"
                  />
                </div>

                {/* Marka */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Marka / Brand Code</label>
                  <EditableComboBox
                    value={formData.marka || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, marka: val }))}
                    options={markaOptions}
                    placeholder="Select or enter Marka"
                  />
                </div>

                {/* Qty Bales */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="quantity_in_bales_643" className="text-[10px] font-black text-slate-500 uppercase">Quantity in Bales</label>
                  <input  id="quantity_in_bales_643" name="quantity_in_bales" aria-label="Quantity in Bales"
                    type="number" 
                    value={formData.qty_bales || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, qty_bales: Number(e.target.value) }))}
                    className={cn(
                      "border px-2.5 py-1.5 rounded font-bold outline-none text-[13px] text-right font-mono",
                      formErrors.qty_bales ? "border-rose-500 bg-rose-50 text-rose-900" : "border-slate-300 text-slate-800"
                    )}
                  />
                </div>

                {/* Weight Kgs (Multi-Weight selector & input) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Weight (Kgs)</label>
                  <div className="flex gap-1 mb-1 overflow-x-auto">
                    {[150, 180, 500, 1000, 2000, 5000].map(wt => (
                      <button
                        key={wt}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, weight_kgs: (prev.weight_kgs || 0) + wt }))}
                        className="px-1.5 py-0.5 text-[9.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded cursor-pointer whitespace-nowrap"
                        title={`Add +${wt} kg`}
                      >
                        +{wt}kg
                      </button>
                    ))}
                  </div>
                  <input  id="formdata_weight_kgs_0_670" name="formdata_weight_kgs_0" aria-label="formdata weight kgs 0"
                    type="number" 
                    value={formData.weight_kgs || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight_kgs: Number(e.target.value) }))}
                    className={cn(
                      "border px-2.5 py-1.5 rounded font-bold outline-none text-[13px] text-right font-mono",
                      formErrors.weight_kgs ? "border-rose-500 bg-rose-50 text-rose-900" : "border-slate-300 text-slate-800"
                    )}
                  />
                </div>

                {/* Remarks */}
                <div className="flex flex-col gap-1 col-span-2">
                  <label htmlFor="remarks_specific_blend_in_684" className="text-[10px] font-black text-slate-500 uppercase">Remarks / Specific Blend Instructions</label>
                  <textarea  id="remarks_specific_blend_in_684" name="remarks_specific_blend_in" aria-label="Remarks / Specific Blend Instructions"
                    value={formData.remarks || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Provide any blending percentage or priority storage feed notes"
                    className="border border-slate-300 px-2.5 py-1.5 rounded font-medium text-slate-700 outline-none text-[13px] min-h-[45px]"
                  />
                </div>

              </div>

              {/* Action Buttons footer */}
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer active:translate-y-0.5"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-black text-xs cursor-pointer shadow-md active:translate-y-0.5"
                >
                  SAVE RECORD
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* -------------------- DUAL RETRO PRINT SLIP MODAL -------------------- */}
      {printTarget && (
        <PrintModal isOpen={true} onClose={() => setPrintTarget(null)} title="Print Requisition Slip">
          <div className="bg-[#fffdf4] p-8 max-w-[800px] mx-auto text-black font-mono border-2 border-slate-800 shadow-lg relative print-full-sheet print-preview-body">
            
            {/* Retro Sprocket holes representing actual matrix printers of Bally Jute Mill */}
            <div className="absolute top-0 bottom-0 left-2 flex flex-col justify-between py-4 pointer-events-none no-print">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full border border-slate-300 bg-slate-100 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"></div>
              ))}
            </div>
            <div className="absolute top-0 bottom-0 right-2 flex flex-col justify-between py-4 pointer-events-none no-print">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full border border-slate-300 bg-slate-100 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"></div>
              ))}
            </div>

            <div className="px-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black tracking-widest text-slate-900 uppercase">BALLY JUTE COMPANY LIMITED</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">5, SREE CHARAN SARANI, HOWRAH - 711201, WEST BENGAL</p>
                <p className="text-[12px] font-black border-y-2 border-dashed border-slate-800 py-1 uppercase tracking-[0.2em] my-3">
                  MATERIAL REQUISITION SLIP
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs my-6 border-b border-dashed border-slate-400 pb-4">
                <div className="space-y-1.5">
                  <p><span className="font-bold text-slate-500">REQ NO:</span> <span className="font-black font-mono">{printTarget.requisition_no}</span></p>
                  <p><span className="font-bold text-slate-500">REQ DATE:</span> <span className="font-black">{new Date(printTarget.requisition_date).toLocaleDateString('en-GB')}</span></p>
                  <p><span className="font-bold text-slate-500">DEPARTMENT:</span> <span className="font-black uppercase">{printTarget.department}</span></p>
                </div>
                <div className="space-y-1.5 text-right">
                  <p><span className="font-bold text-slate-500">ISSUED FOR:</span> <span className="font-black uppercase">{printTarget.issued_for}</span></p>
                  <p><span className="font-bold text-slate-500">STOCK GROUP:</span> <span className="font-black uppercase">{printTarget.stock_group}</span></p>
                </div>
              </div>

              {/* Grid content item row */}
              <div className="border border-slate-800 rounded overflow-hidden">
                <div className="grid grid-cols-6 bg-slate-100 text-[10px] font-black uppercase text-slate-700 py-1.5 border-b border-slate-800 text-center">
                  <span>Crop Year</span>
                  <span>Grade / Quality</span>
                  <span>Marka</span>
                  <span>Batch Reference</span>
                  <span className="text-right pr-4">Qty (Bales)</span>
                  <span className="text-right pr-4">Weight (Kgs)</span>
                </div>
                <div className="grid grid-cols-6 text-xs text-center py-4 font-black">
                  <span>{printTarget.crop_year}</span>
                  <span>{printTarget.grade_name}</span>
                  <span className="uppercase">{printTarget.marka}</span>
                  <span className="uppercase text-[10px] truncate px-1">{printTarget.batch_order || 'N/A'}</span>
                  <span className="text-right pr-4 font-mono">{printTarget.qty_bales} Bales</span>
                  <span className="text-right pr-4 font-mono">{(Number(printTarget.weight_kgs) || 0).toLocaleString()} Kgs</span>
                </div>
              </div>

              {/* Remarks */}
              <div className="my-6 text-xs">
                <p className="font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">Remarks / Special Instructions:</p>
                <p className="font-medium text-slate-800 leading-relaxed italic">
                  {printTarget.remarks || 'No special blending instructions recorded. Dispatch matching grades of Jute Bales directly to specified batching floor.'}
                </p>
              </div>

              {/* Signature section */}
              <div className="grid grid-cols-3 gap-6 text-[10px] font-black uppercase text-slate-600 pt-16 text-center">
                <div className="border-t border-slate-400 pt-1.5">Requisitioned By (Dept)</div>
                <div className="border-t border-slate-400 pt-1.5">Store In-Charge (Godown)</div>
                <div className="border-t border-slate-400 pt-1.5">Authorized Signature</div>
              </div>

            </div>
          </div>
        </PrintModal>
      )}

    </div>
  );
}
