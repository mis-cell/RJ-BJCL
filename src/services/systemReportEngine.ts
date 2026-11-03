// System Report Engine - Modularized Entry Barrel
// Exports all system report types, sanitizers, data loader, and metrics calculators.

export type {
  ReportTransactionLine,
  ReportFilterCriteria,
  AllPoRecord,
  AllPoSummary,
  SystemReportDataset
} from '../types/systemReport.types';

export {
  INVALID_AGENCY_SET,
  isInvalidAgency,
  INVALID_AREA_SET,
  isInvalidArea,
  normalizeToISODate,
  getTodayISODate,
  parseJsonItems,
  getFinancialYear,
  getYearMonth
} from './system-reports/systemReportSanitizers';

export {
  loadAndProcessSystemReportData
} from './system-reports/systemReportDataLoader';

export {
  calculateReportMetrics,
  groupTransactionsByDimension
} from './system-reports/systemReportMetrics';
