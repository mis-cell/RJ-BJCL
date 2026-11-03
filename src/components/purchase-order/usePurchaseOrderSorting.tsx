import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { calculateWeightTolerance } from '../../lib/weightTolerance';
import { canViewCompletedData } from '../../lib/permissions';
import { parseMonthKey } from '../common/MonthWiseCardsRibbon';

export type SortKey = 'po_no' | 'date' | 'type' | 'supplier' | 'broker' | 'unit' | 'total_units' | 'weight' | 'status' | 'closed_open' | 'excess_short' | 'pass_mismatch' | 'stage';
export type StatusFilterType = 'all' | 'pending' | 'completed' | 'short' | 'excess' | 'cancelled';
export type LorryStatusFilterType = 'all' | 'open' | 'closed';
export type WtStatusFilterType = 'all' | 'pending_arrival' | 'tolerable' | 'short' | 'excess';

interface UsePurchaseOrderSortingProps {
  poList: any[];
  isArchiveView: boolean;
  matchResults: Record<string, any>;
  dbMaterialMismatches: any[];
  isPoMismatchResolved: (item: any) => boolean;
}

export function usePurchaseOrderSorting({
  poList,
  isArchiveView,
  matchResults,
  dbMaterialMismatches,
  isPoMismatchResolved
}: UsePurchaseOrderSortingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = React.useDeferredValue(searchTerm);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [lorryStatusFilter, setLorryStatusFilter] = useState<LorryStatusFilterType>('all');
  const [wtStatusFilter, setWtStatusFilter] = useState<WtStatusFilterType>('all');
  const [selectedPoNo, setSelectedPoNo] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, startDate, endDate, statusFilter, lorryStatusFilter, wtStatusFilter, selectedMonth]);

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const renderSortIndicator = (colKey: SortKey) => {
    const isActive = sortConfig.key === colKey;
    if (isActive) {
      return sortConfig.direction === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-[#9F1239] shrink-0 inline ml-0.5 font-bold" />
      ) : (
        <ArrowDown className="w-3 h-3 text-[#9F1239] shrink-0 inline ml-0.5 font-bold" />
      );
    }
    return (
      <ArrowUpDown className="w-2.5 h-2.5 text-rose-900/40 opacity-50 group-hover:opacity-100 shrink-0 inline ml-0.5 transition-opacity" />
    );
  };

  // Filter POs in register
  const filteredPos = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase();
    return poList.filter(p => {
      if (term) {
        const poNo = String(p.po_no || '').toLowerCase();
        const ptfNo = String(p.ptf_no || '').toLowerCase();
        const bName = String(p.broker || '').toLowerCase();
        const sName = String(p.supplier || '').toLowerCase();
        const aName = String(p.area || '').toLowerCase();
        const matchesSearch = poNo.includes(term) || ptfNo.includes(term) || bName.includes(term) || sName.includes(term) || aName.includes(term);
        if (!matchesSearch) return false;
      }

      const rowDate = p.date || p.po_date || p.contract_date || p.created_at;
      if (startDate && (!rowDate || new Date(rowDate) < new Date(startDate))) return false;
      if (endDate && (!rowDate || new Date(rowDate) > new Date(endDate))) return false;
      if (selectedMonth) {
        const parsed = parseMonthKey(rowDate);
        if (!parsed || parsed.key !== selectedMonth) return false;
      }

      const isCancelled = p.status === 'cancelled';
      if (statusFilter === 'cancelled') {
        return isCancelled;
      }
      if (isCancelled) return false;

      const canSeeCompleted = canViewCompletedData();
      const statusStr = String(p.status ?? '').trim().toLowerCase();
      const receivedWt = parseFloat(p.received_weight_mt) || 0;
      const contractWt = parseFloat(p.total_contract_mt) || 0;
      const unit = p.purchase_unit_name || p.unit_type || p.unit || 'BALES';
      const tol = p.weight_tolerance || calculateWeightTolerance(contractWt, receivedWt, unit);
      const contractLorries = p.contract_lorries || p.total_no_of_lorries || 1;
      const receivedLorries = p.received_lorries || 0;
      const isClosed = !p.is_reopened && Boolean(p.is_closed || statusStr === 'closed' || (contractLorries > 0 && receivedLorries >= contractLorries));
      const isCompleted = !p.is_reopened && (statusStr === 'completed' || statusStr === 'settled' || isClosed);
      const computedStatus = isCompleted ? 'completed' : (tol.status === 'mismatch' ? 'mismatch' : 'pending');

      if (!canSeeCompleted && computedStatus === 'completed') {
        return false;
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (isCompleted) return false;
        } else if (statusFilter === 'completed') {
          if (!isCompleted) return false;
        } else if (statusFilter === 'short') {
          if (!tol.isUnderDelivery || tol.isAcceptable) return false;
        } else if (statusFilter === 'excess') {
          if (!tol.isOverDelivery || tol.isAcceptable) return false;
        } else if (statusFilter === 'cancelled') {
          if (!isCancelled) return false;
        } else if (computedStatus !== statusFilter) {
          return false;
        }
      }

      if (lorryStatusFilter !== 'all') {
        if (lorryStatusFilter === 'open' && isClosed) return false;
        if (lorryStatusFilter === 'closed' && !isClosed) return false;
      }

      if (wtStatusFilter !== 'all') {
        const hasArrived = receivedWt > 0 || receivedLorries > 0;
        if (wtStatusFilter === 'pending_arrival') {
          if (hasArrived) return false;
        } else if (wtStatusFilter === 'tolerable') {
          if (!hasArrived || !tol.isAcceptable) return false;
        } else if (wtStatusFilter === 'short') {
          if (!hasArrived || !tol.isUnderDelivery || tol.isAcceptable) return false;
        } else if (wtStatusFilter === 'excess') {
          if (!hasArrived || !tol.isOverDelivery || tol.isAcceptable) return false;
        }
      }

      return true;
    });
  }, [poList, deferredSearchTerm, startDate, endDate, selectedMonth, statusFilter, lorryStatusFilter, wtStatusFilter]);

  // Sorted POs for Table View
  const sortedPos = useMemo(() => {
    return [...filteredPos].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'date': {
          const dateA = a.po_date || a.date || (a.created_at ? a.created_at.slice(0, 10) : '') || '';
          const dateB = b.po_date || b.date || (b.created_at ? b.created_at.slice(0, 10) : '') || '';
          comparison = dateA.localeCompare(dateB);
          break;
        }
        case 'type': {
          const typeA = a.ptf_no ? 'PTF ENTRY' : 'SAUDA LINKED';
          const typeB = b.ptf_no ? 'PTF ENTRY' : 'SAUDA LINKED';
          comparison = typeA.localeCompare(typeB);
          break;
        }
        case 'unit': {
          const unitA = String(a.purchase_unit_name || a.unit_type || a.unit || 'BALES').toUpperCase();
          const unitB = String(b.purchase_unit_name || b.unit_type || b.unit || 'BALES').toUpperCase();
          comparison = unitA.localeCompare(unitB);
          break;
        }
        case 'status': {
          const getStatusRank = (item: any) => {
            const contract = parseFloat(item.total_contract_mt || 0) || 0;
            const rcvd = Number(item.received_weight_mt || 0);
            const unit = item.purchase_unit_name || item.unit_type || item.unit || 'BALES';
            const tol = item.weight_tolerance || calculateWeightTolerance(contract, rcvd, unit);
            const statusStr = String(item.status ?? '').trim().toLowerCase();
            const contractLorries = item.contract_lorries || item.total_no_of_lorries || 1;
            const receivedLorries = item.received_lorries || 0;
            const isClosed = !item.is_reopened && Boolean(item.is_closed || statusStr === 'closed' || (contractLorries > 0 && receivedLorries >= contractLorries));
            const isCompletedPo = !item.is_reopened && (statusStr === 'completed' || statusStr === 'settled' || isClosed);

            if (contract > 0 && rcvd > 0 && rcvd < 5.0) return 5;
            if (isCompletedPo) return 2;
            if (tol.isUnderDelivery) return 3;
            if (tol.isOverDelivery) return 4;
            return 1;
          };

          const rankA = getStatusRank(a);
          const rankB = getStatusRank(b);

          if (rankA !== rankB) {
            comparison = rankA - rankB;
          } else {
            const dateA = a.po_date || a.date || (a.created_at ? a.created_at.slice(0, 10) : '') || '';
            const dateB = b.po_date || b.date || (b.created_at ? b.created_at.slice(0, 10) : '') || '';
            comparison = dateB.localeCompare(dateA);
          }
          break;
        }
        case 'closed_open': {
          const contractLorriesA = a.contract_lorries || a.total_no_of_lorries || 1;
          const receivedLorriesA = a.received_lorries || 0;
          const isClosedA = !a.is_reopened && Boolean(a.is_closed || a.status === 'closed' || (contractLorriesA > 0 && receivedLorriesA >= contractLorriesA)) ? 1 : 0;

          const contractLorriesB = b.contract_lorries || b.total_no_of_lorries || 1;
          const receivedLorriesB = b.received_lorries || 0;
          const isClosedB = !b.is_reopened && Boolean(b.is_closed || b.status === 'closed' || (contractLorriesB > 0 && receivedLorriesB >= contractLorriesB)) ? 1 : 0;

          comparison = isClosedA - isClosedB;
          break;
        }
        case 'excess_short': {
          const contractA = parseFloat(a.total_contract_mt || 0) || 0;
          const rcvdA = Number(a.received_weight_mt || 0);
          const diffA = rcvdA - contractA;

          const contractB = parseFloat(b.total_contract_mt || 0) || 0;
          const rcvdB = Number(b.received_weight_mt || 0);
          const diffB = rcvdB - contractB;

          comparison = diffA - diffB;
          break;
        }
        case 'pass_mismatch': {
          const getPassMismatchText = (item: any) => {
            const isFinalized = item.status === 'final' || item.status === 'moved_to_final';
            if (isFinalized) return '5_PASS';
            const isResolved = isPoMismatchResolved(item);
            if (isResolved) return '4_ELIGIBLE';
            const stage = item.workflow_stage || (item.pass_status === 'pass' ? 'eligible_adv_payment' : item.pass_status);
            if (stage === 'eligible_adv_payment') return '4_ELIGIBLE';
            if (stage === 'inspection_pending') return '3_INSPECTION_PENDING';
            if (stage === 'mismatch' || (item.mismatch_fields && item.mismatch_fields.length > 0)) return '2_MISMATCH';
            if (stage === 'final_arrival_pending') return '1_FINAL_ARRIVAL_PENDING';
            return '0_TEMP_ARRIVAL_PENDING';
          };
          comparison = getPassMismatchText(a).localeCompare(getPassMismatchText(b));
          break;
        }
        case 'po_no': {
          const poA = String(a.po_no || a.ptf_no || '');
          const poB = String(b.po_no || b.ptf_no || '');
          comparison = poA.localeCompare(poB, undefined, { numeric: true, sensitivity: 'base' });
          break;
        }
        case 'supplier': {
          const sA = String(a.supplier || '');
          const sB = String(b.supplier || '');
          comparison = sA.localeCompare(sB);
          break;
        }
        case 'broker': {
          const bA = String(a.broker || '');
          const bB = String(b.broker || '');
          comparison = bA.localeCompare(bB);
          break;
        }
        case 'total_units': {
          comparison = (Number(a.total_units || 0)) - (Number(b.total_units || 0));
          break;
        }
        case 'weight': {
          const wA = parseFloat(a.received_weight_mt || a.total_contract_mt || 0) || 0;
          const wB = parseFloat(b.received_weight_mt || b.total_contract_mt || 0) || 0;
          comparison = wA - wB;
          break;
        }
        case 'stage': {
          const sA = String(a.workflow_stage || a.pass_status || '');
          const sB = String(b.workflow_stage || b.pass_status || '');
          comparison = sA.localeCompare(sB);
          break;
        }
        default:
          comparison = 0;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredPos, sortConfig, isPoMismatchResolved]);

  // Section POs
  const sectionPos = useMemo(() => {
    return poList.filter(p => {
      if (isArchiveView) return true;

      const isArchived = !!p.archived_at;
      if (isArchived) return false;

      const isCancelled = p.status === 'cancelled';
      if (statusFilter === 'cancelled') return isCancelled;
      if (isCancelled) return false;

      const canSeeCompleted = canViewCompletedData();
      const statusStr = String(p.status ?? '').trim().toLowerCase();
      const receivedWt = parseFloat(p.received_weight_mt) || 0;
      const contractWt = parseFloat(p.total_contract_mt) || 0;
      const unit = p.purchase_unit_name || p.unit_type || p.unit || 'BALES';
      const tol = p.weight_tolerance || calculateWeightTolerance(contractWt, receivedWt, unit);
      const contractLorries = p.contract_lorries || p.total_no_of_lorries || 1;
      const receivedLorries = p.received_lorries || 0;
      const isClosed = !p.is_reopened && Boolean(p.is_closed || statusStr === 'closed' || (contractLorries > 0 && receivedLorries >= contractLorries));
      const isCompleted = !p.is_reopened && (statusStr === 'completed' || statusStr === 'settled' || isClosed);
      const computedStatus = isCompleted ? 'completed' : (tol.status === 'mismatch' ? 'mismatch' : 'pending');
      if (!canSeeCompleted && computedStatus === 'completed') {
        return false;
      }

      return true;
    });
  }, [poList, isArchiveView, statusFilter]);

  // Scoped POs
  const scopedPos = useMemo(() => {
    return sectionPos.filter(p => {
      const term = searchTerm.toLowerCase();
      if (term) {
        const poNo = String(p.po_no || '').toLowerCase();
        const ptfNo = String(p.ptf_no || '').toLowerCase();
        const bName = String(p.broker || '').toLowerCase();
        const sName = String(p.supplier || '').toLowerCase();
        const aName = String(p.area || '').toLowerCase();
        const matchesSearch = poNo.includes(term) || ptfNo.includes(term) || bName.includes(term) || sName.includes(term) || aName.includes(term);
        if (!matchesSearch) return false;
      }

      const rowDate = p.date || p.po_date;
      if (startDate && (!rowDate || new Date(rowDate) < new Date(startDate))) return false;
      if (endDate && (!rowDate || new Date(rowDate) > new Date(endDate))) return false;

      return true;
    });
  }, [sectionPos, searchTerm, startDate, endDate]);

  const totalCompletedPos = useMemo(() => {
    return scopedPos.filter(p => {
      const statusStr = String(p.status ?? '').trim().toLowerCase();
      const contractLorries = p.contract_lorries || p.total_no_of_lorries || 1;
      const receivedLorries = p.received_lorries || 0;
      const isClosed = !p.is_reopened && Boolean(p.is_closed || statusStr === 'closed' || (contractLorries > 0 && receivedLorries >= contractLorries));
      return !p.is_reopened && (statusStr === 'completed' || statusStr === 'settled' || isClosed);
    }).length;
  }, [scopedPos]);

  const totalShortPos = useMemo(() => {
    return scopedPos.filter(p => {
      const receivedWt = parseFloat(p.received_weight_mt) || 0;
      const contractWt = parseFloat(p.total_contract_mt) || 0;
      const unit = p.purchase_unit_name || p.unit_type || p.unit || 'BALES';
      const tol = p.weight_tolerance || calculateWeightTolerance(contractWt, receivedWt, unit);
      return tol.isUnderDelivery && !tol.isAcceptable;
    }).length;
  }, [scopedPos]);

  const totalExcessPos = useMemo(() => {
    return scopedPos.filter(p => {
      const receivedWt = parseFloat(p.received_weight_mt) || 0;
      const contractWt = parseFloat(p.total_contract_mt) || 0;
      const unit = p.purchase_unit_name || p.unit_type || p.unit || 'BALES';
      const tol = p.weight_tolerance || calculateWeightTolerance(contractWt, receivedWt, unit);
      return tol.isOverDelivery && !tol.isAcceptable;
    }).length;
  }, [scopedPos]);

  const totalPendingPos = scopedPos.length - totalCompletedPos;
  const totalGeneratedPos = scopedPos.length;
  const cumulativeWeight = useMemo(() => {
    return scopedPos.reduce((acc, p) => acc + (parseFloat(p.total_contract_mt) || 0), 0);
  }, [scopedPos]);

  const statusPieData = useMemo(() => {
    return [
      { name: 'Pending', value: totalPendingPos },
      { name: 'Completed', value: totalCompletedPos },
      { name: 'Short Wt', value: totalShortPos },
      { name: 'Excess Wt', value: totalExcessPos }
    ].filter(i => i.value > 0);
  }, [totalPendingPos, totalCompletedPos, totalShortPos, totalExcessPos]);

  const STATUS_COLORS = ['#be123c', '#15803d', '#d97706', '#2563eb'];

  return {
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedMonth,
    setSelectedMonth,
    statusFilter,
    setStatusFilter,
    lorryStatusFilter,
    setLorryStatusFilter,
    wtStatusFilter,
    setWtStatusFilter,
    selectedPoNo,
    setSelectedPoNo,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortConfig,
    handleSort,
    renderSortIndicator,
    filteredPos,
    sortedPos,
    sectionPos,
    scopedPos,
    totalCompletedPos,
    totalShortPos,
    totalExcessPos,
    totalPendingPos,
    totalGeneratedPos,
    cumulativeWeight,
    statusPieData,
    STATUS_COLORS
  };
}
