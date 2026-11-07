-- Fix script for PO BJCL/2026-2027/0532 to restore Sauda Contract Quantity to 34.50 MT (345.00 Qtl)
-- and Excess Deduction to ₹18,810.00
--
-- Run on your Ubuntu server:
-- psql -U postgres -d bjcl_db -f scripts/fix_po_0532_contract_qty.sql

BEGIN;

-- 1. Restore exact 34.50 MT Contract in sauda_check_point (3 lorries @ 11.50 MT = 34.50 MT / 230 drums per lorry @ 50kg = 690 drums)
UPDATE sauda_check_point
SET total_contract_mt = 34.500,
    weight_per_lorry = 11.500,
    units_per_lorry = 230,
    total_units = 690
WHERE po_no = 'BJCL/2026-2027/0532';

-- 2. Update purchase_master if present
UPDATE purchase_master
SET total_contract_mt = 34.500,
    weight_per_lorry = 11.500,
    units_per_lorry = 230,
    total_units = 690
WHERE po_no = 'BJCL/2026-2027/0532';

-- 3. Update sauda_check_point_deductions with the perfect 34.50 MT calculation
UPDATE sauda_check_point_deductions
SET contract_weight_mt = 34.500,
    tolerance_pct = 3.0,
    tolerance_mt = 1.035,
    min_acceptable_mt = 33.465,
    max_acceptable_mt = 35.535,
    total_received_mt = 38.670,
    variation_type = 'excess',
    variation_mt = -4.170,
    deduction_qty_mt = 3.135,
    deduction_qty_qtl = 31.35,
    deduction_amount = 18810.00,
    rate_difference = 600,
    applicable_rate = 600,
    rate_basis = 'rate_difference',
    satta_rate = 12300,
    sauda_rate = 12900,
    status = 'approved',
    remarks = 'EXCESS WEIGHT DEDUCTION: Deductible 31.35 Qtl at ₹600/Qtl = ₹18,810.00',
    approval_level = 'ADMIN',
    approved_by = 'ADMIN',
    updated_at = NOW()
WHERE po_no = 'BJCL/2026-2027/0532';

COMMIT;

-- Verify updated values
SELECT po_no, total_contract_mt, weight_per_lorry, total_lorries, total_units 
FROM sauda_check_point 
WHERE po_no = 'BJCL/2026-2027/0532';

SELECT po_no, contract_weight_mt, total_received_mt, variation_mt, deduction_qty_qtl, deduction_amount, remarks 
FROM sauda_check_point_deductions 
WHERE po_no = 'BJCL/2026-2027/0532';
