/**
 * Centralized Dashboard Calculation Service
 * 
 * Provides unified, single-source-of-truth calculations for:
 * 1. Sauda Check Point Summary (Sauda + Final P.O./P.T.F combined)
 * 2. Pending Sauda Calculation (Cross-checked against Temporary Arrival records)
 * 3. Payment Totals & PO Matching (Total Payable Value, Paid Amount, Remaining Amount)
 * 4. Month-Wise Contract and Payment Summary (Dynamic Year, Month Allocation Rules)
 * 5. Traceable detailed records for interactive card modals
 * 
 * Modularized architecture:
 * - Types: src/types/dashboardCalculation.types.ts
 * - Helpers: src/services/dashboardCalculationHelpers.ts
 * - Inspection Metrics: src/services/dashboardInspectionMetrics.ts
 * - Contract & Payment Metrics: src/services/dashboardContractMetrics.ts
 */

// 100% backward-compatible re-exports
export * from '../types/dashboardCalculation.types';
export * from './dashboardCalculationHelpers';
export * from './dashboardInspectionMetrics';
export * from './dashboardContractMetrics';
