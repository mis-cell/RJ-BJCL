# System Reports Header Updates & Per-Sauda Contract Grouping Plan

Update the System Reports section to refine table headers and fix the Contract Sauda data presentation so contracts are grouped per Sauda/PO number rather than split grade-wise.

## User Review & Critical Decisions

> [!IMPORTANT]
> The System Report section will update column headers and shift Contract Sauda records from grade-level splits to single per-Sauda/PO number rows using data synchronized from `sauda_master`, `sauda_check_point`, and `purchase_master`.

- **Confirmed Column Rename**: `"Rank / Entity Name"` updated to `"Broker Name"`, and `"Deals"` renamed to `"Contract Sauda"`.
- **Confirmed Data Level**: Contract Sauda view displays 1 row per unique Sauda / PO Number with total aggregated weights and average rate, eliminating redundant grade-wise row splits.

---

## 1. Overview & Core Concept

- **What It Does**: Standardizes System Reports presentation for commercial grain procurement tracking. Updates table column titles to match user terminology (`Broker Name`, `Contract Sauda`) and ensures contract metrics are reported per Sauda/PO Number.
- **Target Audience**: Management, accounting, and desk operators reviewing broker performance, contract weights, arrival progress, and payable balances.
- **Key Value**: Provides an accurate, non-duplicated view of every registered contract deal with unified weights and financial totals pulled directly from Supabase tables (`sauda_master`, `sauda_check_point`, `purchase_master`).

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. User navigates to **System Report** section.
  2. The primary report view displays updated column headers: **Broker Name** (or entity name), **Contract Sauda** (count/deals), **Contract Weight (MT)**, **Arrived Weight (MT)**, and **Avg Rate (₹/Qtl)**.
  3. Under the **All Sauda / Contract Sauda** breakdown, contracts are rendered 1 line per Sauda / PO number (e.g. `BJCL/2026-2027/0656`), with full combined weight and status across all grades.
  4. Clicking any Sauda row opens the detailed Deal Slip modal without data fragmentation.

- **Visual Identity & Typography**:
  - *Data Grid Density*: High-density compact tabular layout with subtle slate row borders (`border-slate-100`).
  - *Numeric Formatting*: Enforced monospace tabular figures (`font-mono tabular-nums`) for weights, rates, and Indian rupee values (`formatIndianCurrency`).
  - *Color Posture*: Emerald highlights for arrived weights (`text-emerald-950`), dark slate for contract totals, and rose for pending balances.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Per-Sauda/PO Grouping vs. Grade-Wise Splitting**
  - *Chosen Approach*: Group and aggregate all items belonging to the same Sauda / PO Number into a single unified row in the main Contract Sauda view, while storing individual grade items in nested arrays for drill-down.
  - *Why*: Grade-wise splitting artificially inflated row counts and created confusion regarding total registered contract numbers.
  - *Alternatives Considered*: Showing separate rows per grade (rejected as confusing).

- **Decision 2: Direct Supabase Data Synchronization**
  - *Chosen Approach*: Retrieve and merge records from `sauda_master`, `sauda_check_point`, and `purchase_master` in `systemReportEngine.ts` to ensure consistency between the entry desk and reports.
  - *Why*: Guarantees all check-point status updates and final arrival weights are accurately reflected.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Supabase Data Layer                             │
│    sauda_master  │  sauda_check_point  │  purchase_master              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      systemReportEngine.ts                             │
│  - Fetches & merges sauda_master + check points + purchase records      │
│  - Aggregates by Sauda/PO Number (Unsplit master record)               │
│  - Builds SystemReportDataset                                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               SimpleReportView.tsx / System Reports UI                 │
│  Headers: [Broker Name] [Contract Sauda] [Contract Weight (MT)]        │
│           [Arrived Weight (MT)] [Avg Rate (₹/Qtl)]                    │
└────────────────────────────────────────────────────────────────────────┘
```

- **Interactive Component Mapping**:
  - `src/components/system-reports/SimpleReportView.tsx`: Render updated headers (`Broker Name`, `Contract Sauda`, `Contract Weight (MT)`, `Arrived Weight (MT)`, `Avg Rate (₹/Qtl)`). Ensure table iteration renders unsplit per-Sauda entries.
  - `src/services/systemReportEngine.ts`: Ensure `allPoSummary` and `dataset` query and aggregate records from `sauda_master`, `sauda_check_point`, and `purchase_master` per Sauda/PO number.
