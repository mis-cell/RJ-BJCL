import React, { useState, useEffect, useRef } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { 
  Save, 
  X,
  Printer,
  ChevronDown,
  Plus
} from 'lucide-react';
import { Satta, SattaQualityDetail } from '../types';
import LegacyLayout, { LegacyFieldset, LegacyButton } from '../components/LegacyLayout';
import { dbModule } from '../services/dbModule';
import { supabase } from '../lib/supabase';
import { enforceEditOrDeletePermission } from '../lib/permissions';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { resolveSattaRate } from '../services/sattaRateService';
import { screenDraftService } from '../services/screenDraftService';

const UNIT_OPTIONS = ["DRUMS", "BALES", "LOOSE", "P.BALES", "H.BALES"];

const compareQualities = (aStr: string, bStr: string): number => {
  const clean = (val: string) => {
    return String(val || '')
      .trim()
      .replace(/\.$/, '')
      .replace(/\s+/g, '')
      .toUpperCase();
  };

  const a = clean(aStr);
  const b = clean(bStr);

  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const PREDEFINED_RANKS: Record<string, number> = {
    'TD1': 10, 'TD2': 20, 'TD3': 30, 'TD4': 40, 'TD5': 50, 'TD6': 60, 'TD7': 70, 'TD8': 80,
    'W1': 110, 'W2': 120, 'W3': 130, 'W4': 140, 'W5': 150, 'W6': 160, 'W7': 170, 'W8': 180,
    'M1': 210, 'M2': 220, 'M3': 230, 'M4': 240, 'M5': 250, 'M6': 260, 'M7': 270, 'M8': 280,
    'BTC': 310, 'BTR': 320,
    'STANDARD GRADE': 1000, 'NORMAL GRADE': 1010
  };

  const rankA = PREDEFINED_RANKS[a];
  const rankB = PREDEFINED_RANKS[b];

  if (rankA !== undefined && rankB !== undefined) {
    return rankA - rankB;
  }
  if (rankA !== undefined) return -1;
  if (rankB !== undefined) return 1;

  const regex = /^([A-Z]+)(\d+)(.*)$/;
  const matchA = a.match(regex);
  const matchB = b.match(regex);

  if (matchA && matchB) {
    const prefixA = matchA[1];
    const numA = parseInt(matchA[2], 10);
    const prefixB = matchB[1];
    const numB = parseInt(matchB[2], 10);

    if (prefixA === prefixB) {
      return numA - numB;
    }
    return prefixA.localeCompare(prefixB);
  }

  return a.localeCompare(b);
};

export default function SattaEntry({ initialData, onSave, onCancel }: { initialData?: any; onSave?: (d: any) => void; onCancel?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [markas, setMarkas] = useState<any[]>([]);
  const [baseRatesList, setBaseRatesList] = useState<any[]>([]);
  const [dbDiffsList, setDbDiffsList] = useState<any[]>([]);
  
  const today = new Date().toISOString().split('T')[0];
  
  const getInitialFormData = (): Satta => {
    if (initialData) {
      const copy = { ...initialData };
      copy.broker = (copy.broker || '').toUpperCase();
      copy.supplier = (copy.supplier || '').toUpperCase();
      copy.challan_supplier = (copy.challan_supplier || '').toUpperCase();
      copy.area = (copy.area || '').toUpperCase();
      if (!copy.quality_details) {
        copy.quality_details = [];
      }
      
      const realQD = (copy.quality_details || [])
        .filter((item: any) => item.quality || item.qty || item.agency || item.marka || item.rs);

      const existingCount = realQD.length;
      if (existingCount < 7) {
        const remaining = 7 - existingCount;
        const extra = Array.from({ length: remaining }, () => ({ quality: '', qty: 0, agency: '', marka: '', rs: 0 }));
        copy.quality_details = [...realQD, ...extra];
      } else {
        copy.quality_details = realQD;
      }
      return copy;
    }
    return {
      satta_no: '0152',
      financial_year: '2026-2027',
      session: 'BJCL/2026-2027/0152',
      po_type: 'Normal',
      date: today,
      broker: '',
      supplier: '',
      challan_supplier: '',
      area: '',
      agency: '',
      marks: '',
      no_of_lorries: 1,
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
      superior_normal_marks: '',
      status: 'pending',
      quality_details: Array.from({ length: 7 }, () => ({ quality: '', qty: 0, agency: '', marka: '', rs: 0 }))
    };
  };

  const [formData, setFormData] = useState<Satta>(() => {
    if (initialData) return getInitialFormData();
    return screenDraftService.getDraft('satta_entry_form', getInitialFormData());
  });

  useEffect(() => {
    if (initialData) {
      setFormData(getInitialFormData());
    } else if (!screenDraftService.getDraft('satta_entry_form', null)) {
      setFormData(getInitialFormData());
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData && formData) {
      screenDraftService.saveDraft('satta_entry_form', formData);
    }
  }, [formData, initialData]);
  const [unitOptions, setUnitOptions] = useState<string[]>(UNIT_OPTIONS);

  useEffect(() => {
    async function fetchUnits() {
      try {
        if (supabase) {
          const { data } = await supabase.from('unit_master').select('unit_name').order('unit_name');
          if (data && data.length > 0) {
            const fetched = data.map((u: any) => u.unit_name).filter(Boolean);
            setUnitOptions(prev => Array.from(new Set([...fetched, ...prev])));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch unit_master in SattaEntry", err);
      }
    }
    fetchUnits();
  }, []);

  const formContainerRef = useRef<HTMLDivElement>(null);
  useKeyboardNavigation(formContainerRef, () => {
     handleSave();
  });

  async function loadData() {
    try {
        // Pro-active Schema Check: Ensure Satta tables and columns exist in the live Supabase DB
        if (supabase) {
          try {
            await supabase.rpc("exec_sql", {
              query: `
                -- Create table if not exists (in case it wasn't created)
                CREATE TABLE IF NOT EXISTS satta_master (
                    satta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    financial_year TEXT NOT NULL DEFAULT '2026-2027',
                    satta_no TEXT NOT NULL,
                    session TEXT,
                    po_type TEXT,
                    date DATE NOT NULL DEFAULT CURRENT_DATE,
                    broker TEXT,
                    supplier TEXT,
                    challan_supplier TEXT,
                    area TEXT,
                    agency TEXT,
                    marks TEXT,
                    no_of_lorries INTEGER,
                    units_per_lorry_type TEXT,
                    total_unit INTEGER,
                    wt_per_lorry NUMERIC(15,3),
                    unit_type TEXT,
                    total_wt_in_ton NUMERIC(15,3),
                    shipment_date DATE,
                    shipment_days INTEGER,
                    shipment_penalty NUMERIC(15,2),
                    marks_claim NUMERIC(15,2),
                    quantity_claim NUMERIC(15,2),
                    remarks TEXT,
                    b_rate NUMERIC(15,2) DEFAULT 0,
                    b_date DATE,
                    superior_normal_marks TEXT,
                    signature_url TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                ALTER TABLE IF EXISTS satta_master DISABLE ROW LEVEL SECURITY;

                CREATE TABLE IF NOT EXISTS satta_quality_details (
                    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    satta_id UUID REFERENCES satta_master(satta_id) ON DELETE CASCADE,
                    financial_year TEXT,
                    quality TEXT,
                    qty NUMERIC(15,3),
                    rs NUMERIC(15,2),
                    agency TEXT,
                    marka TEXT
                );
                ALTER TABLE IF EXISTS satta_quality_details DISABLE ROW LEVEL SECURITY;

                -- Ensure columns exist
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS session TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS po_type TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS challan_supplier TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS area TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS agency TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS marks TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS no_of_lorries INTEGER;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS units_per_lorry_type TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS total_unit INTEGER;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS wt_per_lorry NUMERIC(15,3);
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS unit_type TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS total_wt_in_ton NUMERIC(15,3);
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS shipment_date DATE;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS shipment_days INTEGER;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS shipment_penalty NUMERIC(15,2);
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS marks_claim NUMERIC(15,2);
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS quantity_claim NUMERIC(15,2);
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS b_rate NUMERIC(15,2);
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS b_date DATE;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS superior_normal_marks TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS signature_url TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS remarks TEXT;
                ALTER TABLE satta_master ADD COLUMN IF NOT EXISTS status TEXT;
              `
            });
            console.log("Schema verified and successfully aligned for all satta tables.");
          } catch (err) {
            console.warn("Satta tables auto-alignment (columns might already exist):", err);
          }
        }

        const [brokData, suppData, areaData, agcData, gradeData, markaData, allSattas, baseRatesResult, differentialsResult] = await Promise.all([
          dbModule.fetchAll('broker_master'),
          dbModule.fetchAll('supply_master'),
          dbModule.fetchAll('area_master'),
          dbModule.fetchAll('agency_master'),
          dbModule.fetchAll('grade_master'),
          dbModule.fetchAll('marka_master').catch(() => []),
          dbModule.fetchAll('satta_master'),
          supabase ? supabase.from('satta_base_rates').select('*').order('start_date', { ascending: false }) : Promise.resolve(null),
          supabase ? supabase.from('satta_differentials').select('*') : Promise.resolve(null)
        ]);
        setBrokers((brokData || []).map((b: any) => ({ ...b, brok_name: (b.broker_name || b.brok_name || '').toUpperCase() })));
        setSuppliers((suppData || []).map((s: any) => ({ ...s, supp_name: (s.supply_name || s.supp_name || '').toUpperCase() })));
        setAreas((areaData || []).map((a: any) => ({ ...a, area_name: (a.area_name || '').toUpperCase() })));
        setAgencies(agcData || []);
        setGrades(gradeData || []);
        setMarkas(markaData || []);
        let finalBaseRates = (baseRatesResult && baseRatesResult.data) ? baseRatesResult.data : [];
        if (finalBaseRates.length > 0) {
          setBaseRatesList(finalBaseRates);
          const sorted = [...finalBaseRates].sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''));
          const targetDt = formData.b_date || formData.date || today;
          const eff = sorted.find((r: any) => r.start_date <= targetDt) || sorted[0];
          if (eff && eff.base_rate) {
            setFormData(prev => ({
              ...prev,
              b_rate: prev.b_rate && prev.b_rate > 0 ? prev.b_rate : Number(eff.base_rate)
            }));
          }
        }
        if (finalBaseRates && finalBaseRates.length > 0) {
          const sorted = [...finalBaseRates].sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''));
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
        if (differentialsResult && differentialsResult.data) {
          setDbDiffsList(differentialsResult.data || []);
        }

        // Dynamic auto-increment for a new Satta entry
        if (!initialData && allSattas && allSattas.length > 0) {
          let lastNum = 152;
          allSattas.forEach((s: any) => {
            const sn = s.satta_no || '';
            const num = parseInt(sn.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num) && num > lastNum) {
              lastNum = num;
            }
          });
          const nextNum = lastNum + 1;
          const formattedNum = String(nextNum).padStart(4, '0');
          setFormData(prev => ({
            ...prev,
            satta_no: formattedNum,
            session: `BJCL/2026-2027/${formattedNum}`
          }));
        }
      } catch(e) {
        console.error("Error loading Satta masters:", e);
      }
  }

  useEffect(() => {
    loadData();
  }, []);

  useLiveAutoRefresh(loadData, [], { tables: ['satta_master', 'satta_base_rates', 'satta_differentials', 'satta_calculated_rates'] });

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

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'broker' || name === 'supplier' || name === 'challan_supplier' || name === 'area') {
      finalValue = (value || '').toUpperCase();
    }
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: finalValue
      };
      
      if (name === 'units_per_lorry_type') {
        updated.unit_type = finalValue;
      }

      // Automatically calculate total_wt_in_ton = no_of_lorries * wt_per_lorry
      if (name === 'no_of_lorries' || name === 'wt_per_lorry') {
        const lorries = name === 'no_of_lorries' ? parseFloat(value) || 0 : parseFloat(prev.no_of_lorries as any) || 0;
        const wt = name === 'wt_per_lorry' ? parseFloat(value) || 0 : parseFloat(prev.wt_per_lorry as any) || 0;
        updated.total_wt_in_ton = parseFloat((lorries * wt).toFixed(3));
      }
      
      // Auto-extract satta_no and financial_year from session input to keep them in sync
      if (name === 'session' && value) {
        const parts = value.split('/');
        if (parts.length >= 3) {
          const extractedSattaNo = parts[parts.length - 1].trim();
          const extractedFinYear = parts[parts.length - 2].trim();
          if (extractedSattaNo) updated.satta_no = extractedSattaNo;
          if (extractedFinYear) updated.financial_year = extractedFinYear;
        } else if (parts.length === 2) {
          const extractedSattaNo = parts[1].trim();
          const extractedFinYear = parts[0].trim();
          if (extractedSattaNo) updated.satta_no = extractedSattaNo;
          if (extractedFinYear) updated.financial_year = extractedFinYear;
        }
      }

      // Automatically sync session when Satta Number (satta_no) is modified
      if (name === 'satta_no' && value) {
        const cleanVal = value.trim();
        const financialYear = prev.financial_year || '2026-2027';
        if (prev.session && prev.session.includes('/')) {
          const parts = prev.session.split('/');
          parts[parts.length - 1] = cleanVal;
          updated.session = parts.join('/');
        } else {
          updated.session = `BJCL/${financialYear}/${cleanVal}`;
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

      // Automatically update quality rates if area changes
      if (name === 'area' && finalValue) {
        let firstCalculated = null;
        const updatedQD = (updated.quality_details || []).map((row: any, i: number) => {
          if (row.quality) {
            const calculatedPrice = recalculateRowRate(updated.date || today, finalValue, row.quality);
            if (calculatedPrice !== null) {
              if (i === 0) firstCalculated = calculatedPrice;
              return { ...row, rs: calculatedPrice };
            }
          }
          return row;
        });
        updated.quality_details = updatedQD;
        if (firstCalculated !== null) updated.b_rate = firstCalculated;
      }

      // Automatically update quality rates if date changes
      if (name === 'date' && finalValue && prev.area) {
        let firstCalculated = null;
        const updatedQD = (updated.quality_details || []).map((row: any, i: number) => {
          if (row.quality) {
            const calculatedPrice = recalculateRowRate(finalValue, prev.area, row.quality);
            if (calculatedPrice !== null) {
              if (i === 0) firstCalculated = calculatedPrice;
              return { ...row, rs: calculatedPrice };
            }
          }
          return row;
        });
        updated.quality_details = updatedQD;
        if (firstCalculated !== null) updated.b_rate = firstCalculated;
      }

      return updated;
    });
  };

  const handleQualityChange = (index: number, e: any) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const qd = [...(prev.quality_details || [])];
      qd[index] = { ...qd[index], [name]: value };
      
      // Auto-populate computed rate if quality/grade is selected
      if (name === 'quality' && value && prev.area) {
        const calculatedPrice = recalculateRowRate(prev.date || today, prev.area, value);
        if (calculatedPrice !== null) {
          qd[index].rs = calculatedPrice;
          if (index === 0) {
             // also update global b_rate if this is the first row
             return { ...prev, quality_details: qd, b_rate: calculatedPrice };
          }
        }
      }
      return { ...prev, quality_details: qd };
    });
  };

  const handleSave = async () => {
    if ((formData.satta_id || initialData) && !enforceEditOrDeletePermission("Edit")) {
      return;
    }
    if (!formData.satta_no) {
       alert("Satta contract number is mandatory.");
       return;
    }
    setLoading(true);
    try {
      const sattaData = { ...formData };
      
      // Secondary absolute sync for satta_no and financial_year from session right before database save
      if (sattaData.session) {
        const parts = sattaData.session.split('/');
        if (parts.length >= 3) {
          const extractedSattaNo = parts[parts.length - 1].trim();
          const extractedFinYear = parts[parts.length - 2].trim();
          if (extractedSattaNo) sattaData.satta_no = extractedSattaNo;
          if (extractedFinYear) sattaData.financial_year = extractedFinYear;
        } else if (parts.length === 2) {
          const extractedSattaNo = parts[1].trim();
          const extractedFinYear = parts[0].trim();
          if (extractedSattaNo) sattaData.satta_no = extractedSattaNo;
          if (extractedFinYear) sattaData.financial_year = extractedFinYear;
        }
      }

      // Sanitize numeric fields to prevent empty string syntax errors
      const numericFields = [
        'no_of_lorries',
        'total_unit',
        'wt_per_lorry',
        'total_wt_in_ton',
        'shipment_days',
        'shipment_penalty',
        'marks_claim',
        'quantity_claim',
        'b_rate'
      ];
      
      numericFields.forEach(field => {
        const val = (sattaData as any)[field];
        if (val === '' || val === undefined || val === null) {
          (sattaData as any)[field] = null;
        } else {
          (sattaData as any)[field] = Number(val);
        }
      });

      const dateFields = ['date', 'shipment_date', 'b_date'];
      dateFields.forEach(field => {
        const val = (sattaData as any)[field];
        if (val === '' || val === undefined) {
          (sattaData as any)[field] = null;
        }
      });

      if (!sattaData.date) {
        sattaData.date = today;
      }

      const qd = sattaData.quality_details;
      delete sattaData.quality_details;
      
      let inserted;
      let isEditMode = !!sattaData.satta_id;

      if (!sattaData.satta_id && sattaData.satta_no) {
         // Double-check if already exists
         const targetFYear = sattaData.financial_year || '2026-2027';
         const allSattas = await dbModule.fetchAll('satta_master').catch(() => []);
         const match = allSattas.find((s: any) => s.satta_no === sattaData.satta_no && s.financial_year === targetFYear);
         if (match) {
            sattaData.satta_id = match.satta_id;
            isEditMode = true;
         }
      }

      sattaData.financial_year = isEditMode
        ? (initialData?.financial_year || sattaData.financial_year || '2026-2027')
        : (sattaData.financial_year || '2026-2027');

      const sqlVal = (v: any) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return isFinite(v) ? String(v) : '0';
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        return `'${String(v).replace(/'/g, "''")}'`;
      };

      const targetSattaId = sattaData.satta_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `satta-${Date.now()}`);
      sattaData.satta_id = targetSattaId;

      try {
        const txQueries: string[] = [];
        const masterCols = Object.keys(sattaData);
        const masterVals = masterCols.map(k => sqlVal((sattaData as any)[k]));
        const updateSet = masterCols.filter(k => k !== 'satta_id').map(k => `${k} = EXCLUDED.${k}`).join(', ');
        txQueries.push(
          `INSERT INTO satta_master (${masterCols.join(', ')}) VALUES (${masterVals.join(', ')}) ON CONFLICT (satta_id) DO UPDATE SET ${updateSet};`
        );
        txQueries.push(`DELETE FROM satta_quality_details WHERE satta_id = ${sqlVal(targetSattaId)};`);
        if (qd) {
          for (const row of qd) {
            if (row.quality || row.qty || row.rs || row.marka || row.agency) {
              txQueries.push(
                `INSERT INTO satta_quality_details (satta_id, satta_no, financial_year, quality, qty, agency, marka, rs) VALUES (${sqlVal(targetSattaId)}, ${sqlVal(sattaData.satta_no)}, ${sqlVal(sattaData.financial_year)}, ${sqlVal(row.quality || '')}, ${sqlVal(Number(row.qty) || 0)}, ${sqlVal(row.agency || '')}, ${sqlVal(row.marka || '')}, ${sqlVal(Number(row.rs) || 0)});`
              );
            }
          }
        }
        await dbModule.executeTransaction(txQueries);
        inserted = { ...sattaData };
      } catch (_txErr) {
        if (isEditMode) {
          inserted = await dbModule.update('satta_master', 'satta_id', sattaData.satta_id, sattaData);
        } else {
          inserted = await dbModule.insert('satta_master', sattaData);
        }

        const resolvedSattaId = inserted?.satta_id || inserted?.id || sattaData.satta_id;
        if (qd) {
          if (isEditMode && resolvedSattaId) {
            await dbModule.delete('satta_quality_details', 'satta_id', resolvedSattaId);
          }
          for (const row of qd) {
            if (row.quality || row.qty || row.rs || row.marka || row.agency) {
              await dbModule.insert('satta_quality_details', {
                satta_id: resolvedSattaId || sattaData.satta_no,
                satta_no: sattaData.satta_no,
                financial_year: inserted?.financial_year || sattaData.financial_year,
                quality: row.quality,
                qty: Number(row.qty) || 0,
                agency: row.agency || '',
                marka: row.marka || '',
                rs: Number(row.rs) || 0
              });
            }
          }
        }
      }
      
      screenDraftService.clearDraft('satta_entry_form');
      setFormData(getInitialFormData());
      alert("Satta Trade Contract saved successfully!");
      onSave?.(sattaData);
    } catch (err: any) {
      console.error(err);
      alert("Save failed: " + (err.message || "Database error."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegacyLayout title="Satta Desk" subtitle="Satta Terminal / Market booking book" onClose={onCancel}>
      <div ref={formContainerRef} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Main Header Form */}
        <div className="grid grid-cols-12 gap-4">
           {/* Feeding Column */}
           <div className="col-span-12 flex flex-col gap-4">
              <LegacyFieldset legend="Basic Satta Details">
                 <div className="grid grid-cols-12 gap-x-4 gap-y-3 mt-1 items-center">
                    <div className="col-span-6 flex items-center gap-2">
                        <label htmlFor="session_772" className="text-[11px] font-bold w-24 shrink-0">Session</label>
                        <input  id="session_772" aria-label="Session"className="flex-1 bg-[#ffffd0] border border-gray-400 p-0.5 text-xs font-black" name="session" value={formData.session} onChange={handleChange} />
                     </div>
                     
                     <div className="col-span-6 flex items-center gap-2">
                        <label htmlFor="satta_no_777" className="text-[11px] font-bold w-24 shrink-0 text-red-950 font-extrabold uppercase bg-red-100/60 px-1 border border-red-200">Satta Booking No</label>
                        <input  id="satta_no_777" aria-label="Satta Booking No"className="flex-1 bg-[#e0ffe0] border-2 border-green-600 p-0.5 text-xs font-extrabold text-blue-950 font-mono focus:bg-white" name="satta_no" value={formData.satta_no} onChange={handleChange} placeholder="Satta Number" required />
                     </div>
                    
                     <div className="col-span-6 flex items-center gap-2">
                        <label htmlFor="po_type_782" className="text-[11px] font-bold w-24 shrink-0 text-blue-900 italic uppercase">Deal Type</label>
                        <select  id="po_type_782" aria-label="Deal Type"name="po_type" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs" value={formData.po_type} onChange={handleChange}>
                           <option>Normal</option>
                           <option>PTF</option>
                        </select>
                     </div>
                     
                     <div className="col-span-6 flex items-center gap-2">
                        <label htmlFor="date_790" className="text-[11px] font-bold w-12 shrink-0">Date</label>
                        <input  id="date_790" aria-label="Date"type="date" name="date" value={formData.date} onChange={handleChange} className="flex-1 bg-white border border-gray-400 p-0.5 text-xs outline-none" />
                     </div>

                     <ComboField label="Broker" name="broker" value={formData.broker} onChange={handleChange} options={brokers.map(b => b.brok_name)} />
                     <ComboField label="Supplier" name="supplier" value={formData.supplier} onChange={handleChange} options={suppliers.map(s => s.supp_name)} />
                     <ComboField label="Challan Supplier" name="challan_supplier" value={formData.challan_supplier} onChange={handleChange} options={suppliers.map(s => s.supp_name)} />
                     <ComboField label="Area" name="area" value={formData.area} onChange={handleChange} options={areas.map(a => a.area_name)} />

                 </div>
              </LegacyFieldset>

              <div className="grid grid-cols-12 gap-x-4">
                 <div className="col-span-12">
                    <LegacyFieldset legend="Unit & Transportation Details">
                       <div className="grid grid-cols-3 gap-x-4 gap-y-3 mt-1 items-center px-1 pb-1">
                          <div className="flex items-center gap-2">
                             <label htmlFor="no_of_lorries_807" className="text-[11px] font-bold w-24 shrink-0 text-gray-700">No. of Lorries</label>
                             <input  id="no_of_lorries_807" aria-label="No. of Lorries"type="number" name="no_of_lorries" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right animate-pulse hover:animate-none" value={formData.no_of_lorries} onChange={handleChange} />
                          </div>
                          <div className="flex items-center gap-2">
                             <label htmlFor="units_per_lorry_type_811" className="text-[11px] font-bold w-24 shrink-0 text-gray-700">Units/Lorry</label>
                             <select  id="units_per_lorry_type_811" aria-label="Units/Lorry"name="units_per_lorry_type" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs" value={formData.units_per_lorry_type} onChange={handleChange}>
                                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                             </select>
                          </div>
                          <div className="flex items-center gap-2">
                             <label htmlFor="total_unit_817" className="text-[11px] font-bold w-24 shrink-0 text-gray-700">Total Unit</label>
                             <input  id="total_unit_817" aria-label="Total Unit"type="number" name="total_unit" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right" value={formData.total_unit} onChange={handleChange} />
                          </div>
                          <div className="flex items-center gap-2">
                             <label htmlFor="wt_per_lorry_821" className="text-[11px] font-bold w-24 shrink-0 text-gray-700">Wt/Lorry</label>
                             <input  id="wt_per_lorry_821" aria-label="Wt/Lorry"type="number" name="wt_per_lorry" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right" value={formData.wt_per_lorry} onChange={handleChange} />
                          </div>
                          <div className="flex items-center gap-2">
                             <label htmlFor="unit_type_825" className="text-[11px] font-bold w-24 shrink-0 text-gray-700">Unit Type</label>
                             <select  id="unit_type_825" aria-label="Unit Type"name="unit_type" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs" value={formData.unit_type} onChange={handleChange}>
                                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                             </select>
                          </div>
                          <div className="flex items-center gap-2">
                             <label htmlFor="total_wt_in_ton_831" className="text-[11px] font-bold w-24 shrink-0 text-gray-700">Total Wt. in Ton</label>
                             <input  id="total_wt_in_ton_831" aria-label="Total Wt. in Ton"type="number" name="total_wt_in_ton" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right text-purple-900 font-bold" value={formData.total_wt_in_ton} onChange={handleChange} />
                          </div>
                       </div>
                    </LegacyFieldset>
                 </div>
              </div>
              
              <LegacyFieldset legend="Quality Details">
                 <div className="grid grid-cols-12 gap-2 border-b border-gray-400 bg-gray-200 p-1">
                    <div className="col-span-3 text-[10px] font-bold uppercase text-center">Quality</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase text-center">Qty</div>
                    <div className="col-span-3 text-[10px] font-bold uppercase text-center">Agency</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase text-center">Marka</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase text-center">Rs. (Rate)</div>
                 </div>
                 {formData.quality_details?.map((qd, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 mt-1 items-center">
                       <div className="col-span-3">
                          <select  id="quality_849" aria-label="quality"
                            name="quality" 
                            className="w-full bg-white border border-gray-400 p-0.5 text-xs font-bold" 
                            value={grades.find(g => {
                              const clean = (s) => (s || '').trim().replace(/\.$/, '').toUpperCase();
                              return clean(g.grade_name) === clean(qd.quality) || clean(g.grade_code) === clean(qd.quality);
                            })?.grade_name || qd.quality || ''} 
                            onChange={(e) => handleQualityChange(i, e)}
                          >
                            <option value="">--Select Quality--</option>
                            {qd.quality && !grades.some(g => {
                              const clean = (s) => (s || '').trim().replace(/\.$/, '').toUpperCase();
                              return clean(g.grade_name) === clean(qd.quality) || clean(g.grade_code) === clean(qd.quality);
                            }) && (
                              <option value={qd.quality}>{qd.quality}</option>
                            )}
                             {grades.map(g => <option key={g.grade_code || g.grade_name} value={g.grade_name}>{g.grade_name}</option>)}
                          </select>
                       </div>
                       <div className="col-span-2">
                          <input  id="qty_869" aria-label="Qty"type="number" name="qty" className="w-full bg-white border border-gray-400 p-0.5 text-xs text-right" value={qd.qty || ''} onChange={(e) => handleQualityChange(i, e)} placeholder="Qty" />
                       </div>
                       <div className="col-span-3">
                          <input  id="agency_872" aria-label="Agency"
                             type="text" 
                             name="agency" 
                             className="w-full bg-white border border-gray-400 p-0.5 text-xs font-bold uppercase" 
                             value={qd.agency || ''} 
                             onChange={(e) => handleQualityChange(i, e)} 
                             list="agency_card_list"
                             placeholder="Agency" 
                          />
                       </div>
                       <div className="col-span-2">
                          <input  id="marka_883" aria-label="Marka"
                             type="text" 
                             name="marka" 
                             className="w-full bg-white border border-gray-400 p-0.5 text-xs font-bold uppercase" 
                             value={qd.marka || ''} 
                             onChange={(e) => handleQualityChange(i, e)} 
                             list="marka_list_options"
                             placeholder="Marka" 
                          />
                       </div>
                       <div className="col-span-2">
                          <input  id="rs_894" aria-label="Rate"type="number" name="rs" className="w-full bg-white border border-gray-400 p-0.5 text-xs text-right" value={qd.rs || ''} onChange={(e) => handleQualityChange(i, e)} placeholder="Rate" />
                       </div>
                    </div>
                 ))}
                 <datalist id="marka_list_options">
                    {markas.map((m: any, idx: number) => (
                       <option key={idx} value={m.marka_name} />
                    ))}
                  </datalist>
                  <datalist id="agency_card_list">
                     {agencies.map((a: any, idx: number) => (
                        <option key={idx} value={a.agency_name} />
                     ))}
                  </datalist>
              </LegacyFieldset>

              <LegacyFieldset legend="Shipment & Claims">
                 <div className="grid grid-cols-12 gap-x-4 gap-y-3 mt-1 items-center">
                    <div className="col-span-4 flex items-center gap-2">
                       <label htmlFor="shipment_date_914" className="text-[11px] font-bold w-24 shrink-0">Shipment</label>
                       <input  id="shipment_date_914" aria-label="Shipment"type="date" name="shipment_date" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs" value={formData.shipment_date} onChange={handleChange} />
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                       <label htmlFor="shipment_days_918" className="text-[11px] font-bold w-12 shrink-0">Days</label>
                       <input  id="shipment_days_918" aria-label="Days"type="number" name="shipment_days" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right" value={formData.shipment_days} onChange={handleChange} />
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                       <label htmlFor="shipment_penalty_922" className="text-[11px] font-bold w-16 shrink-0">Penalty/Day</label>
                       <input  id="shipment_penalty_922" aria-label="Penalty/Day"type="number" name="shipment_penalty" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right" value={formData.shipment_penalty} onChange={handleChange} />
                    </div>

                    <div className="col-span-6 flex items-center gap-2">
                       <label htmlFor="marks_claim_927" className="text-[11px] font-bold w-24 shrink-0">Marks Claim</label>
                       <input  id="marks_claim_927" aria-label="Marks Claim"type="number" name="marks_claim" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right" value={formData.marks_claim} onChange={handleChange} />
                    </div>
                    <div className="col-span-6 flex items-center gap-2">
                       <label htmlFor="quantity_claim_931" className="text-[11px] font-bold w-24 shrink-0">Quantity Claim</label>
                       <input  id="quantity_claim_931" aria-label="Quantity Claim"type="number" name="quantity_claim" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right" value={formData.quantity_claim} onChange={handleChange} />
                    </div>
                 </div>
              </LegacyFieldset>

              <LegacyFieldset legend="Remarks & Finalisation">
                 <div className="grid grid-cols-12 gap-x-4 gap-y-3 mt-1 items-center">
                    <div className="col-span-12 flex flex-col gap-2">
                       <label htmlFor="remarks_940" className="text-[11px] font-bold text-gray-700">Remarks</label>
                       <textarea  id="remarks_940" aria-label="Remarks"name="remarks" className="w-full bg-white border border-gray-400 p-1 text-xs outline-none" rows={2} value={formData.remarks} onChange={handleChange} />
                    </div>
                    
                    <div className="col-span-6 flex items-center gap-2">
                       <label htmlFor="b_rate_945" className="text-[11px] font-bold w-24 shrink-0">B. Rate (Rs.)</label>
                       <input  id="b_rate_945" aria-label="B. Rate (Rs.)"type="number" name="b_rate" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs text-right text-red-700 font-bold" value={formData.b_rate} onChange={handleChange} />
                    </div>
                    <div className="col-span-6 flex items-center gap-2">
                       <label htmlFor="b_date_949" className="text-[11px] font-bold w-24 shrink-0">B. Date</label>
                       <input  id="b_date_949" aria-label="B. Date"type="date" name="b_date" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs" value={formData.b_date} onChange={handleChange} />
                    </div>

                    <div className="col-span-6 flex items-center gap-2">
                       <label htmlFor="superior_normal_marks_954" className="text-[11px] font-bold w-24 shrink-0">Superior/Normal</label>
                       <input  id="superior_normal_marks_954" aria-label="Superior/Normal"type="text" name="superior_normal_marks" className="flex-1 bg-white border border-gray-400 p-0.5 text-xs" value={formData.superior_normal_marks} onChange={handleChange} />
                    </div>
                 </div>
              </LegacyFieldset>
           </div>
        </div>

        {/* Footer Ribbon */}
        <div className="flex bg-[#FBCFCB] p-1 border border-black/20 gap-1 mt-2">
           <div className="flex-1" />
           <LegacyButton icon={X} label="Back (Esc)" onClick={onCancel} />
           <LegacyButton icon={Save} label={loading ? "SAVING..." : "SAVE SATTA"} active={!loading} onClick={handleSave} />
        </div>
      </div>
    </LegacyLayout>
  );
}

function ComboField({ label, name, value, onChange, options }: any) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.focus();
      try {
        if (typeof (inputRef.current as any).showPicker === 'function') {
          (inputRef.current as any).showPicker();
        }
      } catch (err) {
        console.warn('showPicker not supported or failed', err);
      }
    }
  };

  return (
    <div className="col-span-12 flex items-center gap-2 relative">
       <label className="text-[11px] font-bold w-24 shrink-0">{label}</label>
       <div className="flex-1 flex gap-px border border-gray-400 bg-white">
          <input  id="value_993" aria-label="value"
             ref={inputRef}
             name={name}
             value={value}
             onChange={onChange}
             list={`${name}_list`}
             className="flex-1 text-xs px-2 py-0.5 outline-none font-bold uppercase" 
             placeholder={`SELECT OR TYPE ${label.toUpperCase()}...`} 
          />
          <datalist id={`${name}_list`}>
             {options?.map((opt: string, i: number) => <option key={i} value={opt} />)}
          </datalist>
          <button 
             type="button"
             tabIndex={-1}
             onClick={handleButtonClick}
             className="bg-[#FBCFCB] px-2 border-l border-gray-400 hover:bg-white"
          >
             <ChevronDown className="h-4 w-4" />
          </button>
       </div>
    </div>
  )
}
