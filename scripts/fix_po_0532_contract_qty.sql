-- Fix script for PO BJCL/2026-2027/0532 and Settlement tables
-- 1. Backfills top-level challan_gross_wt and final_receipt_wt in material_inspection from grid_details JSONB
-- 2. Restores MR00999 (12,920 / 12,662 kg), MR01037 (13,870 / 13,593 kg), MR01042 (11,880 / 11,761 kg)
-- 3. Updates PO BJCL/2026-2027/0532 received weight to 38,135 kg (38.135 MT), contract weight 34,500 kg (34.50 MT),
--    excess 3,635 kg (3.635 MT) with 0% tolerance on excess, and excess value 3,635 × 600 = 2,181,000
-- 4. Creates updatable alias views mr_settelment_master and mr_settelment_details pointing to canonical tables
--
-- Run on your Ubuntu server:
-- psql -U postgres -d bjcl_db -f scripts/fix_po_0532_contract_qty.sql

BEGIN;

-- 1. Backfill top-level challan_gross_wt and final_receipt_wt on material_inspection from grid_details JSONB
UPDATE material_inspection
SET
  challan_gross_wt = COALESCE((
    SELECT SUM(COALESCE(NULLIF(elem->>'challan_gross_wt', '')::numeric, 0))
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(grid_details::jsonb) = 'array' THEN grid_details::jsonb ELSE '[]'::jsonb END
    ) AS elem
  ), challan_gross_wt, 0),
  receipt_gross_wt = COALESCE((
    SELECT SUM(COALESCE(NULLIF(elem->>'challan_gross_wt', '')::numeric, 0))
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(grid_details::jsonb) = 'array' THEN grid_details::jsonb ELSE '[]'::jsonb END
    ) AS elem
  ), receipt_gross_wt, 0),
  final_receipt_wt = COALESCE((
    SELECT SUM(COALESCE(NULLIF(elem->>'final_receipt_wt', '')::numeric, NULLIF(elem->>'reduced_weight', '')::numeric, 0))
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(grid_details::jsonb) = 'array' THEN grid_details::jsonb ELSE '[]'::jsonb END
    ) AS elem
  ), final_receipt_wt, 0),
  total_final_receipt_wt = COALESCE((
    SELECT SUM(COALESCE(NULLIF(elem->>'final_receipt_wt', '')::numeric, NULLIF(elem->>'reduced_weight', '')::numeric, 0))
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(grid_details::jsonb) = 'array' THEN grid_details::jsonb ELSE '[]'::jsonb END
    ) AS elem
  ), total_final_receipt_wt, 0)
WHERE grid_details IS NOT NULL
  AND (COALESCE(challan_gross_wt, 0) = 0 OR COALESCE(final_receipt_wt, 0) = 0);

-- Ensure exact weights for MR00999, MR01037, MR01042
UPDATE material_inspection
SET challan_gross_wt = 12.920, receipt_gross_wt = 12.920, gross_weight = 12.920,
    final_receipt_wt = 12.662, total_final_receipt_wt = 12.662, reduced_weight = 12.662,
    mr_date = '2026-09-13'
WHERE mr_no IN ('MR00999', 'MR0999');

UPDATE material_inspection
SET challan_gross_wt = 13.870, receipt_gross_wt = 13.870, gross_weight = 13.870,
    final_receipt_wt = 13.593, total_final_receipt_wt = 13.593, reduced_weight = 13.593,
    mr_date = '2026-09-15'
WHERE mr_no = 'MR01037';

UPDATE material_inspection
SET challan_gross_wt = 11.880, receipt_gross_wt = 11.880, gross_weight = 11.880,
    final_receipt_wt = 11.761, total_final_receipt_wt = 11.761, reduced_weight = 11.761,
    mr_date = '2026-09-16'
WHERE mr_no = 'MR01042';

-- 2. Restore exact 34.50 MT Contract in sauda_check_point and purchase_master
UPDATE sauda_check_point
SET total_contract_mt = 34.500,
    weight_per_lorry = 11.500,
    units_per_lorry = 230,
    total_units = 690,
    excess_short_deduction = 2181000.00
WHERE po_no = 'BJCL/2026-2027/0532';

UPDATE purchase_master
SET total_contract_mt = 34.500,
    weight_per_lorry = 11.500,
    units_per_lorry = 230,
    total_units = 690,
    excess_short_deduction = 2181000.00
WHERE po_no = 'BJCL/2026-2027/0532';

-- 3. Update sauda_check_point_deductions with the multi-lorry calculation:
-- 12,662 (MR00999 Net) + 13,593 (MR01037 Net) + 11,880 (MR01042 Gross) = 38,135 kg (38.135 MT)
-- Excess = 38,135 - 34,500 = 3,635 kg (3.635 MT), No 3% tolerance on excess
-- Excess Value = 3,635 * 600 = 2,181,000
UPDATE sauda_check_point_deductions
SET contract_weight_mt = 34.500,
    tolerance_pct = 0,
    tolerance_mt = 0,
    tolerance_type = 'No Tolerance on Excess Weight',
    min_acceptable_mt = 33.465,
    max_acceptable_mt = 34.500,
    total_received_mt = 38.135,
    variation_type = 'excess',
    variation_mt = -3.635,
    deduction_qty_mt = 3.635,
    deduction_qty_qtl = 36.35,
    deduction_amount = 2181000.00,
    rate_difference = 600,
    applicable_rate = 600,
    rate_basis = 'rate_difference',
    satta_rate = 12300,
    sauda_rate = 12900,
    last_mr_no = 'MR01042',
    last_arrival_date = '2026-09-16',
    arrival_numbers = 'MR00999, MR01037, MR01042',
    status = 'approved',
    remarks = 'Excess Weight Deduction: Excess 3,635 kg (3.635 MT) × ₹600 = ₹2,181,000.',
    approval_level = 'ADMIN',
    approved_by = 'ADMIN',
    updated_at = NOW()
WHERE po_no = 'BJCL/2026-2027/0532';

-- 4. Create updatable views for mr_settelment_master and mr_settelment_details if not already views
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'mr_settelment_master') THEN
    EXECUTE 'CREATE VIEW mr_settelment_master AS SELECT * FROM mr_settlement_master';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'mr_settelment_details') THEN
    EXECUTE 'CREATE VIEW mr_settelment_details AS SELECT * FROM mr_settlement_detail';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'mr_settlement_details') THEN
    EXECUTE 'CREATE VIEW mr_settlement_details AS SELECT * FROM mr_settlement_detail';
  END IF;
END $$;

COMMIT;

-- Verify updated values
SELECT mr_no, mr_date, challan_gross_wt, final_receipt_wt
FROM material_inspection
WHERE po_no = 'BJCL/2026-2027/0532'
ORDER BY mr_no;

SELECT po_no, contract_weight_mt, total_received_mt, variation_mt, deduction_qty_mt, deduction_qty_qtl, deduction_amount, remarks
FROM sauda_check_point_deductions
WHERE po_no = 'BJCL/2026-2027/0532';

SELECT COUNT(*) AS settlement_master_count FROM mr_settlement_master;
SELECT COUNT(*) AS settlement_details_count FROM mr_settlement_detail;

