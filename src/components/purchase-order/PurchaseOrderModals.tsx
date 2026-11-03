import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Trash2,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  AlertTriangle,
  Edit,
  Lock,
  Unlock,
  Ban,
  Printer,
  Scale,
  Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { isUserAdmin, isL5OrAdmin, getCurrentUserContext } from '../../lib/permissions';

export interface ActionMenuState {
  x: number;
  y: number;
  item: any;
}

export interface EmailNotificationState {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'info' | 'default';
  resolve: (value: boolean) => void;
}

// 1. Action Menu Portal
export const PoActionMenuPortal: React.FC<{
  actionMenu: ActionMenuState | null;
  onClose: () => void;
  onSendMail: (item: any) => void;
  onDelete: (poNo: string) => void;
  onCancelPo?: (item: any) => void;
  onViewEdit?: (item: any) => void;
  onPrint?: (item: any) => void;
  onForceClose?: (item: any) => void;
  onReopen?: (item: any) => void;
  onViewAudit?: (item: any) => void;
  onWeightModal?: (item: any) => void;
}> = ({
  actionMenu,
  onClose,
  onSendMail,
  onDelete,
  onCancelPo,
  onViewEdit,
  onPrint,
  onForceClose,
  onReopen,
  onViewAudit,
  onWeightModal
}) => {
  if (!actionMenu) return null;

  const userCtx = getCurrentUserContext();
  const userRole = String(userCtx?.userRole || (userCtx as any)?.role || '').toUpperCase();
  const userLevel = String(userCtx?.userLevel || (userCtx as any)?.level || '').toUpperCase();
  const isAdminOrL4 = isUserAdmin(userCtx) || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || 
                       isL5OrAdmin() || userLevel === 'L4' || userLevel === 'L5' || userLevel === 'MAX' || 
                       Boolean((userCtx as any)?.isAdmin);
  const isUserId2 = String(userCtx?.userId) === '2';

  const item = actionMenu.item;
  const isCancelled = item.status === 'cancelled';
  const contractLorries = item.contract_lorries || item.total_no_of_lorries || 1;
  const receivedLorries = item.received_lorries || 0;
  const isClosed = !item.is_reopened && Boolean(
    item.is_closed ||
    item.status === 'closed' ||
    (contractLorries > 0 && receivedLorries >= contractLorries)
  );
  const editDisabled = isUserId2 || (isClosed && !isAdminOrL4);

  const menuTop = Math.min(actionMenu.y + 4, window.innerHeight - 320);
  const menuLeft = Math.max(8, Math.min(actionMenu.x - 196, window.innerWidth - 224));

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
      <div
        className="fixed z-[1000] bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 text-xs w-52 animate-in fade-in zoom-in-95 duration-100"
        style={{ top: Math.max(8, menuTop), left: menuLeft }}
      >
        {/* View Details / Edit */}
        {onViewEdit && (
          <button
            onClick={() => {
              if (editDisabled) return;
              onClose();
              onViewEdit(item);
            }}
            disabled={editDisabled}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 font-bold text-xs transition-colors",
              editDisabled
                ? "opacity-40 cursor-not-allowed text-slate-400"
                : "hover:bg-slate-100 text-slate-800 cursor-pointer"
            )}
            title={
              isUserId2
                ? "Restricted for User ID 2"
                : editDisabled
                ? "CLOSED: Only Level 4 / Admin can Reopen to edit"
                : "View Details & Edit Contract"
            }
          >
            <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>View Details / Edit</span>
          </button>
        )}

        {/* Print P.O */}
        {onPrint && (
          <button
            onClick={() => {
              onClose();
              onPrint(item);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Print P.O</span>
          </button>
        )}

        {/* Weight Tolerance & Settlement */}
        {onWeightModal && (
          <button
            onClick={() => {
              onClose();
              onWeightModal(item);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Weight Settlement</span>
          </button>
        )}

        {/* Force Close / Reopen (moved from Lorry Status column to save table space) */}
        {(onForceClose || onReopen) && (
          <>
            <div className="border-t border-slate-100 my-1" />
            {!isClosed && onForceClose && (
              <button
                onClick={() => {
                  if (!isAdminOrL4) return;
                  onClose();
                  onForceClose(item);
                }}
                disabled={!isAdminOrL4}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 font-bold text-xs transition-colors",
                  isAdminOrL4
                    ? "hover:bg-amber-50 text-amber-800 cursor-pointer"
                    : "opacity-40 cursor-not-allowed text-slate-400"
                )}
                title={isAdminOrL4 ? "Manually Close this P.O with remarks" : "Only Level 4 or Admin can manually close a P.O"}
              >
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Force Close P.O</span>
              </button>
            )}
            {isClosed && onReopen && (
              <button
                onClick={() => {
                  if (!isAdminOrL4) return;
                  onClose();
                  onReopen(item);
                }}
                disabled={!isAdminOrL4}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 font-bold text-xs transition-colors",
                  isAdminOrL4
                    ? "hover:bg-indigo-50 text-indigo-700 cursor-pointer"
                    : "opacity-40 cursor-not-allowed text-slate-400"
                )}
                title={isAdminOrL4 ? "Reopen this Closed P.O with remarks" : "Only Level 4 or Admin can reopen a Closed P.O"}
              >
                <Unlock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Reopen P.O</span>
              </button>
            )}
            {item.open_remarks && onViewAudit && (
              <button
                onClick={() => {
                  onClose();
                  onViewAudit(item);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex items-center gap-2.5 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Reopen Audit Log</span>
              </button>
            )}
          </>
        )}

        <div className="border-t border-slate-100 my-1" />

        {/* Email */}
        <button
          onClick={() => {
            onClose();
            onSendMail(item);
          }}
          className="w-full text-left px-3 py-2 hover:bg-indigo-50/70 rounded-lg flex items-center gap-2.5 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
        >
          <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Email P.O</span>
        </button>

        {/* Level 4 & Admin: Cancel Sauda / Restore Sauda Action Button */}
        {isAdminOrL4 && (
          <>
            <button
              onClick={() => {
                onClose();
                onCancelPo?.(item);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 font-bold text-xs transition-colors cursor-pointer",
                isCancelled
                  ? "hover:bg-emerald-50 text-emerald-700"
                  : "hover:bg-amber-50 text-amber-900"
              )}
              title={isCancelled ? "Restore this cancelled Sauda" : "Cancel this Sauda (Level 4 / Admin only)"}
            >
              {isCancelled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Restore Sauda</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Cancel Sauda</span>
                </>
              )}
            </button>
          </>
        )}

        <div className="border-t border-slate-100 my-1" />
        <button
          onClick={() => {
            const po = item.po_no;
            onClose();
            onDelete(po);
          }}
          disabled={!isUserAdmin() && !isL5OrAdmin()}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 font-bold text-xs transition-colors cursor-pointer",
            !isUserAdmin() && !isL5OrAdmin()
              ? "opacity-40 cursor-not-allowed text-slate-400"
              : "hover:bg-rose-50 text-rose-700"
          )}
          title={!isUserAdmin() && !isL5OrAdmin() ? "Admin permission required to delete Sauda records" : "Delete Sauda record"}
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Delete</span>
        </button>
      </div>
    </>,
    document.body
  );
};

// 2. Email / Action Toast Notification
export const PoEmailToastNotification: React.FC<{
  notification: EmailNotificationState | null;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  if (!notification) return null;

  return createPortal(
    <div className="fixed top-6 right-6 z-[2000] flex items-start gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xl max-w-sm animate-in fade-in slide-in-from-top-4 duration-200">
      <div
        className={cn(
          "p-2 rounded-xl shrink-0 mt-0.5",
          notification.type === 'success' ? "bg-emerald-100 text-emerald-700" :
          notification.type === 'warning' ? "bg-amber-100 text-amber-800" :
          notification.type === 'info' ? "bg-blue-100 text-blue-800" :
          "bg-rose-100 text-rose-700"
        )}
      >
        {notification.type === 'success' ? (
          <Check className="w-5 h-5" />
        ) : notification.type === 'info' ? (
          <Clock className="w-5 h-5" />
        ) : (
          <AlertCircle className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 pr-2">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
          {notification.title}
        </h4>
        <p className="text-[11px] font-medium text-slate-600 mt-0.5 leading-relaxed">
          {notification.message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body
  );
};

// 3. Confirm Modal
export const GlobalConfirmModal: React.FC<{
  confirmState: ConfirmDialogState | null;
  onDismiss: () => void;
}> = ({ confirmState, onDismiss }) => {
  if (!confirmState) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => {
        confirmState.resolve(false);
        onDismiss();
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "px-5 py-3 flex items-center gap-2 text-white",
            confirmState.tone === 'danger'
              ? 'bg-gradient-to-r from-rose-600 to-red-700'
              : 'bg-gradient-to-r from-indigo-600 to-blue-700'
          )}
        >
          {confirmState.tone === 'danger' ? (
            <Trash2 className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span className="font-black text-sm uppercase tracking-wide">{confirmState.title}</span>
        </div>
        <div className="px-5 py-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
          {confirmState.message}
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={() => {
              confirmState.resolve(false);
              onDismiss();
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              confirmState.resolve(true);
              onDismiss();
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black text-white shadow transition",
              confirmState.tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            )}
          >
            {confirmState.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 4. Reopen Success Info & Change Delivery Date Modal
export const ReopenSuccessModal: React.FC<{
  info: { po: any; openRemarks: any } | null;
  onClose: () => void;
  onEditNow: (po: any) => void;
  onRefresh?: () => void;
}> = ({ info, onClose, onEditNow, onRefresh }) => {
  const [deliveryFrom, setDeliveryFrom] = React.useState('');
  const [deliveryTo, setDeliveryTo] = React.useState('');
  const [graceDays, setGraceDays] = React.useState('0');
  const [isSavingDate, setIsSavingDate] = React.useState(false);
  const [dateSavedSuccess, setDateSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    if (info?.po) {
      const todayStr = new Date().toISOString().split('T')[0];
      const cleanPoKey = String(info.po.po_no || '').trim().toUpperCase();
      let cachedDates: any = null;
      try {
        const raw = localStorage.getItem(`sauda_delivery_dates_${cleanPoKey}`);
        if (raw) cachedDates = JSON.parse(raw);
      } catch (e) {}

      setDeliveryFrom(
        cachedDates?.delivery_from ||
        info.po.delivery_from ||
        info.po.shipment_date ||
        info.po.po_date ||
        info.po.date ||
        todayStr
      );
      setDeliveryTo(
        cachedDates?.delivery_to ||
        info.po.delivery_to ||
        info.po.shipment_date ||
        info.po.delivery_from ||
        todayStr
      );
      setGraceDays(
        String(
          cachedDates?.grace_days ??
          info.po.grace_days ??
          info.po.shipment_days ??
          0
        )
      );
      setDateSavedSuccess(false);
    }
  }, [info]);

  if (!info) return null;

  const handleSaveDeliveryDate = async () => {
    setIsSavingDate(true);
    setDateSavedSuccess(false);
    try {
      const { dbModule } = await import('../../services/dbModule');
      const { supabase } = await import('../../lib/supabase');
      const poNo = info.po.po_no;
      const saudaNo = info.po.sauda_no || info.po.contract_po_no || poNo;
      const cleanPoKey = String(poNo || '').trim().toUpperCase();
      const cleanSaudaKey = String(saudaNo || '').trim().toUpperCase();
      const parsedGrace = parseInt(graceDays, 10) || 0;

      const dateCachePayload = {
        delivery_from: deliveryFrom || null,
        delivery_to: deliveryTo || null,
        shipment_date: deliveryTo || deliveryFrom || null,
        grace_days: parsedGrace,
        shipment_days: parsedGrace,
        updated_at: new Date().toISOString()
      };

      if (cleanPoKey) {
        localStorage.setItem(`sauda_delivery_dates_${cleanPoKey}`, JSON.stringify(dateCachePayload));
        localStorage.setItem(`sauda_reopened_${cleanPoKey}`, 'true');
        localStorage.removeItem(`sauda_closed_${cleanPoKey}`);
      }
      if (cleanSaudaKey) {
        localStorage.setItem(`sauda_delivery_dates_${cleanSaudaKey}`, JSON.stringify(dateCachePayload));
        localStorage.setItem(`sauda_reopened_${cleanSaudaKey}`, 'true');
        localStorage.removeItem(`sauda_closed_${cleanSaudaKey}`);
      }

      const updateData = {
        delivery_from: deliveryFrom || null,
        delivery_to: deliveryTo || null,
        shipment_date: deliveryTo || deliveryFrom || null,
        grace_days: parsedGrace,
        shipment_days: parsedGrace,
        is_closed: false,
        is_reopened: true,
        pending: true,
        status: 'open',
        open_remarks: info.openRemarks
      };

      await dbModule.update('sauda_check_point', 'po_no', poNo, updateData).catch(() => {});
      await dbModule.update('purchase_master', 'po_no', poNo, updateData).catch(() => {});
      if (saudaNo) {
        await dbModule.update('sauda_master', 'sauda_no', saudaNo, {
          shipment_date: deliveryTo || deliveryFrom || null,
          shipment_days: parsedGrace,
          is_closed: false,
          is_reopened: true,
          status: 'open',
          open_remarks: info.openRemarks
        }).catch(() => {});
      }

      if (supabase && saudaNo) {
        try {
          await supabase
            .from('sauda_master')
            .update({
              shipment_date: deliveryTo || deliveryFrom || null,
              shipment_days: parsedGrace
            })
            .or(`sauda_no.eq.${saudaNo},session.eq.${poNo}`);
        } catch (_e) {}
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'sauda_check_point' } }));
      if (onRefresh) {
        await onRefresh();
      }
      setDateSavedSuccess(true);
    } catch (err) {
      console.error('Failed to save delivery date:', err);
    } finally {
      setIsSavingDate(false);
    }
  };

  const updatedPoObject = {
    ...info.po,
    delivery_from: deliveryFrom,
    delivery_to: deliveryTo,
    shipment_date: deliveryTo || deliveryFrom,
    grace_days: parseInt(graceDays, 10) || 0,
    is_closed: false,
    is_reopened: true,
    status: 'open'
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-emerald-600 p-4 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/30">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-base font-black uppercase tracking-wide">Sauda Reopened!</h3>
          <p className="text-xs text-emerald-100 mt-0.5 font-mono">Sauda #{info.po.po_no} is now OPEN</p>
        </div>

        <div className="p-5 space-y-3.5 text-xs">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Reopened By:</span>
              <span className="font-bold text-slate-800">{info.openRemarks.opened_by}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Date & Time:</span>
              <span className="font-mono text-slate-800">
                {info.openRemarks.formatted_time || info.openRemarks.timestamp}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-1.5">
              <span className="text-slate-500 font-medium block mb-1">Remarks:</span>
              <p className="bg-white p-2 rounded-lg border border-slate-200 text-slate-800 italic">
                "{info.openRemarks.remarks}"
              </p>
            </div>
          </div>

          {/* Change Delivery Date Section */}
          <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-950 uppercase tracking-wide text-[11px]">
                Change Delivery / Shipment Date
              </span>
              {dateSavedSuccess && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  ✓ Saved
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Delivery From</label>
                <input
                  type="date"
                  value={deliveryFrom}
                  onChange={(e) => {
                    setDeliveryFrom(e.target.value);
                    setDateSavedSuccess(false);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Delivery To (Shipment By)</label>
                <input
                  type="date"
                  value={deliveryTo}
                  onChange={(e) => {
                    setDeliveryTo(e.target.value);
                    setDateSavedSuccess(false);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-700">Grace Days:</label>
                <input
                  type="number"
                  value={graceDays}
                  onChange={(e) => {
                    setGraceDays(e.target.value);
                    setDateSavedSuccess(false);
                  }}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveDeliveryDate}
                disabled={isSavingDate}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingDate ? 'Saving...' : 'Save Delivery Date'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleSaveDeliveryDate();
                onClose();
                onEditNow(updatedPoObject);
              }}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Sauda Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. Audit View Modal
export const ReopenAuditLogModal: React.FC<{
  auditViewPo: any | null;
  onClose: () => void;
}> = ({ auditViewPo, onClose }) => {
  if (!auditViewPo) return null;

  let rData = auditViewPo.open_remarks;
  if (typeof rData === 'string') {
    try {
      rData = JSON.parse(rData);
    } catch (e) {}
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-indigo-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide text-white">Reopen Audit Details</h3>
              <p className="text-[11px] text-indigo-200 font-mono">Sauda #{auditViewPo.po_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {!rData ? (
            <p className="text-slate-500 italic p-4 text-center">No open_remarks audit data found for this Sauda.</p>
          ) : (
            <>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Opened By:</span>
                  <span className="font-bold text-indigo-900 text-sm">{rData.opened_by}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">User Role / Level:</span>
                  <span className="font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-mono text-[11px]">
                    {rData.user_role || 'ADMIN'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Timestamp:</span>
                  <span className="font-mono text-slate-800">{rData.formatted_time || rData.timestamp}</span>
                </div>
                <div className="border-t border-slate-200 pt-2">
                  <span className="text-slate-500 font-medium block mb-1">Remarks provided:</span>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-800 font-medium leading-relaxed">
                    {rData.remarks}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Stored Supabase JSON Payload:
                </span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-36">
                  {JSON.stringify(rData, null, 2)}
                </pre>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Close Audit View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 6. Mismatch Resolution Modal
export const MismatchApprovalModal: React.FC<{
  mismatchModalPo: any | null;
  onClose: () => void;
  getMismatchReasonText: (po: any) => string;
  onApprove: (po: any) => void;
}> = ({ mismatchModalPo, onClose, getMismatchReasonText, onApprove }) => {
  if (!mismatchModalPo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-gradient-to-r from-rose-700 to-rose-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide text-white">Sauda Mismatch Details & Approval</h3>
              <p className="text-[11px] text-rose-200 font-mono">Sauda #{mismatchModalPo.po_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Mismatch Discrepancy Detected</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              Reason: <span className="font-bold text-rose-900">{getMismatchReasonText(mismatchModalPo)}</span>
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans font-medium">Broker:</span>
              <span className="font-bold text-slate-900 uppercase">{mismatchModalPo.broker || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans font-medium">Supplier:</span>
              <span className="font-bold text-slate-900 uppercase">{mismatchModalPo.supplier || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans font-medium">Contract Quantity:</span>
              <span className="font-bold text-slate-900">{parseFloat(mismatchModalPo.total_contract_mt || 0).toFixed(3)} MT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans font-medium">Received Weight:</span>
              <span className="font-bold text-slate-900">{Number(mismatchModalPo.received_weight_mt || 0).toFixed(3)} MT</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic text-center">
            Approving this mismatch will resolve the discrepancy and update the status to PASS on the Sauda Check Point dashboard.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onApprove(mismatchModalPo)}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Approve & Set PASS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 7. Manual Close P.O Modal with Remarks (Level 4 & Admin)
export const PoCloseModal: React.FC<{
  po: any | null;
  onClose: () => void;
  onConfirmClose: (remarks: string) => void;
  isClosing: boolean;
}> = ({ po, onClose, onConfirmClose, isClosing }) => {
  const [remarks, setRemarks] = React.useState('');
  if (!po) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center border border-amber-400/30">
              <Lock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide text-white">Close Purchase Order</h3>
              <p className="text-[11px] text-amber-200 font-mono">P.O #{po.po_no}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onConfirmClose(remarks); }} className="p-5 space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Full P.O Closure Notice</span>
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Closing this P.O will mark it as <strong>CLOSED</strong>. Once closed, <strong>no Temporary Arrival section will accept any MR</strong> for this P.O. It can only be reopened by a Level 4 user or Admin with remarks.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">P.O / Sauda No:</span>
              <span className="font-mono font-bold text-slate-800">#{po.po_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Broker / Supplier:</span>
              <span className="font-bold text-slate-800 uppercase truncate max-w-[200px]">{po.broker || po.supplier || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contract Quantity:</span>
              <span className="font-mono font-bold text-slate-800">{parseFloat(po.total_contract_mt || 0).toFixed(3)} MT ({po.purchase_unit_name || 'BALES'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Received Weight:</span>
              <span className="font-mono font-bold text-emerald-700">{Number(po.received_weight_mt || 0).toFixed(3)} MT ({po.received_lorries || 0}/{po.contract_lorries || 1} Lorries)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Closing Remarks <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Reason for closure</span>
            </label>
            <textarea
              required
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter reason for closing this P.O (e.g. Completed arrival / Short closed on trader request / Dispute settled)..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none resize-none font-sans"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {['Full Consignment Received', 'Short Closed by Trader Request', 'Order Fulfilled & Settled', 'Cancelled / Force Closed'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setRemarks(tag)}
                  className="text-[9.5px] px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-md border border-slate-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isClosing}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isClosing || !remarks.trim()}
              className="flex-1 py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isClosing ? "Closing P.O..." : "Confirm & Close P.O"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
