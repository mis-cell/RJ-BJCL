import { supabase } from '../lib/supabase';

export interface SaudaApprovalHistoryRecord {
  history_id?: string;
  sauda_id?: string;
  sauda_no?: string;
  financial_year?: string;
  action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'UNREJECTED';
  action_by_user_id?: string;
  action_by_username: string;
  action_at?: string;
  previous_status?: string;
  new_status?: string;
  rejection_reason?: string;
  revision_details?: string;
}

/**
 * Permanently logs a Sauda creation, approval, rejection, or resubmission event to Supabase sauda_approval_history table.
 */
export async function logSaudaApprovalAction(record: SaudaApprovalHistoryRecord): Promise<void> {
  const payload = {
    sauda_id: record.sauda_id || null,
    sauda_no: record.sauda_no || null,
    financial_year: record.financial_year || '2026-2027',
    action: record.action,
    action_by_user_id: record.action_by_user_id || null,
    action_by_username: record.action_by_username,
    action_at: record.action_at || new Date().toISOString(),
    previous_status: record.previous_status || 'PENDING',
    new_status: record.new_status || 'PENDING',
    rejection_reason: record.rejection_reason || null,
    revision_details: record.revision_details || null,
  };

  try {
    if (supabase) {
      await supabase.from('sauda_approval_history').insert([payload]);
    }
  } catch (e) {
    console.warn("Could not insert into sauda_approval_history:", e);
  }
}

/**
 * Fetches the complete approval and rejection timeline history for a given Sauda contract.
 */
export async function fetchSaudaApprovalHistory(saudaId?: string, saudaNo?: string): Promise<SaudaApprovalHistoryRecord[]> {
  try {
    if (supabase) {
      let query = supabase.from('sauda_approval_history').select('*');
      if (saudaId && saudaNo) {
        query = query.or(`sauda_id.eq.${saudaId},sauda_no.eq.${saudaNo}`);
      } else if (saudaId) {
        query = query.eq('sauda_id', saudaId);
      } else if (saudaNo) {
        query = query.eq('sauda_no', saudaNo);
      } else {
        return [];
      }
      const { data, error } = await query.order('action_at', { ascending: false });
      if (!error && data) return data;
    }
  } catch (e) {
    console.warn("Error fetching sauda_approval_history:", e);
  }
  return [];
}
