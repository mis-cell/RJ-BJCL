import React, { useState, useEffect, useRef } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { ArrowLeft, FileText, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Sauda } from '../types';
import { dbModule, notifyDataChanged } from '../services/dbModule';
import { supabase } from '../lib/supabase';
import { enforceEditOrDeletePermission, getCurrentUserContext, isUserId10, isUserAdmin, isSaudaApproved } from '../lib/permissions';
import { resolveDisplayName } from '../lib/userResolver';
import { logChange } from '../services/auditLogService';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import {
  resolveSattaRate,
  fetchSattaBaseRates,
  getCachedBaseRateApprovalState,
  getBaseRateApprovalState,
  BASE_RATE_APPROVAL_REQUIRED_MSG,
  BaseRateApprovalState,
} from '../services/sattaRateService';
import { cleanSaudaNo } from '../lib/utils';
import { screenDraftService } from '../services/screenDraftService';
import { getAgenciesForArea, validateAreaAgencyCombination } from '../services/areaLogicService';
import { MASTER_MARKAS } from '../data/masterData';

import LegacyLayout from '../components/LegacyLayout';
import BasicDetailsCard from '../components/BasicDetailsCard';
import TransportationCard from '../components/TransportationCard';
import QualityDetailsTable from '../components/QualityDetailsTable';
import ShipmentClaimsCard from '../components/ShipmentClaimsCard';
import RemarksCard from '../components/RemarksCard';
import FooterActions from '../components/FooterActions';
import SaudaPrintSlip from '../components/SaudaPrintSlip';

const UNIT_OPTIONS = ["BALES", "DRUMS", "LOOSE", "P.BALES", "H.BALES"];

import { compareQualities } from '../utils/qualityUtils';

export default function SaudaEntry({ 
  initialData, 
  onSave, 
  onCancel,
  onNavigate
}: { 
  initialData?: any; 
  onSave?: (d: any) => void; 
  onCancel?: () => void;
  onNavigate?: (page: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showPrintSlip, setShowPrintSlip] = useState(false);
  const [isSattaChartUploaded, setIsSattaChartUploaded] = useState<boolean>(true);

  const [brokers, setBrokers] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [markas, setMarkas] = useState<any[]>([]);
  const [baseRatesList, setBaseRatesList] = useState<any[]>([]);
  const [dbDiffsList, setDbDiffsList] = useState<any[]>([]);
  const [baseRateApprovalState, setBaseRateApprovalState] = useState<BaseRateApprovalState>(
    getCachedBaseRateApprovalState()
  );

  // User 010 Detection logic
  const userCtx = getCurrentUserContext();
  const uid = String(userCtx?.userId || (userCtx as any)?.user_id || '').trim().toLowerCase();
  const uname = String(userCtx?.username || userCtx?.userName || '').trim().toLowerCase();
  
  let sessionUid = '';
  let sessionUname = '';
  try {
    const rawSess = typeof window !== 'undefined' ? localStorage.getItem('bally_auth_session') : null;
    if (rawSess) {
      const parsed = JSON.parse(rawSess);
      sessionUid = String(parsed?.userId || parsed?.user_id || '').trim().toLowerCase();
      sessionUname = String(parsed?.username || '').trim().toLowerCase();
    }
  } catch {}

  const detectedIs010 = isUserId10(userCtx);
  const activeUsername = resolveDisplayName(userCtx.userName || userCtx.username || userCtx.userId, 'Rahul');

  const [forceUser010, setForceUser010] = useState<boolean | null>(null);
  const isUser010 = forceUser010 !== null ? forceUser010 : detectedIs010;

  // Maker-Checker-Approver Workflow Policy:
  // User ID 002 (Maker) creates/edits drafts, submits for approval, and corrects rejected entries.
  // User ID 010 (Checker) reviews and approves or rejects with mandatory remarks.
  // CRITICAL RULE: Once approved by User 010, the entry is PERMANENTLY LOCKED for ALL users (including Admin).
  const isContractApproved = isSaudaApproved(initialData);
  const rawStatus = String(initialData?.status || '').toUpperCase();
  const rawApprovalStatus = String(initialData?.approval_status || '').toUpperCase();
  const isRejectedContract = !isContractApproved && (
    rawStatus === 'REJECTED' ||
    rawApprovalStatus === 'REJECTED' ||
    (Boolean(initialData?.rejected_by) && rawStatus !== 'PENDING' && rawApprovalStatus !== 'PENDING')
  );
  const isDraftContract = !isContractApproved && !isRejectedContract && (
    rawStatus === 'DRAFT' || rawApprovalStatus === 'DRAFT'
  );
  const isPendingApproval = Boolean(
    initialData &&
    !isContractApproved &&
    !isRejectedContract &&
    !isDraftContract &&
    (rawStatus === 'PENDING' || rawApprovalStatus === 'PENDING')
  );

  // Read-only conditions:
  // 1. Approved = permanently locked for all users
  // 2. Pending Approval = read-only for User 002 / maker while awaiting User 010 review
  // 3. Rejected or Draft = editable by User 002 so Maker can correct & resubmit
  // 4. User 010 review = User 010 cannot directly edit input fields; can only Approve/Reject in dashboard
  const isLockedForCurrentUser = Boolean(isContractApproved || isPendingApproval || (isUser010 && initialData));

  const today = new Date().toISOString().split('T')[0];

  const hasValidInitialData = initialData && Object.keys(initialData).length > 0 && (initialData.sauda_id || initialData.sauda_no);

  const getInitialFormData = (): Sauda => {
    if (hasValidInitialData) {
      const copy = { ...initialData };
      copy.broker = (copy.broker || '').toUpperCase();
      copy.supplier = (copy.supplier || '').toUpperCase();
      copy.challan_supplier = (copy.challan_supplier || '').toUpperCase();
      copy.area = (copy.area || '').toUpperCase();

      if (copy.session) {
        copy.session = String(copy.session).replace(/^BJCL\//i, '').replace(/\/.*$/, '').trim() || '2026-2027';
      } else {
        copy.session = '2026-2027';
      }

      if (copy.sauda_no) {
        copy.sauda_no = cleanSaudaNo(copy.sauda_no, copy.session);
      }
      
      const realQD = (copy.quality_details || [])
        .filter((item: any) => item.quality || item.qty || item.agency || item.marka || item.rs || (item.agencies && item.agencies.length > 0));

      if (copy.units_per_lorry === undefined && copy.units_per_lorry_type && !isNaN(Number(copy.units_per_lorry_type))) {
        copy.units_per_lorry = Number(copy.units_per_lorry_type);
      }

      if (realQD.length < 1) {
        copy.quality_details = [{ quality: '', qty: 0, agency: '', marka: '', rs: 0, agencies: [], markas: [], applicableCombinations: [] }];
      } else {
        copy.quality_details = realQD.map((r: any) => ({
          quality: r.quality || '',
          rs: r.rs !== undefined ? Number(r.rs) : (r.rate || 0),
          qty: Number(r.qty) || 0,
          agency: r.agency || '',
          marka: r.marka || '',
          agencies: Array.isArray(r.agencies) && r.agencies.length > 0 ? r.agencies : (r.agency ? [r.agency] : []),
          markas: Array.isArray(r.markas) && r.markas.length > 0 ? r.markas : (r.marka ? [r.marka] : []),
          applicableCombinations: Array.isArray(r.applicableCombinations) ? r.applicableCombinations : []
        }));
      }
      return copy;
    }

    return {
      sauda_no: 'BJCL/2026-2027/0153',
      financial_year: '2026-2027',
      session: '2026-2027',
      po_type: 'Normal',
      date: today,
      broker: '',
      supplier: '',
      challan_supplier: '',
      area: '',
      agency: '',
      marks: '',
      no_of_lorries: 1,
      units_per_lorry: 0,
      units_per_lorry_type: 'BALES',
      total_unit: 0,
      wt_per_lorry: 0,
      unit_type: 'BALES',
      total_wt_in_ton: 0,
      shipment_date: today,
      shipment_days: 0,
      shipment_penalty: 0,
      marks_claim: 0,
      quantity_claim: 0,
      remarks: 'Area, Agency Grade, Grade differential can change as per market.',
      b_rate: 0,
      b_date: today,
      superior_normal_marks: 'New (F2)',
      status: 'pending',
      quality_details: [{ quality: '', qty: 0, agency: '', marka: '', rs: 0, agencies: [], markas: [], applicableCombinations: [] }]
    };
  };

  const [formData, setFormData] = useState<Sauda>(() => {
    if (!hasValidInitialData) {
      screenDraftService.clearDraft('sauda_entry_form');
    }
    return getInitialFormData();
  });

  useEffect(() => {
    if (!hasValidInitialData) {
      screenDraftService.clearDraft('sauda_entry_form');
    }
    setFormData(getInitialFormData());
  }, [initialData]);

  useEffect(() => {
    if (!initialData && formData) {
      screenDraftService.saveDraft('sauda_entry_form', formData);
    }
  }, [formData, initialData]);

  const formContainerRef = useRef<HTMLDivElement>(null);
  useKeyboardNavigation(formContainerRef);

  async function loadMasterData() {
    try {
        const [brokData, suppData, areaData, agcData, gradeData, markaData, allSaudas, sattaBaseRates, sattaDiffs] = await Promise.all([
          dbModule.fetchAll('broker_master'),
          dbModule.fetchAll('supply_master'),
          dbModule.fetchAll('area_master'),
          dbModule.fetchAll('agency_master'),
          dbModule.fetchAll('grade_master'),
          dbModule.fetchAll('marka_master').catch(() => []),
          dbModule.fetchAll('sauda_master').catch(() => []),
          fetchSattaBaseRates().catch(() => []),
          supabase ? supabase.from('satta_differentials').select('*').then(r => r.data || []) : Promise.resolve([])
        ]);

        setBaseRateApprovalState(getCachedBaseRateApprovalState());

        if (brokData) setBrokers(brokData.map((b: any) => b.brok_name || b.name || '').filter(Boolean));
        if (suppData) setSuppliers(suppData.map((s: any) => s.supp_name || s.name || '').filter(Boolean));
        if (areaData) setAreas(areaData.map((a: any) => a.area_name || a.name || '').filter(Boolean));
        if (agcData) setAgencies(agcData);
        if (gradeData) setGrades(gradeData);
        const combinedMarkaStrings = Array.from(new Set([
          ...MASTER_MARKAS,
          ...(markaData || []).map((m: any) => typeof m === 'string' ? m : (m.marka_name || m.name || m.code || '')).filter(Boolean)
        ])).sort((a, b) => a.localeCompare(b));
        setMarkas(combinedMarkaStrings.map(m => ({ marka_name: m, name: m })));
        const hasSattaRates = (sattaBaseRates && sattaBaseRates.length > 0) || (sattaDiffs && sattaDiffs.length > 0);
        const hasLocalStorageUpload = typeof window !== 'undefined' && localStorage.getItem('satta_chart_uploaded') === 'true';
        setIsSattaChartUploaded(Boolean(hasSattaRates || hasLocalStorageUpload));

        if (sattaBaseRates && sattaBaseRates.length > 0) {
          setBaseRatesList(sattaBaseRates);
          const sorted = [...sattaBaseRates].sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''));
          const targetDt = formData.b_date || formData.date || today;
          const eff = sorted.find((r: any) => r.start_date <= targetDt) || sorted[sorted.length - 1];
          if (eff && eff.base_rate) {
            const activeBase = Number(eff.base_rate);
            setFormData(prev => ({
              ...prev,
              b_rate: prev.b_rate && prev.b_rate > 0 ? prev.b_rate : activeBase
            }));
          }
        }
        if (sattaDiffs) setDbDiffsList(sattaDiffs);

        // Auto-generate next Order No. if creating new Sauda
        if (!initialData && allSaudas && allSaudas.length > 0) {
          const numbers = allSaudas.map((s: any) => {
            const str = String(s.sauda_no || '');
            const match = str.match(/\d+$/);
            const val = match ? parseInt(match[0], 10) : parseInt(str, 10);
            return isNaN(val) ? 0 : val;
          });
          const maxNo = Math.max(...numbers, 152);
          const nextNoStr = String(maxNo + 1).padStart(4, '0');
          const currentSession = formData.session || '2026-2027';
          setFormData(prev => ({
            ...prev,
            sauda_no: `BJCL/${currentSession}/${nextNoStr}`,
            session: currentSession
          }));
        }
      } catch (err) {
        console.error("Error loading master data:", err);
      }
  }

  useEffect(() => {
    loadMasterData();
  }, [initialData]);

  useLiveAutoRefresh(loadMasterData, [initialData], { tables: ['sauda_master', 'broker_master', 'supply_master', 'area_master', 'agency_master', 'grade_master', 'marka_master', 'satta_base_rates', 'satta_differentials'] });

  // Recalculate Satta rate for a quality row based on Date, Area, Grade
  const recalculateRowRate = (date: string, area: string, grade: string) => {
    if (!date || !area || !grade) return null;
    const res = resolveSattaRate({
      area,
      grade,
      date,
      baseRates: baseRatesList,
      differentials: dbDiffsList
    });
    return res.found ? res.finalRate : null;
  };

  const getUnitWeightKg = (unitType?: string): number | null => {
    const clean = String(unitType || '').trim().toUpperCase().replace(/[\s_.-]/g, '');
    if (clean.includes('DRUM') || clean === 'DR') {
      return 50; // 50 KG per unit for Drums
    }
    if (clean === 'BALES' || clean === 'BALE' || clean === 'BAL' || clean === 'BELL' || clean === 'BELLS' || clean === 'BEL') {
      return 147.5; // 147.5 KG per unit for standard Bales / Bell
    }
    // LOOSE, P.BALES, H.BALES, etc. are blank manual inputs
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;

    setFormData(prev => {
      const updated = { ...prev, [name]: finalValue };

      // Calculate Shipment Days & Date automatically
      if (name === 'shipment_date' || name === 'date') {
        const contractDt = name === 'date' ? new Date(value) : new Date(prev.date || today);
        const shipmentDt = name === 'shipment_date' ? new Date(value) : new Date(prev.shipment_date || today);
        if (!isNaN(contractDt.getTime()) && !isNaN(shipmentDt.getTime())) {
          const diffDays = Math.max(0, Math.ceil((shipmentDt.getTime() - contractDt.getTime()) / (1000 * 3600 * 24)));
          updated.shipment_days = diffDays;
        }
      }

      if (name === 'shipment_days') {
        const days = parseInt(value, 10) || 0;
        const contractDt = new Date(prev.date || today);
        if (!isNaN(contractDt.getTime())) {
          contractDt.setDate(contractDt.getDate() + days);
          updated.shipment_date = contractDt.toISOString().split('T')[0];
        }
      }

      const activeUnitType = name === 'unit_type' ? finalValue : (prev.unit_type || 'BALES');
      const unitWeightKg = getUnitWeightKg(activeUnitType);
      const lorries = Math.max(1, parseFloat(name === 'no_of_lorries' ? value : (prev.no_of_lorries as any)) || 1);

      // 1. When user enters Total Wt. in Ton:
      if (name === 'total_wt_in_ton') {
        const totalWt = parseFloat(value) || 0;
        updated.total_wt_in_ton = totalWt;
        const wtPerLorry = parseFloat((totalWt / lorries).toFixed(3));
        updated.wt_per_lorry = wtPerLorry;

        if (unitWeightKg && unitWeightKg > 0) {
          // BALE (147.5 kg) or DRUM (50 kg) auto conversion
          if (totalWt > 0) {
            const totalWeightKg = totalWt * 1000;
            const totalUnits = totalWeightKg / unitWeightKg;
            const unitsPerLorry = parseFloat((totalUnits / lorries).toFixed(2));
            
            updated.units_per_lorry = unitsPerLorry;
            updated.units_per_lorry_type = String(unitsPerLorry);
            updated.total_unit = Math.round(totalUnits);
          } else {
            updated.units_per_lorry = '';
            updated.units_per_lorry_type = '';
            updated.total_unit = '';
          }
        } else {
          // LOOSE, P.BALES, H.BALES: Leave Units/Lorry blank/manual
          const existingManualUnits = parseFloat(prev.units_per_lorry as any);
          if (existingManualUnits > 0) {
            updated.total_unit = Math.round(existingManualUnits * lorries);
          } else {
            updated.units_per_lorry = '';
            updated.units_per_lorry_type = '';
            updated.total_unit = '';
          }
        }
      }

      // 2. When user enters Units/Lorry:
      if (name === 'units_per_lorry') {
        const units = parseFloat(value) || 0;
        updated.units_per_lorry = value === '' ? '' : value;
        updated.units_per_lorry_type = String(value);

        if (units > 0) {
          const totalUnits = Math.round(units * lorries);
          updated.total_unit = totalUnits;

          if (unitWeightKg && unitWeightKg > 0) {
            const wtPerLorry = parseFloat(((units * unitWeightKg) / 1000).toFixed(3));
            const totalWt = parseFloat((wtPerLorry * lorries).toFixed(3));
            updated.wt_per_lorry = wtPerLorry;
            updated.total_wt_in_ton = totalWt;
          }
        } else {
          updated.total_unit = '';
          if (unitWeightKg && unitWeightKg > 0) {
            updated.wt_per_lorry = 0;
            updated.total_wt_in_ton = 0;
          }
        }
      }

      // 3. When user enters Total Unit:
      if (name === 'total_unit') {
        const tUnits = parseFloat(value) || 0;
        updated.total_unit = value === '' ? '' : value;

        if (tUnits > 0) {
          const uPerLorry = parseFloat((tUnits / lorries).toFixed(2));
          updated.units_per_lorry = uPerLorry;
          updated.units_per_lorry_type = String(uPerLorry);

          if (unitWeightKg && unitWeightKg > 0) {
            const totalWt = parseFloat(((tUnits * unitWeightKg) / 1000).toFixed(3));
            updated.total_wt_in_ton = totalWt;
            updated.wt_per_lorry = parseFloat((totalWt / lorries).toFixed(3));
          }
        } else {
          updated.units_per_lorry = '';
          updated.units_per_lorry_type = '';
        }
      }

      // 4. When No. of Lorries changes:
      if (name === 'no_of_lorries') {
        const lCount = Math.max(1, parseFloat(value) || 1);
        const currentUnitsPerLorry = parseFloat(prev.units_per_lorry as any) || 0;
        const currentTotalWt = parseFloat(prev.total_wt_in_ton as any) || 0;

        if (currentTotalWt > 0) {
          updated.wt_per_lorry = parseFloat((currentTotalWt / lCount).toFixed(3));
        }

        if (unitWeightKg && unitWeightKg > 0) {
          if (currentUnitsPerLorry > 0) {
            const wtPerLorry = parseFloat(((currentUnitsPerLorry * unitWeightKg) / 1000).toFixed(3));
            updated.wt_per_lorry = wtPerLorry;
            updated.total_unit = Math.round(currentUnitsPerLorry * lCount);
            updated.total_wt_in_ton = parseFloat((wtPerLorry * lCount).toFixed(3));
          } else if (currentTotalWt > 0) {
            const totalWeightKg = currentTotalWt * 1000;
            const totalUnits = totalWeightKg / unitWeightKg;
            updated.units_per_lorry = parseFloat((totalUnits / lCount).toFixed(2));
            updated.units_per_lorry_type = String(updated.units_per_lorry);
            updated.total_unit = Math.round(totalUnits);
          }
        } else {
          // Manual unit types
          if (currentUnitsPerLorry > 0) {
            updated.total_unit = Math.round(currentUnitsPerLorry * lCount);
          }
        }
      }

      // 5. When Unit Type changes (e.g., BALES, DRUMS, LOOSE, P.BALES, H.BALES):
      if (name === 'unit_type') {
        const newUnitWeightKg = getUnitWeightKg(finalValue);
        const currentTotalWt = parseFloat(prev.total_wt_in_ton as any) || 0;

        if (newUnitWeightKg && newUnitWeightKg > 0) {
          if (currentTotalWt > 0) {
            const totalWeightKg = currentTotalWt * 1000;
            const totalUnits = totalWeightKg / newUnitWeightKg;
            const unitsPerLorry = parseFloat((totalUnits / lorries).toFixed(2));
            updated.units_per_lorry = unitsPerLorry;
            updated.units_per_lorry_type = String(unitsPerLorry);
            updated.total_unit = Math.round(totalUnits);
            updated.wt_per_lorry = parseFloat((currentTotalWt / lorries).toFixed(3));
          }
        } else {
          // Switching to LOOSE, P.BALES, H.BALES -> clear auto-calculated units to blank
          updated.units_per_lorry = '';
          updated.units_per_lorry_type = '';
          updated.total_unit = '';
          if (currentTotalWt > 0) {
            updated.wt_per_lorry = parseFloat((currentTotalWt / lorries).toFixed(3));
          }
        }
      }

      // 6. When Wt/Lorry changes:
      if (name === 'wt_per_lorry') {
        const wt = parseFloat(value) || 0;
        updated.wt_per_lorry = wt;
        updated.total_wt_in_ton = parseFloat((lorries * wt).toFixed(3));
        if (unitWeightKg && unitWeightKg > 0) {
          const units = parseFloat(((wt * 1000) / unitWeightKg).toFixed(2));
          updated.units_per_lorry = units;
          updated.units_per_lorry_type = String(units);
          updated.total_unit = Math.round(units * lorries);
        }
      }

      // Automatically update b_rate from active Satta Base Rates when date or b_date changes
      if ((name === 'date' || name === 'b_date') && finalValue && baseRatesList.length > 0) {
        const sorted = [...baseRatesList].sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''));
        const eff = sorted.find((r: any) => r.start_date <= finalValue) || sorted[sorted.length - 1];
        if (eff && eff.base_rate) {
          updated.b_rate = Number(eff.base_rate);
        }
      }

      // Automatically update quality rates and filter agencies if area or date changes
      if ((name === 'area' || name === 'date') && finalValue) {
        const currentArea = name === 'area' ? finalValue : prev.area;
        const currentDate = name === 'date' ? finalValue : prev.date;

        if (currentArea) {
          const validAgencies = getAgenciesForArea(currentArea);
          const validSet = new Set(validAgencies.map(a => a.AGENCY_NAME.toUpperCase()).concat(validAgencies.map(a => a.AGENCY_CODE.toUpperCase())));

          let firstCalculated = null;
          const updatedQD = (updated.quality_details || []).map((row: any, i: number) => {
            let filteredRowAgencies = Array.isArray(row.agencies)
              ? row.agencies.filter((ag: string) => validSet.has(ag.trim().toUpperCase()))
              : (row.agency && validSet.has(row.agency.trim().toUpperCase()) ? [row.agency] : []);

            let newRs = row.rs;
            if (row.quality) {
              const calculatedPrice = recalculateRowRate(currentDate || today, currentArea, row.quality);
              if (calculatedPrice !== null) {
                if (i === 0) firstCalculated = calculatedPrice;
                newRs = calculatedPrice;
              }
            }

            return {
              ...row,
              agencies: filteredRowAgencies,
              agency: filteredRowAgencies[0] || '',
              rs: newRs
            };
          });
          updated.quality_details = updatedQD;
          if (firstCalculated !== null) updated.b_rate = firstCalculated;
        }
      }

      // Ensure session and order_no stay in sync and clean without duplicate prefixes
      if (name === 'session') {
        const cleanSession = String(value || '').replace(/^BJCL\//i, '').replace(/\/.*$/, '').trim() || '2026-2027';
        updated.session = cleanSession;
        updated.financial_year = cleanSession;
        if (updated.sauda_no) {
          updated.sauda_no = cleanSaudaNo(updated.sauda_no, cleanSession);
        }
      }

      if (name === 'sauda_no') {
        let val = String(value || '').trim();
        if (/BJCL.*BJCL/i.test(val)) {
          val = cleanSaudaNo(val, updated.session || '2026-2027');
        }
        updated.sauda_no = val;
      }

      return updated;
    });
  };

  const toNumericOrNull = (v: any) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? null : n;
  };

  const handleDeleteQualityRow = (index?: number) => {
    setFormData(prev => {
      const qd = [...(prev.quality_details || [])];
      if (qd.length <= 1) return prev;
      if (typeof index === 'number') {
        qd.splice(index, 1);
      } else {
        qd.pop();
      }
      return { ...prev, quality_details: qd };
    });
  };

  const handleRemoveQualityRowAt = (index?: number) => {
    if (typeof index === 'number') {
      handleDeleteQualityRow(index);
    } else {
      setFormData(prev => {
        const qd = [...(prev.quality_details || [])];
        if (qd.length <= 1) return prev;
        qd.pop();
        return { ...prev, quality_details: qd };
      });
    }
  };

  const handleSelectChange = (field: string, val: string) => {
    handleChange({
      target: { name: field, value: val }
    } as any);
  };

  const handleQualityChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const qd = [...(prev.quality_details || [])];

      // Prevent selecting duplicate Quality across rows
      if (field === 'quality' && value) {
        const normVal = String(value).trim().toUpperCase();
        const alreadyExists = qd.some((r, rIdx) => rIdx !== index && String(r.quality || '').trim().toUpperCase() === normVal);
        if (alreadyExists) {
          alert(`Quality "${value}" is already selected in another row. Each quality can only be added once.`);
          return prev;
        }
      }

      qd[index] = { ...qd[index], [field]: value };

      // When modifying agencies or markas on the first row (index 0), automatically propagate to all subsequent spawned rows
      if (index === 0 && (field === 'agencies' || field === 'markas')) {
        for (let j = 1; j < qd.length; j++) {
          qd[j] = {
            ...qd[j],
            [field]: Array.isArray(value) ? [...value] : value,
            [field === 'agencies' ? 'agency' : 'marka']: Array.isArray(value) ? (value[0] || '') : value,
            applicableCombinations: undefined
          };
        }
      }

      if (field === 'quality' && value && prev.area) {
        const calculatedPrice = recalculateRowRate(prev.date || today, prev.area, value);
        if (calculatedPrice !== null) {
          qd[index].rs = calculatedPrice;
          if (Array.isArray(qd[index].applicableCombinations)) {
            qd[index].applicableCombinations = qd[index].applicableCombinations.map((c: any) => ({
              ...c,
              quality: value,
              rs: calculatedPrice
            }));
          }
          if (index === 0) {
            return { ...prev, quality_details: qd, b_rate: calculatedPrice };
          }
        }
      }

      return { ...prev, quality_details: qd };
    });
  };

  const handleAddQualityRow = () => {
    setFormData(prev => {
      const qdList = prev.quality_details || [];
      const firstRow: any = qdList[0] || {};
      const defaultAgencies = Array.isArray(firstRow.agencies) && firstRow.agencies.length > 0
        ? [...firstRow.agencies]
        : (firstRow.agency ? [firstRow.agency] : []);
      const defaultMarkas = Array.isArray(firstRow.markas) && firstRow.markas.length > 0
        ? [...firstRow.markas]
        : (firstRow.marka ? [firstRow.marka] : []);
      const defaultAgency = firstRow.agency || defaultAgencies[0] || '';
      const defaultMarka = firstRow.marka || defaultMarkas[0] || '';

      const newRow = {
        quality: '',
        agencies: defaultAgencies,
        markas: defaultMarkas,
        agency: defaultAgency,
        marka: defaultMarka,
        rs: 0,
        qty: 0,
        applicableCombinations: []
      };
      return {
        ...prev,
        quality_details: [...qdList, newRow]
      };
    });
  };

  const handleSave = async (targetMode: 'DRAFT' | 'SUBMIT' = 'SUBMIT') => {
    const freshApproval = await getBaseRateApprovalState(true);
    setBaseRateApprovalState(freshApproval);
    if (!freshApproval.isApproved) {
      alert(BASE_RATE_APPROVAL_REQUIRED_MSG);
      return;
    }

    if (isContractApproved) {
      alert("🔒 Permission Denied: This Sauda contract is approved and permanently locked against all edits.");
      return;
    }
    if (isPendingApproval) {
      alert("🔒 Permission Denied: This Sauda contract is pending approval from User 010 (Checker) and cannot be edited.");
      return;
    }
    if (isUser010) {
      alert("🔒 Notice: User 010 (Checker) can only Approve or Reject entries from the Sauda Approval Dashboard.");
      return;
    }

    setLoading(true);
    try {

    const saudaData = { ...formData };
    const qualityDetails = saudaData.quality_details || [];

    const flatCombinations: any[] = [];
    qualityDetails.forEach((row: any) => {
      const rowQuality = String(row.quality || '').trim();
      const rowRs = toNumericOrNull(row.rs) ?? 0;
      const rowQty = toNumericOrNull(row.qty) ?? 0;

      if (Array.isArray(row.applicableCombinations) && row.applicableCombinations.length > 0) {
        row.applicableCombinations.forEach((comb: any) => {
          if (comb.enabled !== false && (comb.agency || comb.marka || comb.quality)) {
            flatCombinations.push({
              quality: String(comb.quality || rowQuality).trim(),
              agency: String(comb.agency || '').trim(),
              marka: String(comb.marka || '').trim(),
              rs: toNumericOrNull(comb.rs) ?? rowRs,
              qty: toNumericOrNull(comb.qty) ?? rowQty
            });
          }
        });
      } else {
          // 2. Generate combinations from agencies and markas arrays
          const rowAgencies: string[] = (
            Array.isArray(row.agencies) && row.agencies.length > 0
              ? row.agencies
              : (row.agency ? String(row.agency).split(',').map((x: string) => x.trim()).filter(Boolean) : [])
          );

          const rowMarkas: string[] = (
            Array.isArray(row.markas) && row.markas.length > 0
              ? row.markas
              : (row.marka ? String(row.marka).split(',').map((x: string) => x.trim()).filter(Boolean) : [])
          );

          if (rowAgencies.length > 0 && rowMarkas.length > 0) {
            if (rowAgencies.length === rowMarkas.length && rowAgencies.length > 1) {
              rowAgencies.forEach((ag, idx) => {
                flatCombinations.push({
                  quality: rowQuality,
                  agency: String(ag).trim(),
                  marka: String(rowMarkas[idx] || rowMarkas[0]).trim(),
                  rs: rowRs,
                  qty: rowQty
                });
              });
            } else {
              rowAgencies.forEach(ag => {
                rowMarkas.forEach(mk => {
                  flatCombinations.push({
                    quality: rowQuality,
                    agency: String(ag).trim(),
                    marka: String(mk).trim(),
                    rs: rowRs,
                    qty: rowQty
                  });
                });
              });
            }
          } else if (rowAgencies.length > 0) {
            rowAgencies.forEach(ag => {
              flatCombinations.push({
                quality: rowQuality,
                agency: String(ag).trim(),
                marka: String(row.marka || '').trim(),
                rs: rowRs,
                qty: rowQty
              });
            });
          } else if (rowMarkas.length > 0) {
            rowMarkas.forEach(mk => {
              flatCombinations.push({
                quality: rowQuality,
                agency: String(row.agency || '').trim(),
                marka: String(mk).trim(),
                rs: rowRs,
                qty: rowQty
              });
            });
          } else if (rowQuality || rowRs > 0 || row.agency || row.marka) {
            flatCombinations.push({
              quality: rowQuality,
              agency: String(row.agency || '').trim(),
              marka: String(row.marka || '').trim(),
              rs: rowRs,
              qty: rowQty
            });
          }
        }
      });

      const allUniqueAgencies = Array.from(new Set(flatCombinations.map(c => c.agency).filter(Boolean)));
      const allUniqueMarkas = Array.from(new Set(flatCombinations.map(c => c.marka).filter(Boolean)));

      if (formData.area) {
        for (const ag of allUniqueAgencies) {
          if (ag && ag !== 'No agency' && !validateAreaAgencyCombination(formData.area, ag)) {
            alert(`Validation Error: Selected agency "${ag}" is not mapped to Area "${formData.area}" in area_logic table.`);
            setLoading(false);
            return;
          }
        }
      }

      if (allUniqueAgencies.length > 0) {
        saudaData.agency = allUniqueAgencies.join(', ');
      }
      if (allUniqueMarkas.length > 0) {
        saudaData.marks = allUniqueMarkas.join(', ');
      }

      const SAUDA_MASTER_FIELDS = [
        'sauda_id',
        'financial_year',
        'sauda_no',
        'session',
        'po_type',
        'date',
        'broker',
        'supplier',
        'challan_supplier',
        'area',
        'agency',
        'marks',
        'no_of_lorries',
        'units_per_lorry',
        'units_per_lorry_type',
        'total_unit',
        'wt_per_lorry',
        'unit_type',
        'total_wt_in_ton',
        'shipment_date',
        'shipment_days',
        'shipment_penalty',
        'marks_claim',
        'quantity_claim',
        'remarks',
        'b_rate',
        'b_date',
        'superior_normal_marks',
        'status',
        'approval_status',
        'created_by',
        'is_checked',
        'checked_by',
        'checked_at',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_remarks',
        'resubmission_count',
        'submitted_by',
        'submitted_at',
        'last_updated_at',
        'version',
        'created_at',
        'quality_details'
      ];

      const toIntegerOrNull = (v: any) => {
        if (v === null || v === undefined || String(v).trim() === '') return null;
        const n = parseInt(String(v).replace(/[^0-9\-]/g, ''), 10);
        return isNaN(n) ? null : n;
      };

      const toDateOrNull = (v: any) => {
        if (!v || String(v).trim() === '') return null;
        const s = String(v).trim();
        if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
        return null;
      };

      const saudaPayload: Record<string, any> = {};
      SAUDA_MASTER_FIELDS.forEach(field => {
        if ((saudaData as any)[field] !== undefined) {
          saudaPayload[field] = (saudaData as any)[field];
        }
      });

      delete saudaPayload.signature_url;
      delete saudaPayload.digital_signature;

      // Save complete raw quality details array (preserving multi-select agencies, markas, applicableCombinations)
      saudaPayload.quality_details = (formData.quality_details || []).map((q: any) => ({
        quality: String(q.quality || '').trim(),
        rs: toNumericOrNull(q.rs) ?? 0,
        qty: toNumericOrNull(q.qty) ?? 0,
        agency: String(q.agency || '').trim(),
        marka: String(q.marka || '').trim(),
        agencies: Array.isArray(q.agencies) && q.agencies.length > 0 ? q.agencies : (q.agency ? [q.agency] : []),
        markas: Array.isArray(q.markas) && q.markas.length > 0 ? q.markas : (q.marka ? [q.marka] : []),
        applicableCombinations: Array.isArray(q.applicableCombinations) ? q.applicableCombinations : []
      }));

      // Map session and sauda_no cleanly
      const cleanSession = saudaData.session ? String(saudaData.session).replace(/^BJCL\//i, '').replace(/\/.*$/, '').trim() : '2026-2027';
      saudaPayload.session = cleanSession || '2026-2027';
      saudaPayload.sauda_no = cleanSaudaNo(saudaData.sauda_no, saudaPayload.session);

      // Strongly sanitize types so Postgres never receives "" for integer, numeric, or date fields
      saudaPayload.no_of_lorries = toIntegerOrNull(saudaData.no_of_lorries) ?? 1;
      saudaPayload.total_unit = toIntegerOrNull(saudaData.total_unit) ?? 0;
      saudaPayload.shipment_days = toIntegerOrNull(saudaData.shipment_days) ?? 0;

      const numericUnitsPerLorry = toNumericOrNull(formData.units_per_lorry) ?? toNumericOrNull(formData.units_per_lorry_type);
      saudaPayload.units_per_lorry = numericUnitsPerLorry;
      saudaPayload.units_per_lorry_type = numericUnitsPerLorry !== null ? String(numericUnitsPerLorry) : (formData.units_per_lorry_type || formData.unit_type || 'BALES');

      saudaPayload.wt_per_lorry = toNumericOrNull(saudaData.wt_per_lorry) ?? 0;
      saudaPayload.total_wt_in_ton = toNumericOrNull(saudaData.total_wt_in_ton) ?? 0;
      saudaPayload.shipment_penalty = toNumericOrNull(saudaData.shipment_penalty) ?? 0;
      saudaPayload.marks_claim = toNumericOrNull(saudaData.marks_claim) ?? 0;
      saudaPayload.quantity_claim = toNumericOrNull(saudaData.quantity_claim) ?? 0;
      saudaPayload.b_rate = toNumericOrNull(saudaData.b_rate) ?? (flatCombinations[0]?.rs || 0);

      saudaPayload.date = toDateOrNull(saudaData.date) || today;
      saudaPayload.shipment_date = toDateOrNull(saudaData.shipment_date);
      saudaPayload.b_date = toDateOrNull(saudaData.b_date) || saudaPayload.date;

      let inserted;
      let isEditMode = !!saudaPayload.sauda_id;

      if (!saudaPayload.sauda_id && saudaPayload.sauda_no) {
        const targetFYear = saudaPayload.financial_year || '2026-2027';
        const allSaudas = await dbModule.fetchAll('sauda_master').catch(() => []);
        const match = allSaudas.find((s: any) => s.sauda_no === saudaPayload.sauda_no && s.financial_year === targetFYear);
        if (match) {
          if (isSaudaApproved(match)) {
            alert(`🔒 Permission Denied: Sauda #${match.sauda_no} is approved by User 010. It cannot be overwritten or edited by any user.`);
            setLoading(false);
            return;
          }
          saudaPayload.sauda_id = match.sauda_id;
          isEditMode = true;
        }
      }

      // Maker-Checker Workflow Status Management:
      // Statuses:
      // - DRAFT: Created by User 002, editable, not submitted to User 010
      // - PENDING: Submitted by User 002 for User 010 review & approval, read-only
      // - REJECTED: Returned by User 010 with mandatory remarks, editable by User 002 for correction
      // - APPROVED: Final approved by User 010, permanently locked for all users
      const isWasRejected = initialData && (
        String(initialData.status || '').toUpperCase() === 'REJECTED' ||
        String(initialData.approval_status || '').toUpperCase() === 'REJECTED' ||
        Boolean(initialData.rejected_by)
      );

      const activeUserId = resolveDisplayName(userCtx.userName || userCtx.username || userCtx.userId, 'User 002');

      if (targetMode === 'DRAFT') {
        saudaPayload.status = 'DRAFT';
        saudaPayload.approval_status = 'DRAFT';
        saudaPayload.is_checked = false;
        saudaPayload.checked_by = null;
        saudaPayload.checked_at = null;
        saudaPayload.approved_by = null;
        saudaPayload.approved_at = null;
      } else {
        // targetMode === 'SUBMIT'
        saudaPayload.status = 'PENDING';
        saudaPayload.approval_status = 'PENDING';
        saudaPayload.is_checked = false;
        saudaPayload.checked_by = null;
        saudaPayload.checked_at = null;
        saudaPayload.approved_by = null;
        saudaPayload.approved_at = null;
        saudaPayload.rejected_by = null;
        saudaPayload.rejected_at = null;
        saudaPayload.rejection_remarks = null;
        saudaPayload.submitted_by = activeUserId;
        saudaPayload.submitted_at = new Date().toISOString();

        if (isWasRejected) {
          saudaPayload.resubmission_count = (Number(initialData?.resubmission_count) || 0) + 1;
        }
      }

      saudaPayload.last_updated_at = new Date().toISOString();

      if (!isEditMode && !saudaPayload.created_by) {
        saudaPayload.created_by = activeUserId;
      }

      saudaPayload.financial_year = isEditMode
        ? (initialData?.financial_year || saudaPayload.financial_year || '2026-2027')
        : (saudaPayload.financial_year || '2026-2027');

      const sqlVal = (v: any) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return isFinite(v) ? String(v) : '0';
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
        return `'${String(v).replace(/'/g, "''")}'`;
      };

      const targetSaudaId = saudaPayload.sauda_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sauda-${Date.now()}`);
      saudaPayload.sauda_id = targetSaudaId;

      try {
        const txQueries: string[] = [];
        const masterCols = Object.keys(saudaPayload);
        const masterVals = masterCols.map(k => sqlVal(saudaPayload[k]));
        const updateSet = masterCols.filter(k => k !== 'sauda_id').map(k => `${k} = EXCLUDED.${k}`).join(', ');
        txQueries.push(
          `INSERT INTO sauda_master (${masterCols.join(', ')}) VALUES (${masterVals.join(', ')}) ON CONFLICT (sauda_id) DO UPDATE SET ${updateSet};`
        );
        txQueries.push(`DELETE FROM sauda_quality_details WHERE sauda_id = ${sqlVal(targetSaudaId)};`);

        for (const comb of flatCombinations) {
          if (comb.quality || comb.agency || comb.marka || comb.rs > 0) {
            txQueries.push(
              `INSERT INTO sauda_quality_details (sauda_id, sauda_no, financial_year, quality, qty, agency, marka, rs) VALUES (${sqlVal(targetSaudaId)}, ${sqlVal(saudaPayload.sauda_no)}, ${sqlVal(saudaPayload.financial_year)}, ${sqlVal(String(comb.quality || '').trim())}, ${sqlVal(toNumericOrNull(comb.qty) ?? 0)}, ${sqlVal(String(comb.agency || '').trim())}, ${sqlVal(String(comb.marka || '').trim())}, ${sqlVal(toNumericOrNull(comb.rs) ?? 0)});`
            );
          }
        }
        await dbModule.executeTransaction(txQueries);
        inserted = { ...saudaPayload };
      } catch (_txErr) {
        if (isEditMode) {
          inserted = await dbModule.update('sauda_master', 'sauda_id', saudaPayload.sauda_id, saudaPayload);
        } else {
          inserted = await dbModule.insert('sauda_master', saudaPayload);
        }
        if (inserted && flatCombinations.length > 0) {
          if (isEditMode) {
            await dbModule.delete('sauda_quality_details', 'sauda_id', inserted.sauda_id);
          }
          for (const comb of flatCombinations) {
            if (comb.quality || comb.agency || comb.marka || comb.rs > 0) {
              await dbModule.insert('sauda_quality_details', {
                sauda_id: inserted.sauda_id,
                sauda_no: inserted.sauda_no || saudaData.sauda_no,
                financial_year: inserted.financial_year || saudaPayload.financial_year,
                quality: String(comb.quality || '').trim(),
                qty: toNumericOrNull(comb.qty) ?? 0,
                agency: String(comb.agency || '').trim(),
                marka: String(comb.marka || '').trim(),
                rs: toNumericOrNull(comb.rs) ?? 0
              });
            }
          }
        }
      }

      try {
        const oldCleanKey = String(initialData?.sauda_no || '').trim().toUpperCase();
        const newCleanKey = String(saudaPayload.sauda_no || '').trim().toUpperCase();
        const idCleanKey = String(saudaPayload.sauda_id || '').trim().toUpperCase();
        if (oldCleanKey && oldCleanKey !== newCleanKey) {
          localStorage.removeItem(`sauda_check_status_${oldCleanKey}`);
        }
        const statusCachePayload = {
          is_checked: false,
          checked_by: null,
          checked_at: null,
          approved_by: null,
          approved_at: null,
          rejected_by: saudaPayload.rejected_by ?? null,
          rejected_at: saudaPayload.rejected_at ?? null,
          rejection_remarks: saudaPayload.rejection_remarks ?? null,
          status: saudaPayload.status,
          approval_status: saudaPayload.approval_status,
          submitted_by: saudaPayload.submitted_by ?? null,
          submitted_at: saudaPayload.submitted_at ?? null,
          resubmission_count: saudaPayload.resubmission_count || 0,
          last_updated_at: saudaPayload.last_updated_at
        };
        if (newCleanKey) {
          localStorage.setItem(`sauda_check_status_${newCleanKey}`, JSON.stringify(statusCachePayload));
        }
        if (idCleanKey) {
          localStorage.setItem(`sauda_check_status_${idCleanKey}`, JSON.stringify(statusCachePayload));
        }
      } catch (_e) {}

      if (isWasRejected && targetMode === 'SUBMIT') {
        logChange({
          module: 'Sauda Desk',
          entity_name: 'Sauda Contract Resubmission',
          record_id: String(saudaPayload.sauda_id || saudaPayload.sauda_no),
          action: 'UPDATE',
          field_name: 'status',
          field_label: 'Approval Status',
          old_value: 'REJECTED',
          new_value: 'PENDING',
          user_name: activeUserId,
          remarks: `Sauda #${saudaPayload.sauda_no} corrected and resubmitted for verification by User 010 (Resubmission #${saudaPayload.resubmission_count})`
        }).catch(() => {});
      } else if (targetMode === 'SUBMIT') {
        logChange({
          module: 'Sauda Desk',
          entity_name: 'Sauda Contract Submission',
          record_id: String(saudaPayload.sauda_id || saudaPayload.sauda_no),
          action: isEditMode ? 'UPDATE' : 'CREATE',
          field_name: 'status',
          field_label: 'Approval Status',
          old_value: initialData?.status || 'NEW',
          new_value: 'PENDING',
          user_name: activeUserId,
          remarks: `Sauda #${saudaPayload.sauda_no} submitted for approval by User 010`
        }).catch(() => {});
      }

      screenDraftService.clearDraft('sauda_entry_form');
      setFormData(getInitialFormData());

      const successMsg = targetMode === 'DRAFT'
        ? `Sauda Contract #${saudaPayload.sauda_no} saved as Draft!`
        : (isWasRejected
            ? `Sauda Contract #${saudaPayload.sauda_no} corrected & resubmitted for User 010 approval!`
            : `Sauda Contract #${saudaPayload.sauda_no} submitted for User 010 approval!`);

      alert(successMsg);
      notifyDataChanged('sauda_master');
      window.dispatchEvent(new CustomEvent('app-data-updated'));
      onSave?.(saudaData);
    } catch (err: any) {
      console.error(err);
      alert("Save failed: " + (err.message || "Database error."));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave('SUBMIT');
  };

  return (
    <LegacyLayout title="Sauda Desk" subtitle={initialData ? "Modify Contract" : "Add Sauda Contract"} onClose={onCancel}>
      <div className="flex-1 flex flex-col font-sans text-slate-800 space-y-4 w-full max-w-7xl 2xl:max-w-[1550px] mx-auto pb-10 px-2 sm:px-4 min-w-0">
        {/* HEADER BAR - MATCHING MILL INSPECTION AESTHETIC */}
        <div className="bg-[#D94B5A] text-white px-5 sm:px-6 py-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between border border-[#FBCFCB] gap-4">
          {/* Left Badge & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D94B5A]/40 border border-[#FBCFCB]/40 flex items-center justify-center text-[#FDE7E6] shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-[#D94B5A] text-[#FDE7E6] text-[11px] font-extrabold px-2.5 py-0.5 rounded border border-[#FBCFCB] tracking-wider w-fit">
                  {formData.session || 'BJCL 2026 - 2027'}
                </span>
                {initialData && (formData.created_by || initialData.created_by) && (
                  <span className="bg-emerald-950/80 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-700/50">
                    Saved by: {resolveDisplayName(formData.created_by || initialData.created_by, activeUsername)}
                  </span>
                )}
                {initialData && (initialData.approved_by || initialData.checked_by) && (
                  <span className="bg-emerald-800 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-400/50">
                    ✓ Approved by: {resolveDisplayName(initialData.approved_by || initialData.checked_by)}
                  </span>
                )}
                {initialData && isRejectedContract && initialData.rejected_by && (
                  <span className="bg-rose-900 text-rose-100 text-[10px] font-extrabold px-2 py-0.5 rounded border border-rose-500/50">
                    ✕ Rejected by: {resolveDisplayName(initialData.rejected_by)}
                  </span>
                )}
                {initialData && isPendingApproval && (Number(initialData.resubmission_count) || 0) > 0 && (
                  <span className="bg-indigo-900 text-indigo-100 text-[10px] font-extrabold px-2 py-0.5 rounded border border-indigo-400/50">
                    ↻ Resubmitted (v{(Number(initialData.resubmission_count) || 0) + 1})
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-amber-300 drop-shadow mt-0.5">
                {initialData ? `MODIFY SAUDA #${formData.sauda_no}` : "NEW SAUDA CONTRACT ENTRY"}
              </h1>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setForceUser010(prev => prev === null ? !detectedIs010 : !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                isUser010
                  ? "bg-amber-400 hover:bg-amber-300 text-[#0b2415] border-amber-300 font-black shadow-xs"
                  : "bg-[#0b2415]/70 hover:bg-[#0b2415] text-emerald-200 border-emerald-700/60"
              }`}
              title="Toggle between standard form and User 010 non-mandatory streamlined layout"
            >
              <span className={`w-2 h-2 rounded-full ${isUser010 ? "bg-emerald-900 animate-pulse" : "bg-emerald-400"}`} />
              <span>User 010 Mode: {isUser010 ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-[#0b2415]/80 hover:bg-[#123920] border border-emerald-400/50 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Back to Sauda Desk (Esc)"
            >
              <ArrowLeft className="h-4 w-4 text-amber-300" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Satta Chart Verification Badge */}
        <div className={`border rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs ${
          baseRateApprovalState.isApproved
            ? "bg-emerald-50 border-emerald-300"
            : "bg-amber-50 border-amber-400"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              baseRateApprovalState.isApproved ? "bg-emerald-600" : "bg-amber-600"
            }`} />
            <span className="font-extrabold text-slate-900 uppercase tracking-wide">
              Step 1: Satta Chart Active (Source Rate: ₹{formData.b_rate ? Number(formData.b_rate).toLocaleString() : '17,500'}) • Status: {baseRateApprovalState.isApproved ? "Approved" : "Pending Approval (User 010)"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('satta_chart') : (window.location.hash = '#satta_chart')}
            className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
          >
            Review / Update Satta Chart →
          </button>
        </div>

        {/* Mandatory User 010 Base Rate Approval Lock Banner */}
        {!baseRateApprovalState.isApproved && (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-300 text-rose-700 shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-rose-700 text-white font-black text-[11px] px-2.5 py-0.5 rounded uppercase tracking-wider">
                    PENDING BASE RATE APPROVAL
                  </span>
                  <span className="font-black text-rose-950 text-sm">
                    {BASE_RATE_APPROVAL_REQUIRED_MSG}
                  </span>
                </div>
                <p className="text-xs text-rose-800 font-semibold mt-1">
                  Current Base Rate ₹{Number(baseRateApprovalState.currentBaseRate || 0).toLocaleString('en-IN')} was updated by{' '}
                  <strong>{baseRateApprovalState.updatedByDisplay || 'User'}</strong>. Creating, editing, updating, or saving Sauda transactions is locked until User 010 approves the Base Rate.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('satta_chart') : (window.location.hash = '#satta_chart')}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer shrink-0 shadow-xs"
            >
              Open Satta Section →
            </button>
          </div>
        )}

        {/* 1. Permanently Locked Contract Banner (Approved by User 010 - Locked for ALL users) */}
        {isContractApproved && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-200 text-rose-700 shrink-0 shadow-2xs">
                <Lock className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-rose-700 text-white font-black text-[11px] px-2.5 py-0.5 rounded tracking-wider uppercase shadow-2xs">
                    PERMANENTLY LOCKED CONTRACT
                  </span>
                  <span className="font-extrabold text-rose-950 text-sm">
                    Approved by User 010 ({resolveDisplayName(initialData?.approved_by || initialData?.checked_by, 'Checker')})
                  </span>
                  <span className="bg-rose-200/80 text-rose-900 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded">
                    Read Only (All Users)
                  </span>
                </div>
                <p className="text-xs text-rose-800 font-medium mt-1">
                  This Sauda contract has been verified and approved by User 010. Per company policy, once approved, it is <strong className="font-extrabold text-rose-950">permanently locked</strong> against all editing and deletion by all users, including Users 002, 010, and Admin.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Back to Register
              </button>
            </div>
          </div>
        )}

        {/* 2. Rejected Contract Banner (Editable by User 002 for Resubmission) */}
        {!isContractApproved && isRejectedContract && (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-300 text-rose-700 shrink-0 shadow-2xs">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-rose-700 text-white font-black text-[11px] px-2.5 py-0.5 rounded tracking-wider uppercase shadow-2xs">
                    REJECTED BY USER 010
                  </span>
                  <span className="font-extrabold text-rose-950 text-sm">
                    Returned for Correction by {resolveDisplayName(initialData?.rejected_by, 'User 010 (Checker)')}
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Editable by User 002
                  </span>
                </div>
                {initialData?.rejection_remarks && (
                  <p className="text-xs font-bold text-rose-900 bg-white/80 border border-rose-200 rounded-lg px-3 py-1.5 mt-1.5">
                    Rejection Reason: "{initialData.rejection_remarks}"
                  </p>
                )}
                <p className="text-xs text-rose-800 font-medium mt-1">
                  Please update the necessary details below and click <strong>"RESUBMIT FOR APPROVAL"</strong> at the bottom of the form to send this contract back to User 010.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Back to Register
              </button>
            </div>
          </div>
        )}

        {/* 3. Pending Approval Banner */}
        {!isContractApproved && isPendingApproval && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl border border-amber-200 text-amber-800 shrink-0 shadow-2xs">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded tracking-wider uppercase shadow-2xs">
                    PENDING APPROVAL
                  </span>
                  <span className="font-extrabold text-amber-950 text-sm">
                    Awaiting Verification by User 010 (Checker)
                  </span>
                  {(Number(initialData?.resubmission_count) || 0) > 0 && (
                    <span className="text-[10px] text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-300 font-extrabold">
                      Resubmitted (Version {(Number(initialData?.resubmission_count) || 0) + 1})
                    </span>
                  )}
                  {initialData?.submitted_at && (
                    <span className="text-[10px] text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300 font-mono">
                      Submitted on: {new Date(initialData.submitted_at).toLocaleString('en-GB')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-800 font-medium mt-1">
                  This contract was submitted for approval by {resolveDisplayName(initialData?.submitted_by || initialData?.created_by, 'User 002')}. While Pending Approval, it cannot be modified by User 002.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Back to Register
              </button>
            </div>
          </div>
        )}



        {/* 4. Checker Review Mode Notice for User 010 */}
        {isUser010 && initialData && !isContractApproved && (
          <div className="bg-blue-50 border border-blue-300 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="bg-blue-800 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase">
                CHECKER REVIEW MODE (USER 010)
              </span>
              <span className="font-medium">
                User 010 reviews submitted data without direct modification. Use the Approve or Reject controls on the Sauda Approval Dashboard.
              </span>
            </div>
          </div>
        )}

        {/* 2. Main Form Content */}
        <main ref={formContainerRef} className={`flex-1 space-y-5 w-full min-w-0 ${isLockedForCurrentUser ? 'pointer-events-none opacity-85 select-none' : ''}`}>
          {/* Section 1: Basic Details */}
          <div id="basic-details" className="scroll-mt-14">
            <BasicDetailsCard
              formData={formData}
              onChange={handleChange}
              onSelectChange={handleSelectChange}
              brokers={brokers}
              suppliers={suppliers}
              areas={areas}
              isUser010={isUser010}
            />
          </div>

          {/* Section 2: Transportation Details */}
          <div id="transportation-details" className="scroll-mt-14">
            <TransportationCard
              formData={formData}
              onChange={handleChange}
              onSelectChange={handleSelectChange}
              unitOptions={UNIT_OPTIONS}
              isUser010={isUser010}
            />
          </div>

          {/* Section 3: Quality Details */}
          <div id="quality-details" className="scroll-mt-14">
            <QualityDetailsTable
              qualityDetails={formData.quality_details || []}
              onQualityChange={handleQualityChange}
              onAddRow={handleAddQualityRow}
              onDeleteRow={handleDeleteQualityRow}
              onRemoveRowAt={handleRemoveQualityRowAt}
              grades={grades}
              agencies={getAgenciesForArea(formData.area)}
              formDataArea={formData.area}
              markas={markas}
              isUser010={isUser010}
            />
          </div>

          {/* Section 4: Shipment & Claims */}
          <div id="claims-details" className="scroll-mt-14">
            <ShipmentClaimsCard
              formData={formData}
              onChange={handleChange}
            />
          </div>

          {/* Section 5: Remarks & Finalisation (with Attached Action Footer) */}
          <div id="remarks-details" className="scroll-mt-14">
            <RemarksCard
              formData={formData}
              onChange={handleChange}
              onPrint={() => setShowPrintSlip(true)}
              onBack={onCancel}
              onSaveDraft={!isLockedForCurrentUser ? () => handleSave('DRAFT') : undefined}
              onSubmitForApproval={!isLockedForCurrentUser ? () => handleSave('SUBMIT') : undefined}
              isLoading={loading}
              isLocked={isContractApproved}
              lockedMessage="🔒 Permanently Locked: This Sauda contract was approved by User 010. Edits and deletions are permanently disabled."
              isPending={!isContractApproved && isPendingApproval}
              isRejected={!isContractApproved && isRejectedContract}
            />
          </div>
        </main>

        {/* Print Slip Modal */}
        {showPrintSlip && (
          <SaudaPrintSlip
            sauda={formData}
            onClose={() => setShowPrintSlip(false)}
          />
        )}
      </div>
    </LegacyLayout>
  );
}
