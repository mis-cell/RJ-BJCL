import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  MessageCircle,
  MoreVertical,
  ChevronRight,
  UserPlus,
  Filter,
  FileText,
  Printer,
  Edit,
  Trash2,
  PhoneCall,
  History,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { dbModule } from '../services/dbModule';
import LegacyLayout, { LegacyFieldset, LegacyButton } from '../components/LegacyLayout';

interface DirectoryItem {
  id: string;
  name: string;
  subtext: string;
  village: string;
  mobile: string;
}

interface DirectoryViewProps {
  title: string;
  type: 'kisan' | 'vyapari';
  onClose?: () => void;
}

export default function DirectoryView({ title, type, onClose }: DirectoryViewProps) {
  const [searchTerm, setSearchSearchTerm] = useState('');
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      if (type === 'vyapari') {
        // In this system, vyapari are stored in user_master with role 'VYAPARI' or simply all users
        const users = await dbModule.fetchAll('user_master');
        const mapped: DirectoryItem[] = users.map((u: any) => ({
          id: u.user_id.toString(),
          name: u.username || 'UNNAMED',
          subtext: u.role || 'Member',
          village: 'Main Station',
          mobile: '91-000-000'
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Directory Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [type]);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.village.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <LegacyLayout title="P.O Automation" subtitle={`${title} Index Directory`} onClose={onClose}>
      <div className="space-y-4">
        {/* Header Ribbon / Action Bar */}
        <div className="flex bg-[#FBCFCB] p-1 border border-black/20 gap-2 items-center">
           <div className="flex bg-white border border-gray-400 p-px flex-1 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)]">
              <input  id="searchterm_84" name="searchterm" aria-label="searchterm"
                 className="flex-1 text-xs px-2 py-1 outline-none font-bold" 
                 placeholder={`Search ${type === 'kisan' ? 'Farmers' : 'Traders'} by name, village...`}
                 value={searchTerm}
                 onChange={(e) => setSearchSearchTerm(e.target.value)}
              />
              
           </div>
           <div className="flex gap-1 h-full">
              <LegacyButton icon={UserPlus} label="New Record" active />
              <LegacyButton icon={Printer} label="Mailing List" />
              <LegacyButton icon={FileText} label="Export Data" />
           </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredItems.map((item) => (
              <div 
                key={item.id}
                className="bg-[#FBCFCB] border-2 border-white shadow-[3px_3px_0_0_rgba(0,0,0,0.5)] p-0.5 group hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] transition-all cursor-default"
              >
                 <div className="bg-blue-800 text-white px-2 py-0.5 flex justify-between items-center h-6">
                    <span className="text-[10px] font-bold uppercase tracking-tight italic">ID: {item.id}</span>
                    <MoreVertical className="h-3 w-3" />
                 </div>
                 <div className="bg-white p-3 border-t border-[#808080]/30 min-h-[160px] flex flex-col justify-between">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                          <div className={cn("h-10 w-10 border border-gray-400 flex items-center justify-center bg-gray-50", type === 'kisan' ? "text-green-800" : "text-orange-800")}>
                             {type === 'kisan' ? <Users className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                          </div>
                          <div className="overflow-hidden">
                             <h4 className="text-sm font-black text-slate-800 uppercase leading-none truncate mb-1">{item.name}</h4>
                             <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter truncate italic">{item.subtext}</p>
                          </div>
                       </div>

                       <div className="pt-2 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                             <MapPin className="h-3 w-3 text-red-700" />
                             <span className="text-[10px] font-bold italic uppercase">{item.village}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                             <Phone className="h-3 w-3 text-blue-800" />
                             <span className="text-[11px] font-black font-mono tracking-tighter tabular-nums">{item.mobile}</span>
                          </div>
                       </div>
                    </div>

                    <div className="mt-4 flex gap-1 border-t border-dashed border-gray-200 pt-3">
                       <button className="flex-1 bg-[#FBCFCB] border border-white shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] py-1.5 text-[10px] font-bold uppercase active:shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.5)] flex items-center justify-center gap-1 group/btn transition-all">
                          <History className="h-3 w-3 group-hover/btn:text-blue-800" /> LEDGER
                       </button>
                       <button className="w-10 bg-blue-800 border border-white shadow-[1px_1px_0_0_rgba(0,0,0,0.5)] flex items-center justify-center text-white active:shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.5)] transition-all">
                          <ChevronRight className="h-4 w-4" />
                       </button>
                    </div>
                 </div>
              </div>
           ))}
        </div>

        {filteredItems.length === 0 && (
           <div className="h-64 flex flex-col items-center justify-center bg-white border border-gray-400 p-8">
              <Search className="h-12 w-12 text-gray-200 mb-4" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic leading-relaxed">No matching records found in the current directory.</p>
           </div>
        )}

        {/* Footer Statistics */}
        <div className="bg-[#808080] p-1 flex justify-between gap-px border border-black/10">
           <div className="bg-white px-3 py-1 border border-gray-400">
              <span className="text-[8px] font-bold text-gray-400 uppercase leading-none block">Total Registry</span>
              <span className="text-xs font-black italic">{items.length} Records</span>
           </div>
           <div className="bg-white/90 px-3 py-1 border border-gray-400 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-green-700" />
              <span className="text-[9px] font-bold uppercase italic text-gray-600 tracking-widest">Database Sync Active</span>
           </div>
        </div>
      </div>
    </LegacyLayout>
  );
}
