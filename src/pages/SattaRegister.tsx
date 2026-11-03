import React, { useState, useEffect } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import Papa from 'papaparse';
import { 
  HandCoins, 
  Search, 
  Download, 
  Plus, 
  X, 
  RefreshCcw, 
  Edit, 
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { cn, sanitizeCsvData } from '../lib/utils';
import LegacyLayout, { LegacyFieldset, LegacyButton } from '../components/LegacyLayout';
import SattaEntry from './SattaEntry';
import SattaChart from './SattaChart';
import { dbModule } from '../services/dbModule';
import { supabase } from '../lib/supabase';
import { Satta } from '../types';
import { enforceEditOrDeletePermission } from '../lib/permissions';

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

export default function SattaRegister({ onClose, onNew, onViewChart }: { onClose?: () => void; onNew?: () => void; onViewChart?: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sattaList, setSattaList] = useState<Satta[]>([]);
  const [editingSatta, setEditingSatta] = useState<Satta | null>(null);
  const [selectedSattaId, setSelectedSattaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBaseRate, setCurrentBaseRate] = useState<number | null>(null);
  const [currentBaseRateDate, setCurrentBaseRateDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'ledger'>('chart');

  const fetchSattaData = async () => {
    setIsLoading(true);
    try {
      const data = await dbModule.fetchAll('satta_master', 'created_at', false);
      setSattaList(data || []);
      
      if (supabase) {
        const { data: baseRates } = await supabase
          .from('satta_base_rates')
          .select('*')
          .order('start_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);

        if (baseRates && baseRates.length > 0) {
          setCurrentBaseRate(Number(baseRates[0].base_rate));
          setCurrentBaseRateDate(baseRates[0].start_date);
        }
      }
    } catch (e) {
      console.error('Error fetching satta master:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useLiveAutoRefresh(fetchSattaData, [], { tables: ['satta_master'] });

  useEffect(() => {
    fetchSattaData();
  }, []);

  const handleEditSatta = async (satta: Satta) => {
    if (!enforceEditOrDeletePermission("Edit")) return;
    setIsLoading(true);
    try {
      if (supabase && satta.satta_id) {
        const { data, error } = await supabase
          .from('satta_quality_details')
          .select('*')
          .eq('satta_id', satta.satta_id);
        
        if (error) throw error;
        
        const sorted = (data || []).sort((a: any, b: any) => compareQualities(a.quality || '', b.quality || ''));
        satta.quality_details = sorted;
      }
    } catch (e) {
      console.error("Could not fetch Satta details", e);
    } finally {
      setIsLoading(false);
    }
    setEditingSatta(satta);
  };

  const handleDelete = async (id: string) => {
    if (!enforceEditOrDeletePermission("Delete")) return;

    if (!window.confirm('Are you sure you want to delete this Satta record?')) return;
    try {
      if (supabase) {
        await supabase.from('satta_quality_details').delete().eq('satta_id', id);
      }
      await dbModule.delete('satta_master', 'satta_id', id);
      alert("Satta record deleted permanently.");
      await fetchSattaData();
    } catch (err: any) {
      console.error("Delete Satta error:", err);
      alert('Error deleting Satta entry: ' + (err.message || err));
    }
  };

  const handleCsvDownload = () => {
    const sanitizedData = sanitizeCsvData(sattaList);
    const csv = Papa.unparse(sanitizedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Satta_Register_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = sattaList.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      (s.satta_no || '').toLowerCase().includes(term) ||
      (s.broker || '').toLowerCase().includes(term) ||
      (s.supplier || '').toLowerCase().includes(term) ||
      (s.area || '').toLowerCase().includes(term)
    );
  });

  if (editingSatta) {
    return (
      <SattaEntry 
        initialData={editingSatta} 
        onCancel={() => setEditingSatta(null)} 
        onSave={() => {
          setEditingSatta(null);
          fetchSattaData();
        }} 
      />
    );
  }

  return (
    <LegacyLayout title="Satta Desk" subtitle="Satta Terminal & Chart Registry">
      <div className="space-y-4">
        <SattaChart isEmbedded={true} onClose={onClose} />
      </div>
    </LegacyLayout>
  );
}
