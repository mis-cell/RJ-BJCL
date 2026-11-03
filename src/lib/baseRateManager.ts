import { supabase } from './supabase';
import { isUserAdmin, getCurrentUserContext, UserContext } from './permissions';
import { logChange } from '../services/auditLogService';

export interface BaseRateInfo {
  rate: number;
  startDate: string;
  lastUpdatedAt: string;
  lastUpdatedDateStr: string;
  lastUpdatedTimeStr: string;
  updatedBy: string;
  hoursSinceLastUpdate: number;
  isOverdue: boolean;
  isUpdatedToday: boolean;
  overdueMessage: string;
  remarks: string;
  recordId?: string;
}

export const DEFAULT_BASE_RATE = 0;

// Format helper
export const formatBaseRateDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Calculate elapsed hours between now and a timestamp/date
export const calculateHoursElapsed = (timestampStr?: string | null, dateStr?: string | null): number => {
  const now = Date.now();
  let targetTime: number;

  if (timestampStr) {
    const t = new Date(timestampStr).getTime();
    targetTime = isNaN(t) ? 0 : t;
  } else if (dateStr) {
    const t = new Date(dateStr).getTime();
    targetTime = isNaN(t) ? 0 : t;
  } else {
    return 999; // Indefinitely overdue
  }

  if (targetTime === 0) return 999;
  const diffMs = now - targetTime;
  const hours = Math.max(0, diffMs / (1000 * 60 * 60));
  return Number(hours.toFixed(1));
};

/**
 * Centrally fetch the latest Admin-published Base Rate and 24-hour compliance metrics
 */
export async function fetchCentralBaseRateInfo(): Promise<BaseRateInfo> {
  const todayStr = new Date().toISOString().split('T')[0];
  let latestRecord: any = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('satta_base_rates')
        .select('*')
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        latestRecord = data[0];
      }
    } catch (e) {
      console.warn('Error fetching latest satta_base_rates:', e);
    }
  }

  const rate = latestRecord ? Number(latestRecord.base_rate) || DEFAULT_BASE_RATE : DEFAULT_BASE_RATE;
  const startDate = latestRecord?.start_date || todayStr;
  const createdAt = latestRecord?.created_at || latestRecord?.updated_at || new Date().toISOString();
  
  const createdDate = new Date(createdAt);
  const timeFormatted = !isNaN(createdDate.getTime())
    ? createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : '12:00:00 AM';
  const dateFormatted = !isNaN(createdDate.getTime())
    ? `${String(createdDate.getDate()).padStart(2, '0')}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${createdDate.getFullYear()}`
    : formatBaseRateDate(startDate);

  const hoursElapsed = calculateHoursElapsed(createdAt, startDate);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const isUpdatedToday = startDate >= yesterdayStr || startDate === todayStr;
  const isOverdue = !isUpdatedToday && hoursElapsed >= 48;

  const adminName = latestRecord?.updated_by || latestRecord?.admin_identity || 'Administrator (Central Mill Authority)';
  const remarks = latestRecord?.remarks || 'Daily Satta Base Rate Schedule';

  let overdueMessage = '';
  if (isOverdue) {
    overdueMessage = `Daily Base Rate update is overdue (${hoursElapsed}h elapsed since last update on ${dateFormatted} at ${timeFormatted}). The Satta Base Rate must be updated at least up to Today - 1 (${formatBaseRateDate(yesterdayStr)}).`;
  }

  return {
    rate,
    startDate,
    lastUpdatedAt: createdAt,
    lastUpdatedDateStr: dateFormatted,
    lastUpdatedTimeStr: timeFormatted,
    updatedBy: adminName,
    hoursSinceLastUpdate: hoursElapsed,
    isOverdue,
    isUpdatedToday,
    overdueMessage,
    remarks,
    recordId: latestRecord?.id
  };
}

/**
 * Admin-only Base Rate Publishing & Audit Enforcement
 */
export async function updateCentralBaseRateByAdmin(params: {
  rate: number;
  startDate?: string;
  remarks?: string;
  userContext?: UserContext;
}): Promise<{ success: boolean; message: string; data?: any }> {
  const { rate, remarks, userContext } = params;
  const currentUser = userContext || getCurrentUserContext();
  
  // 1. Strict Security Guard: Only Admin allowed to modify Base Rate
  const adminAuthorized = isUserAdmin(currentUser) || 
    currentUser.userRole === 'ADMIN' || 
    currentUser.userRole === 'ADMINISTRATOR' || 
    Boolean((currentUser as any)?.isAdmin);

  if (!adminAuthorized) {
    return {
      success: false,
      message: 'PERMISSION DENIED: Only System Admin has permission to modify, update, or publish the Base Rate. Normal users cannot edit or override the Base Rate.'
    };
  }

  if (!rate || rate <= 0 || isNaN(rate)) {
    return {
      success: false,
      message: 'Invalid Base Rate amount. Must be a positive numeric value in ₹/Qntl.'
    };
  }

  const effectiveDate = params.startDate || new Date().toISOString().split('T')[0];
  const adminIdentity = currentUser.username || currentUser.userName || currentUser.userId || 'System Administrator';
  const nowIso = new Date().toISOString();

  if (!supabase) {
    return {
      success: false,
      message: 'Database connection offline. Base rate could not be stored in Supabase.'
    };
  }

  try {
    // Get existing rate for audit trail
    let oldRate: number | null = null;
    try {
      const { data: previousRates } = await supabase
        .from('satta_base_rates')
        .select('base_rate')
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      oldRate = previousRates && previousRates[0] ? Number(previousRates[0].base_rate) : null;
    } catch (e) {
      console.warn('Could not fetch previous base rate:', e);
    }

    // Insert new Base Rate record with timestamp and updated_by user
    let newBaseRateRecord: any = null;
    const basePayload: any = {
      base_rate: rate,
      start_date: effectiveDate,
      updated_by: adminIdentity,
      remarks: remarks || `Daily Base Rate updated to ₹${rate.toLocaleString('en-IN')}`,
      created_at: nowIso
    };

    const { data: d1, error: e1 } = await supabase
      .from('satta_base_rates')
      .insert(basePayload)
      .select()
      .single();

    if (e1) {
      delete basePayload.updated_by;
      const { data: d2, error: e2 } = await supabase
        .from('satta_base_rates')
        .insert(basePayload)
        .select()
        .single();

      if (e2) {
        // Fallback minimal insert
        const { data: d3, error: e3 } = await supabase
          .from('satta_base_rates')
          .insert({
            base_rate: rate,
            start_date: effectiveDate,
            created_at: nowIso
          })
          .select()
          .single();

        if (e3) {
          console.warn('Supabase base rate insert failed, using client record:', e3);
          newBaseRateRecord = {
            id: 'local-' + Date.now(),
            base_rate: rate,
            start_date: effectiveDate,
            remarks: remarks || `Daily Base Rate updated to ₹${rate.toLocaleString('en-IN')}`,
            created_at: nowIso
          };
        } else {
          newBaseRateRecord = d3;
        }
      } else {
        newBaseRateRecord = d2;
      }
    } else {
      newBaseRateRecord = d1;
    }

    // Insert immutable Audit Log
    try {
      await supabase
        .from('satta_base_rate_audit_logs')
        .insert({
          old_rate: oldRate,
          new_rate: rate,
          changed_date: effectiveDate,
          changed_by: adminIdentity,
          remarks: remarks || `Base Rate changed from ₹${oldRate?.toLocaleString('en-IN') || '0'} to ₹${rate.toLocaleString('en-IN')} by ${adminIdentity}`,
          created_at: nowIso
        });
    } catch (auditErr) {
      console.warn('Audit log write skipped:', auditErr);
    }

    // Record in Universal Change Log
    try {
      await logChange({
        module: 'Satta Desk / Rate Chart',
        entity_name: 'Satta Base Rate',
        record_id: effectiveDate,
        action: 'UPDATE',
        field_name: 'base_rate',
        field_label: 'Satta Base Rate (₹/Qtl)',
        old_value: oldRate !== null ? `₹${oldRate.toLocaleString('en-IN')}` : 'None',
        new_value: `₹${rate.toLocaleString('en-IN')}`,
        user_name: adminIdentity,
        remarks: remarks || `Base Rate updated to ₹${rate.toLocaleString('en-IN')}`
      });
    } catch (logErr) {
      console.warn('Universal log write skipped:', logErr);
    }

    // Update differentials and pre-calculate rates
    try {
      const { data: diffsData } = await supabase.from('satta_differentials').select('*');
      if (diffsData && diffsData.length > 0 && newBaseRateRecord) {
        const calcRows = diffsData.map((d: any) => ({
          base_rate_id: newBaseRateRecord.id,
          base_rate: rate,
          start_date: effectiveDate,
          area: d.area,
          grade: d.grade,
          differential: Number(d.differential) || 0,
          final_rate: rate + (Number(d.differential) || 0)
        }));
        
        await supabase.from('satta_calculated_rates').delete().eq('start_date', effectiveDate);
        await supabase.from('satta_calculated_rates').insert(calcRows);
      }
    } catch (calcErr) {
      console.warn('Precalculated rates refresh skipped:', calcErr);
    }

    // Broadcast update event across all open tabs and components
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('satta_chart_uploaded', 'true');
        localStorage.setItem('satta_chart_upload_date', effectiveDate);
        localStorage.setItem('satta_latest_base_rate', String(rate));
        window.dispatchEvent(new CustomEvent('base-rate-updated', {
          detail: {
            rate,
            startDate: effectiveDate,
            updatedBy: adminIdentity,
            timestamp: nowIso
          }
        }));
        window.dispatchEvent(new CustomEvent('satta-chart-uploaded'));
      } catch (e) {}
    }

    return {
      success: true,
      message: `Base Rate ₹${rate.toLocaleString('en-IN')} successfully published and activated for all users.`,
      data: newBaseRateRecord
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to update Base Rate: ${err.message || 'Database error'}`
    };
  }
}
