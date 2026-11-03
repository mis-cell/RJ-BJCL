import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dbModule } from '../../services/dbModule';

interface AdminDeskLoginModalProps {
  onSuccess: () => void;
  onLogin?: () => void;
}

export const AdminDeskLoginModal: React.FC<AdminDeskLoginModalProps> = ({
  onSuccess,
  onLogin
}) => {
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleLogin = async () => {
    const cleanUser = loginUser.trim();
    const cleanPass = loginPass.trim();

    if (!cleanUser || !cleanPass) {
      setError('PLEASE ENTER BOTH OPERATOR ID AND PASSWORD.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      let matchedUser: any = null;

      if (supabase) {
        const { data } = await supabase
          .from('user_master')
          .select('*')
          .or(`user_id.ilike.${cleanUser},username.ilike.${cleanUser}`)
          .limit(1)
          .maybeSingle();

        if (data) matchedUser = data;
      }

      if (!matchedUser) {
        const localUsers = await dbModule.fetchAll('user_master').catch(() => []);
        if (Array.isArray(localUsers)) {
          matchedUser = localUsers.find((u: any) =>
            String(u.user_id || '').trim().toLowerCase() === cleanUser.toLowerCase() ||
            String(u.username || '').trim().toLowerCase() === cleanUser.toLowerCase()
          );
        }
      }

      if (matchedUser) {
        const role = String(matchedUser.role || '').toUpperCase();
        const level = String(matchedUser.level || '').toUpperCase();
        const isAdminPrivileged = role === 'ADMIN' || role === 'ADMINISTRATOR' || level === 'ADMIN' || level === 'L5';

        if (!isAdminPrivileged) {
          setError('AUTHENTICATION DENIED: ADMIN PRIVILEGES REQUIRED.');
          setIsVerifying(false);
          return;
        }

        if (String(matchedUser.password || '') === cleanPass) {
          onSuccess();
          if (onLogin) onLogin();
          setIsVerifying(false);
          return;
        } else {
          setError('AUTHENTICATION DENIED: INVALID PASSWORD.');
          setIsVerifying(false);
          return;
        }
      }

      // Fallback for Master Admin
      if (cleanUser.toUpperCase() === 'ADMIN') {
        if (cleanPass === 'Admin@1234' || cleanPass === 'Admin@4321' || cleanPass === 'ADMIN') {
          onSuccess();
          if (onLogin) onLogin();
          setIsVerifying(false);
          return;
        }
      }

      setError('AUTHENTICATION DENIED: INVALID SYSTEM CREDENTIALS.');
    } catch (err) {
      console.error(err);
      setError('AUTHENTICATION FAULT: PLEASE RETRY.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#FBCFCB] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-[#E8E6E1] border-t-white border-l-white border-b-slate-800 border-r-slate-800 border-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">
        <div className="bg-[#D94B5A] text-white px-2 py-1 flex justify-between items-center h-8">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Admin Master Lock</span>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-indigo-950 italic">Administrative Vault</h2>
            <p className="text-[9px] font-extrabold text-[#D94B5A] uppercase tracking-widest leading-none">Console Override</p>
          </div>
          {error && <div className="p-2 border border-rose-300 bg-rose-50 text-rose-800 text-[10px] uppercase font-bold text-center">{error}</div>}
          <div className="space-y-4">
            <input
              id="operator_id_input"
              name="operator_id"
              aria-label="Operator ID"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              className="w-full bg-white border border-slate-300 p-2 text-sm uppercase outline-none placeholder:text-slate-300 font-bold"
              placeholder="Operator ID"
            />
            <input
              id="password_input"
              name="password"
              aria-label="Password"
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full bg-white border border-slate-300 p-2 text-sm outline-none placeholder:text-slate-300 font-bold"
              placeholder="Password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin();
              }}
            />
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-[#D94B5A] text-white font-black uppercase text-[11px] tracking-[0.2em] cursor-pointer hover:bg-blue-900 transition active:scale-95"
            >
              DESTRUCT CRITICAL OVERRIDE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
