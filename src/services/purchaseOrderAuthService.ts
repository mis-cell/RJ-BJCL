import { supabase } from '../lib/supabase';

export interface AdminAuthResult {
  success: boolean;
  user?: {
    username: string;
    user_id: string;
    role: string;
    level: string;
  };
  error?: string;
}

export const verifyAdminOrSuperPassword = async (
  username: string,
  pass: string
): Promise<AdminAuthResult> => {
  const cleanPass = pass.trim();
  const cleanUser = (username || '').trim().toLowerCase();

  if (!cleanPass) {
    return { success: false, error: 'Please enter Admin or Super User password.' };
  }

  // 1. Query user_master in Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase.from('user_master').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        if (cleanUser) {
          const userMatch = data.find((u: any) => {
            const uId = String(u.user_id || '').trim().toLowerCase();
            const uName = String(u.username || '').trim().toLowerCase();
            return (uId === cleanUser || uName === cleanUser) && String(u.password || '') === cleanPass;
          });

          if (userMatch) {
            const role = String(userMatch.role || '').toUpperCase();
            const level = String(userMatch.level || '').toUpperCase();
            const isPrivileged =
              role === 'ADMIN' ||
              role === 'ADMINISTRATOR' ||
              role === 'SUPER' ||
              role === 'SUPERUSER' ||
              level === 'L4' ||
              level === 'L5' ||
              level === 'MAX' ||
              level === 'ADMIN' ||
              level === 'SUPER';
            if (isPrivileged) {
              return {
                success: true,
                user: {
                  username: userMatch.username || userMatch.user_id || 'ADMIN',
                  user_id: userMatch.user_id || userMatch.username,
                  role: userMatch.role || 'ADMIN',
                  level: userMatch.level || 'L5'
                }
              };
            } else {
              return {
                success: false,
                error: 'The entered user does not have Admin or Super User authorization.'
              };
            }
          }
        }

        // Check if password matches any admin/superuser in user_master
        const anyAdminMatch = data.find((u: any) => {
          const role = String(u.role || '').toUpperCase();
          const level = String(u.level || '').toUpperCase();
          const isPrivileged =
            role === 'ADMIN' ||
            role === 'ADMINISTRATOR' ||
            role === 'SUPER' ||
            role === 'SUPERUSER' ||
            level === 'L4' ||
            level === 'L5' ||
            level === 'MAX' ||
            level === 'ADMIN' ||
            level === 'SUPER';
          return isPrivileged && String(u.password || '') === cleanPass;
        });

        if (anyAdminMatch) {
          return {
            success: true,
            user: {
              username: anyAdminMatch.username || anyAdminMatch.user_id || 'ADMIN',
              user_id: anyAdminMatch.user_id || anyAdminMatch.username,
              role: anyAdminMatch.role || 'ADMIN',
              level: anyAdminMatch.level || 'L5'
            }
          };
        }
      }
    } catch (e) {
      console.warn('Error checking user_master for admin credentials:', e);
    }
  }

  // 2. Fallback to Master Admin Passwords if not matched in DB
  if (cleanPass === 'Admin@1234' || cleanPass === 'Admin@4321' || cleanPass === 'ADMIN') {
    return {
      success: true,
      user: {
        username: username.trim().toUpperCase() || 'ADMIN',
        user_id: username.trim().toLowerCase() || 'admin',
        role: 'ADMIN',
        level: 'L5'
      }
    };
  }

  // 3. Check localStorage user_master
  try {
    const raw = localStorage.getItem('user_master');
    if (raw) {
      const localList = JSON.parse(raw);
      if (Array.isArray(localList)) {
        const matched = localList.find((u: any) => {
          const role = String(u.role || '').toUpperCase();
          const level = String(u.level || '').toUpperCase();
          const isPrivileged =
            role === 'ADMIN' ||
            role === 'ADMINISTRATOR' ||
            role === 'SUPER' ||
            role === 'SUPERUSER' ||
            level === 'L4' ||
            level === 'L5' ||
            level === 'MAX' ||
            level === 'ADMIN' ||
            level === 'SUPER';
          return isPrivileged && String(u.password || '') === cleanPass;
        });
        if (matched) {
          return {
            success: true,
            user: {
              username: matched.username || matched.user_id || 'ADMIN',
              user_id: matched.user_id || matched.username,
              role: matched.role || 'ADMIN',
              level: matched.level || 'L5'
            }
          };
        }
      }
    }
  } catch (e) {}

  return {
    success: false,
    error: 'Invalid Admin or Super User Password. Please try again.'
  };
};

export const checkIsAdvancePaymentDone = (item: any, paymentsList: any[]): boolean => {
  if (!item) return false;
  if (item.has_payment_done === true || item.advance_payment_done === 'Yes' || item.advance_payment_done === 'yes') return true;
  if (item.has_payment_done === false && !item.advance_payment_done) return false;

  if (!paymentsList || paymentsList.length === 0) {
    return Boolean(item.has_payment_done && !item.pending_payment);
  }

  const cleanPoVal = (v: any) => String(v || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const pPoClean = cleanPoVal(item.po_no);
  const pContractClean = cleanPoVal(item.contract_po_no);
  const ptfClean = cleanPoVal(item.ptf_no);
  const saudaClean = cleanPoVal(item.sauda_no || item.po_contract || item.contract_no);

  const poPayments = paymentsList.filter((pay: any) => {
    const payPo = String(pay.po_no || pay.po_contract || pay.contract_po_no || pay.m_r_no || '').trim().toUpperCase();
    const payPoClean = cleanPoVal(payPo);
    const paySaudaClean = cleanPoVal(pay.sauda_no);

    return (
      (pay.po_no && String(pay.po_no).trim().toUpperCase() === String(item.po_no).trim().toUpperCase()) ||
      (pay.po_no && String(pay.po_no).trim().toUpperCase() === String(item.contract_po_no).trim().toUpperCase()) ||
      (pay.po_no && item.ptf_no && String(pay.po_no).trim().toUpperCase() === String(item.ptf_no).trim().toUpperCase()) ||
      (pPoClean && pPoClean === payPoClean) ||
      (pContractClean && pContractClean === payPoClean) ||
      (ptfClean && ptfClean === payPoClean) ||
      (saudaClean && saudaClean === payPoClean) ||
      (saudaClean && saudaClean === paySaudaClean)
    );
  });

  if (poPayments.length === 0) {
    return Boolean(item.has_payment_done && !item.pending_payment);
  }

  return poPayments.some((pay: any) => {
    const advDone = String(pay.advance_payment_done || pay.advance_done || '').trim().toLowerCase();
    const paid = Number(pay.paid_amount || 0);
    const pStatus = String(pay.payment_status || pay.status || '').toLowerCase().trim();

    if (advDone === 'yes' || advDone === 'y' || advDone === 'true') {
      return true;
    }
    if (paid > 0) {
      return true;
    }
    if (pStatus === 'paid' || pStatus === 'completed' || pStatus === 'settled' || pStatus === 'partially settled') {
      return true;
    }
    return false;
  });
};

export const checkIsSettlementDone = (
  item: any,
  settlementsList: any[],
  settledDeductions: Record<string, boolean> = {}
): boolean => {
  if (!item) return false;
  if (
    item.status === 'settled' ||
    item.status === 'final' ||
    item.status === 'moved_to_final' ||
    item.has_settlement_done === true ||
    item.is_settled === true ||
    item.excess_short_status === 'settled' ||
    item.excess_short_status === 'within_bounds' ||
    item.is_within_bounds === true
  ) {
    return true;
  }

  const key = String(item.po_no || '').trim().toUpperCase();
  if (
    settledDeductions &&
    (settledDeductions[key] || (item.sauda_no && settledDeductions[String(item.sauda_no).trim().toUpperCase()]))
  ) {
    return true;
  }

  if (item.has_settlement_done === false) {
    return false;
  }

  if (!settlementsList || settlementsList.length === 0) {
    return false;
  }

  const cleanPoVal = (v: any) => String(v || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const pPoClean = cleanPoVal(item.po_no);
  const pContractClean = cleanPoVal(item.contract_po_no);
  const ptfClean = cleanPoVal(item.ptf_no);
  const saudaClean = cleanPoVal(item.sauda_no || item.po_contract || item.contract_no);

  return settlementsList.some((s: any) => {
    const sPo = String(s.po_no || s.po_contract || s.contract_po_no || '').trim().toUpperCase();
    const sPoClean = cleanPoVal(sPo);
    return (
      (sPo && String(item.po_no || '').trim().toUpperCase() === sPo) ||
      (sPo && String(item.contract_po_no || '').trim().toUpperCase() === sPo) ||
      (sPo && item.ptf_no && String(item.ptf_no || '').trim().toUpperCase() === sPo) ||
      (pPoClean && sPoClean && pPoClean === sPoClean) ||
      (pContractClean && sPoClean && pContractClean === sPoClean) ||
      (ptfClean && sPoClean && ptfClean === sPoClean) ||
      (saudaClean && sPoClean && saudaClean === sPoClean)
    );
  });
};
