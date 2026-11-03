import React from 'react';
import { User, X } from 'lucide-react';
import { LegacyFieldset } from '../LegacyLayout';
import { getCurrentUserContext } from '../../lib/permissions';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfileData: any;
  newPassword: string;
  setNewPassword: (val: string) => void;
  updatePasswordSuccess: string;
  onUpdatePassword: () => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  userProfileData,
  newPassword,
  setNewPassword,
  updatePasswordSuccess,
  onUpdatePassword
}: UserProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-legacy-bg border-2 border-white shadow-2xl w-full max-w-md flex flex-col">
        <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 border-b border-indigo-400 p-2 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-300" />
            <span className="text-xs font-black uppercase tracking-widest">User Profile Console</span>
          </div>
          <button
            onClick={onClose}
            className="bg-rose-600 hover:bg-rose-500 text-white w-5 h-5 flex items-center justify-center border border-white/20 shadow-sm cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <LegacyFieldset legend="System Account Info">
            <div className="space-y-2 text-xs font-mono font-bold text-slate-700">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span>USER ID:</span>
                <span className="text-indigo-900">{userProfileData?.user_id || '---'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span>USERNAME:</span>
                <span className="text-indigo-900 uppercase">{userProfileData?.username || getCurrentUserContext().username}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span>ROLE:</span>
                <span className="text-indigo-900">{userProfileData?.role || '---'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span>LEVEL:</span>
                <span className="text-indigo-900">{userProfileData?.level || '---'}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>LAST LOGIN:</span>
                <span className="text-indigo-900">{userProfileData?.last_login ? new Date(userProfileData.last_login).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </LegacyFieldset>
          <LegacyFieldset legend="Security & Password">
            <div className="space-y-3">
              <div>
                <label htmlFor="modal_new_password" className="text-[10px] font-black uppercase text-indigo-900 mb-1 block">New Password</label>
                <input
                  id="modal_new_password"
                  name="modal_new_password"
                  aria-label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-8 px-2 border border-slate-300 font-mono text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter new password"
                />
              </div>
              {updatePasswordSuccess && (
                <p className="text-[10px] text-emerald-600 font-bold">{updatePasswordSuccess}</p>
              )}
              <button
                onClick={onUpdatePassword}
                className="bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold uppercase tracking-wider text-[10px] px-4 h-8 w-full border border-white shadow-[1px_1px_0_0_black] cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </LegacyFieldset>
        </div>
      </div>
    </div>
  );
}
