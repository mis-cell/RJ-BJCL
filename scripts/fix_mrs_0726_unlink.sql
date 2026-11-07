-- Fix script to unlink incorrect PO BJCL/2026-2027/0726 from MR01446 through MR01458
-- Run this on your Ubuntu server:
-- psql -U postgres -d bjcl_db -f scripts/fix_mrs_0726_unlink.sql

BEGIN;

UPDATE material_inspection
SET po_no = NULL, po_date = NULL, mill_po_no = NULL, mill_po_date = NULL
WHERE mr_no IN (
  'MR01446', 'MR01447', 'MR01448', 'MR01449', 'MR01450',
  'MR01451', 'MR01452', 'MR01453', 'MR01454', 'MR01455',
  'MR01456', 'MR01457', 'MR01458'
) AND (po_no = 'BJCL/2026-2027/0726' OR mill_po_no = 'BJCL/2026-2027/0726');

UPDATE material_inspection_details
SET po_no = NULL
WHERE mr_no IN (
  'MR01446', 'MR01447', 'MR01448', 'MR01449', 'MR01450',
  'MR01451', 'MR01452', 'MR01453', 'MR01454', 'MR01455',
  'MR01456', 'MR01457', 'MR01458'
) AND po_no = 'BJCL/2026-2027/0726';

UPDATE mill_inspection_master
SET po_no = NULL, po_date = NULL, mill_po_no = NULL, mill_po_date = NULL
WHERE mr_no IN (
  'MR01446', 'MR01447', 'MR01448', 'MR01449', 'MR01450',
  'MR01451', 'MR01452', 'MR01453', 'MR01454', 'MR01455',
  'MR01456', 'MR01457', 'MR01458'
) AND (po_no = 'BJCL/2026-2027/0726' OR mill_po_no = 'BJCL/2026-2027/0726');

UPDATE final_arrival
SET po_no = NULL, po_date = NULL, contract_no = NULL
WHERE (
  final_arrival_no IN ('MR01446', 'MR01447', 'MR01448', 'MR01449', 'MR01450', 'MR01451', 'MR01452', 'MR01453', 'MR01454', 'MR01455', 'MR01456', 'MR01457', 'MR01458')
  OR mr_no IN ('MR01446', 'MR01447', 'MR01448', 'MR01449', 'MR01450', 'MR01451', 'MR01452', 'MR01453', 'MR01454', 'MR01455', 'MR01456', 'MR01457', 'MR01458')
) AND (po_no = 'BJCL/2026-2027/0726' OR contract_no = 'BJCL/2026-2027/0726');

COMMIT;
