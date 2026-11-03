-- Supabase Multi-Module ERP Schema Definition
-- P.O Automation & Warehouse Management System

-- 1. Master Tables for Directory and Parameters
CREATE TABLE IF NOT EXISTS financial_year_master (
    year_code TEXT PRIMARY KEY, -- e.g. "2026-2027"
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO financial_year_master (year_code, start_date, end_date) VALUES 
('2025-2026', '2025-04-01', '2026-03-31'),
('2026-2027', '2026-04-01', '2027-03-31')
ON CONFLICT (year_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS area_master (
    area_code TEXT PRIMARY KEY,
    area_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agency_master (
    area_code TEXT REFERENCES area_master(area_code),
    agency_code TEXT PRIMARY KEY,
    agency_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grade_master (
    grade_code TEXT PRIMARY KEY,
    grade_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS godown_master (
    gdn_code TEXT PRIMARY KEY,
    gdn_name TEXT NOT NULL,
    gdn_capacity NUMERIC(15,2),
    gdn_short_name TEXT
);

CREATE TABLE IF NOT EXISTS supply_master (
    supp_code TEXT PRIMARY KEY,
    supp_name TEXT NOT NULL,
    acc_no TEXT,
    supp_add1 TEXT,
    supp_add2 TEXT,
    supp_add3 TEXT,
    supp_city TEXT,
    supp_contact TEXT,
    supp_ph_no TEXT,
    supp_cell_no TEXT,
    supp_fax_no TEXT,
    supp_email TEXT,
    supp_webadd TEXT,
    erp_user_code TEXT,
    pan_no TEXT,
    ifsc_code TEXT,
    ifsc_branch TEXT,
    supplier_group TEXT,
    jc_regis_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broker_master (
    brok_code TEXT PRIMARY KEY,
    brok_name TEXT NOT NULL,
    acc_no TEXT,
    brok_add1 TEXT,
    brok_add2 TEXT,
    brok_add3 TEXT,
    brok_city TEXT,
    brok_contact TEXT,
    brok_ph_no TEXT,
    brok_cell_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User & Authentication Logic
CREATE TABLE IF NOT EXISTS user_master (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS authentication_master (
    auth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_master(user_id),
    portal_access JSONB, -- JSON describing modules the user can access e.g. {"amad": true, "po": true}
    role_type TEXT, -- admin, operator, viewer
    last_login TIMESTAMP WITH TIME ZONE
);

-- 3. Core Module Tables (Optimized Standard Layouts per user's directive)
CREATE TABLE IF NOT EXISTS sauda_master (
    sauda_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year TEXT NOT NULL,
    sauda_no TEXT NOT NULL,
    session TEXT, 
    po_type TEXT,
    date DATE NOT NULL,
    broker TEXT,
    supplier TEXT,
    challan_supplier TEXT,
    area TEXT,
    agency TEXT,
    marks TEXT,
    no_of_lorries INTEGER,
    units_per_lorry_type TEXT,
    total_unit INTEGER,
    wt_per_lorry NUMERIC(15,3),
    unit_type TEXT,
    total_wt_in_ton NUMERIC(15,3),
    shipment_date DATE,
    shipment_days INTEGER,
    shipment_penalty NUMERIC(15,2),
    marks_claim NUMERIC(15,2),
    quantity_claim NUMERIC(15,2),
    remarks TEXT,
    b_rate NUMERIC(15,2),
    b_date DATE,
    superior_normal_marks TEXT,
    signature_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    open_remarks JSONB
);

CREATE TABLE IF NOT EXISTS sauda_quality_details (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sauda_id UUID REFERENCES sauda_master(sauda_id) ON DELETE CASCADE,
    financial_year TEXT,
    quality TEXT,
    qty NUMERIC(15,3),
    rs NUMERIC(15,2),
    agency TEXT,
    marka TEXT
);

CREATE TABLE IF NOT EXISTS issue_master ( -- Used for Amad Arrival Logic
    amad_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year TEXT NOT NULL,
    amad_no TEXT NOT NULL,
    date DATE NOT NULL,
    floor TEXT,
    chamber TEXT,
    farmer_name TEXT,
    acc_no TEXT,
    commodity TEXT,
    variety TEXT,
    grading TEXT,
    marka TEXT,
    bardana_type TEXT,
    vehicle_no TEXT,
    total_packets INTEGER,
    weight_qtl NUMERIC(15,2),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_master ( -- Purchase Order Header
    po_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year TEXT NOT NULL,
    purchase_order TEXT,
    po_type TEXT,
    ptf_no TEXT,
    pending BOOLEAN DEFAULT TRUE,
    po_no TEXT NOT NULL UNIQUE,
    po_date DATE NOT NULL,
    broker TEXT,
    supplier TEXT,
    challan_supplier TEXT,
    area TEXT,
    trans_paid_by TEXT,
    weight_unit_kgs NUMERIC(15,2),
    against_cancellation TEXT,
    purchase_unit_code TEXT,
    purchase_unit_name TEXT,
    total_lorries NUMERIC(15,2),
    units_per_lorry NUMERIC(15,2),
    total_units NUMERIC(15,2),
    weight_per_lorry NUMERIC(15,3),
    total_contract_mt NUMERIC(15,3),
    marka_type TEXT,
    marka_penalty NUMERIC(15,2),
    qty_penalty NUMERIC(15,2),
    delivery_from DATE,
    delivery_to DATE,
    grace_days INTEGER,
    delivery_penalty NUMERIC(15,2),
    contract_po_no TEXT,
    contract_date DATE,
    rate_detail TEXT,
    delivery_schedule TEXT,
    terms_condition TEXT,
    remarks TEXT,
    po_identification TEXT,
    b_rate NUMERIC(15,2),
    s_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_detail_master ( -- Purchase Order Items
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_no TEXT REFERENCES purchase_master(po_no) ON DELETE CASCADE,
    srl_no INTEGER,
    crop_year TEXT,
    grade_code TEXT,
    agency_code TEXT,
    marka_code TEXT,
    quantity INTEGER,
    weight_mt NUMERIC(15,3),
    rate_qntl NUMERIC(15,2),
    premium NUMERIC(15,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS temporary_po ( -- Temporary Purchase Order Header
    po_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year TEXT NOT NULL,
    purchase_order TEXT,
    po_type TEXT,
    ptf_no TEXT,
    pending BOOLEAN DEFAULT TRUE,
    po_no TEXT NOT NULL UNIQUE,
    po_date DATE NOT NULL,
    broker TEXT,
    supplier TEXT,
    challan_supplier TEXT,
    area TEXT,
    trans_paid_by TEXT,
    weight_unit_kgs NUMERIC(15,2),
    against_cancellation TEXT,
    purchase_unit_code TEXT,
    purchase_unit_name TEXT,
    total_lorries NUMERIC(15,2),
    units_per_lorry NUMERIC(15,2),
    total_units NUMERIC(15,2),
    weight_per_lorry NUMERIC(15,3),
    total_contract_mt NUMERIC(15,3),
    marka_type TEXT,
    marka_penalty NUMERIC(15,2),
    qty_penalty NUMERIC(15,2),
    delivery_from DATE,
    delivery_to DATE,
    grace_days INTEGER,
    delivery_penalty NUMERIC(15,2),
    contract_po_no TEXT,
    contract_date DATE,
    rate_detail TEXT,
    delivery_schedule TEXT,
    terms_condition TEXT,
    remarks TEXT,
    po_identification TEXT,
    b_rate NUMERIC(15,2),
    s_date DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temporary_po_details ( -- Temporary Purchase Order Items
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_no TEXT REFERENCES temporary_po(po_no) ON DELETE CASCADE,
    srl_no INTEGER,
    crop_year TEXT,
    grade_code TEXT,
    agency_code TEXT,
    marka_code TEXT,
    quantity INTEGER,
    weight_mt NUMERIC(15,3),
    rate_qntl NUMERIC(15,2),
    premium NUMERIC(15,2) DEFAULT 0
);

-- 4. Utility & Reporting Tables

-- SECURITY NOTE: This function allows executing arbitrary SQL.
-- it is required for the "Add Field" functionality in Admin Desk.
-- It is recommended to restrict this to only the dashboard user.
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

DROP FUNCTION IF EXISTS exec_sql_return(text);
CREATE OR REPLACE FUNCTION exec_sql_return(query text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r record;
BEGIN
    FOR r IN EXECUTE query LOOP
        RETURN NEXT to_jsonb(r);
    END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS report_master (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name TEXT,
    report_type TEXT,
    last_generated TIMESTAMP WITH TIME ZONE
);

-- Future Scalability Placeholders
CREATE TABLE IF NOT EXISTS satta_master (
    satta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    satta_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rule_master (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT,
    rule_definition JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unit Master Tables
CREATE TABLE IF NOT EXISTS unit_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE IF EXISTS unit_master DISABLE ROW LEVEL SECURITY;

INSERT INTO unit_master (unit_name)
VALUES ('DRUMS'), ('BALES'), ('LOOSE'), ('P.BALES'), ('H.BALES')
ON CONFLICT (unit_name) DO NOTHING;

-- 5. Arrival & Inspection Module Tables

CREATE TABLE IF NOT EXISTS temporary_material_received (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporary_arrival_no TEXT UNIQUE,
    amad_no TEXT,
    date DATE,
    po_no TEXT,
    po_date DATE,
    supplier TEXT,
    broker TEXT,
    agency TEXT,
    arrival_area_code TEXT,
    arrival_area_name TEXT,
    arrival_area TEXT,
    lorry_number TEXT,
    grid_details JSONB,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS final_arrival (
    final_arrival_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_arrival_no TEXT UNIQUE,
    mr_no TEXT,
    mr_date DATE,
    date DATE,
    po_no TEXT,
    po_date DATE,
    supplier TEXT,
    broker TEXT,
    challan_supplier TEXT,
    arrival_area_code TEXT,
    arrival_area_name TEXT,
    arrival_area TEXT,
    lorry_number TEXT,
    lorry_date DATE,
    lorry_returned TEXT DEFAULT 'No',
    lorry_returned_other_mill TEXT DEFAULT 'No',
    grid_details JSONB,
    details JSONB,
    items JSONB,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_master (
    mr_no TEXT PRIMARY KEY,
    mr_date DATE,
    date DATE,
    arrival_no TEXT,
    arrival_date DATE,
    po_no TEXT,
    po_date DATE,
    broker_name TEXT,
    supplier_name TEXT,
    arrival_area_code TEXT,
    arrival_area_name TEXT,
    arrival_area TEXT,
    grid_details JSONB,
    actual_moisture NUMERIC,
    claim_moisture NUMERIC,
    actual_dust NUMERIC,
    claim_dust NUMERIC,
    actual_ncv NUMERIC,
    claim_ncv NUMERIC,
    detention_days NUMERIC,
    unloading_date DATE,
    mill_po_no TEXT,
    mill_po_date DATE,
    mr_spcl_print TEXT,
    remarks TEXT,
    lorry_number TEXT,
    delivery_claim NUMERIC DEFAULT 0,
    deduction_type TEXT,
    deduction_rate NUMERIC DEFAULT 0,
    deduction_qty NUMERIC DEFAULT 0,
    deduction_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_details (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    mr_no TEXT REFERENCES inspection_master(mr_no) ON DELETE CASCADE,
    srl_no INTEGER,
    arrival_grade TEXT,
    stock_grade_code TEXT,
    stock_grade_name TEXT,
    area TEXT,
    agency TEXT,
    marka TEXT,
    marks TEXT,
    crop_year TEXT,
    lot TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'BALES',
    challan_gross_wt NUMERIC DEFAULT 0,
    receipt_gross_wt NUMERIC DEFAULT 0,
    gross_weight_batch NUMERIC DEFAULT 0,
    add_weight NUMERIC DEFAULT 0,
    less_weight NUMERIC DEFAULT 0,
    reduced_weight NUMERIC DEFAULT 0,
    lorry_moisture_min NUMERIC DEFAULT 0,
    lorry_moisture_max NUMERIC DEFAULT 0,
    lorry_read_min NUMERIC DEFAULT 0,
    lorry_read_max NUMERIC DEFAULT 0,
    lorry_read_avg NUMERIC DEFAULT 0,
    insp_read_min NUMERIC DEFAULT 0,
    insp_read_max NUMERIC DEFAULT 0,
    insp_read_avg NUMERIC DEFAULT 0,
    moisture_act NUMERIC DEFAULT 0,
    moisture_claim NUMERIC DEFAULT 0,
    dust_act NUMERIC DEFAULT 0,
    dust_claim NUMERIC DEFAULT 0,
    ncv_act NUMERIC DEFAULT 0,
    ncv_claim NUMERIC DEFAULT 0,
    grade_down_act NUMERIC DEFAULT 0,
    grade_down_claim NUMERIC DEFAULT 0,
    final_receipt_wt NUMERIC DEFAULT 0,
    settlement_moisture NUMERIC DEFAULT 0,
    settlement_grade_down NUMERIC DEFAULT 0,
    settlement_dust NUMERIC DEFAULT 0,
    settlement_ncv NUMERIC DEFAULT 0,
    ropes_weight NUMERIC DEFAULT 0,
    ropes_tot_wt_grd NUMERIC DEFAULT 0,
    ropes_grade TEXT,
    chotta_weight NUMERIC DEFAULT 0,
    chotta_tot_wt_grd NUMERIC DEFAULT 0,
    chotta_grade TEXT,
    tolerable TEXT,
    row_remarks TEXT,
    jqi_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_checklist (
    mr_no TEXT PRIMARY KEY,
    mr_date DATE,
    date DATE,
    arrival_no TEXT,
    arrival_date DATE,
    po_no TEXT,
    po_date DATE,
    broker_name TEXT,
    supplier_name TEXT,
    arrival_area_code TEXT,
    arrival_area_name TEXT,
    arrival_area TEXT,
    grid_details JSONB,
    actual_moisture NUMERIC,
    claim_moisture NUMERIC,
    actual_dust NUMERIC,
    claim_dust NUMERIC,
    actual_ncv NUMERIC,
    claim_ncv NUMERIC,
    detention_days NUMERIC,
    unloading_date DATE,
    mill_po_no TEXT,
    mill_po_date DATE,
    mr_spcl_print TEXT,
    remarks TEXT,
    lorry_number TEXT,
    delivery_claim NUMERIC DEFAULT 0,
    deduction_type TEXT,
    deduction_rate NUMERIC DEFAULT 0,
    deduction_qty NUMERIC DEFAULT 0,
    deduction_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_checklist_details (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    mr_no TEXT REFERENCES inspection_checklist(mr_no) ON DELETE CASCADE,
    srl_no INTEGER,
    arrival_grade TEXT,
    stock_grade_code TEXT,
    stock_grade_name TEXT,
    area TEXT,
    agency TEXT,
    marka TEXT,
    marks TEXT,
    crop_year TEXT,
    lot TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'BALES',
    challan_gross_wt NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mill_inspection_master (
    mr_no TEXT PRIMARY KEY,
    mr_date DATE,
    date DATE,
    arrival_no TEXT,
    arrival_date DATE,
    po_no TEXT,
    po_date DATE,
    broker_name TEXT,
    supplier_name TEXT,
    arrival_area_code TEXT,
    arrival_area_name TEXT,
    arrival_area TEXT,
    grid_details JSONB,
    actual_moisture NUMERIC,
    claim_moisture NUMERIC,
    actual_dust NUMERIC,
    claim_dust NUMERIC,
    actual_ncv NUMERIC,
    claim_ncv NUMERIC,
    lorry_number TEXT,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mill_inspection_detail (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    mr_no TEXT REFERENCES mill_inspection_master(mr_no) ON DELETE CASCADE,
    srl_no INTEGER,
    arrival_grade TEXT,
    stock_grade_code TEXT,
    stock_grade_name TEXT,
    area TEXT,
    agency TEXT,
    marka TEXT,
    marks TEXT,
    crop_year TEXT,
    lot TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'BALES',
    challan_gross_wt NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SAUDA CHECK POINT TABLE (WITH open_remarks JSONB AS LAST FIELD)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sauda_check_point (
    po_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year TEXT NOT NULL,
    purchase_order TEXT,
    po_type TEXT,
    ptf_no TEXT,
    pending BOOLEAN DEFAULT TRUE,
    po_no TEXT NOT NULL UNIQUE,
    po_date DATE NOT NULL,
    broker TEXT,
    supplier TEXT,
    challan_supplier TEXT,
    area TEXT,
    trans_paid_by TEXT,
    weight_unit_kgs NUMERIC(15,2),
    against_cancellation TEXT,
    purchase_unit_code TEXT,
    purchase_unit_name TEXT,
    total_lorries NUMERIC(15,2),
    units_per_lorry NUMERIC(15,2),
    total_units NUMERIC(15,2),
    weight_per_lorry NUMERIC(15,3),
    total_contract_mt NUMERIC(15,3),
    marka_type TEXT,
    marka_penalty NUMERIC(15,2),
    qty_penalty NUMERIC(15,2),
    delivery_from DATE,
    delivery_to DATE,
    grace_days INTEGER,
    delivery_penalty NUMERIC(15,2),
    contract_po_no TEXT,
    contract_date DATE,
    rate_detail TEXT,
    delivery_schedule TEXT,
    terms_condition TEXT,
    remarks TEXT,
    po_identification TEXT,
    b_rate NUMERIC(15,2),
    s_date DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    open_remarks JSONB
);

CREATE TABLE IF NOT EXISTS sauda_check_point_details (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_no TEXT REFERENCES sauda_check_point(po_no) ON DELETE CASCADE,
    srl_no INTEGER,
    crop_year TEXT,
    grade_code TEXT,
    agency_code TEXT,
    marka_code TEXT,
    quantity INTEGER,
    weight_mt NUMERIC(15,3),
    rate_qntl NUMERIC(15,2),
    premium NUMERIC(15,2) DEFAULT 0
);

ALTER TABLE IF EXISTS sauda_check_point ADD COLUMN IF NOT EXISTS open_remarks JSONB;
ALTER TABLE IF EXISTS sauda_check_point ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS sauda_check_point_details ADD COLUMN IF NOT EXISTS rate_qntl NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS sauda_check_point_details ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS sauda_master ADD COLUMN IF NOT EXISTS open_remarks JSONB;
ALTER TABLE IF EXISTS purchase_master ADD COLUMN IF NOT EXISTS open_remarks JSONB;

CREATE TABLE IF NOT EXISTS payment_master (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date DATE,
    financial_year TEXT,
    payment_date DATE,
    mr_no TEXT,
    mr_date DATE,
    arrival_no TEXT,
    arrival_date DATE,
    po_no TEXT,
    po_date DATE,
    supplier TEXT,
    party_name TEXT,
    broker TEXT,
    arrival_area TEXT,
    total_packets NUMERIC(15,2) DEFAULT 0,
    total_weight NUMERIC(15,3) DEFAULT 0,
    b_rate NUMERIC(15,2) DEFAULT 0,
    premium NUMERIC(15,2) DEFAULT 0,
    gross_amount NUMERIC(15,2) DEFAULT 0,
    sett_amount NUMERIC(15,2) DEFAULT 0,
    deduction_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    payable_amt NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    net_amt NUMERIC(15,2) DEFAULT 0,
    tds_amt NUMERIC(15,2) DEFAULT 0,
    claim_amount NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'Completed',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_details (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    payment_id UUID REFERENCES payment_master(payment_id) ON DELETE CASCADE,
    voucher_no TEXT,
    mr_no TEXT,
    col_index INTEGER,
    grade TEXT,
    area TEXT,
    agency TEXT,
    marka_crop TEXT,
    quantity NUMERIC(15,2) DEFAULT 0,
    arr_qty_wt NUMERIC(15,3) DEFAULT 0,
    min_qty_wt NUMERIC(15,3) DEFAULT 0,
    wt_phota NUMERIC(15,3) DEFAULT 0,
    wt_quantity NUMERIC(15,3) DEFAULT 0,
    rate_value NUMERIC(15,2) DEFAULT 0,
    premium NUMERIC(15,2) DEFAULT 0,
    sett_pct NUMERIC(15,2) DEFAULT 0,
    deduction_rate NUMERIC(15,2) DEFAULT 0,
    sett_rate NUMERIC(15,2) DEFAULT 0,
    quantity_qtl NUMERIC(15,3) DEFAULT 0,
    amount NUMERIC(15,2) DEFAULT 0,
    gd_claim NUMERIC(15,2) DEFAULT 0,
    gd_sett NUMERIC(15,2) DEFAULT 0,
    gd_rev NUMERIC(15,2) DEFAULT 0,
    gd_final NUMERIC(15,2) DEFAULT 0,
    moist_claim NUMERIC(15,2) DEFAULT 0,
    moist_sett NUMERIC(15,2) DEFAULT 0,
    moist_rev NUMERIC(15,2) DEFAULT 0,
    moist_final NUMERIC(15,2) DEFAULT 0,
    dust_claim NUMERIC(15,2) DEFAULT 0,
    dust_sett NUMERIC(15,2) DEFAULT 0,
    dust_rev NUMERIC(15,2) DEFAULT 0,
    dust_final NUMERIC(15,2) DEFAULT 0,
    ncv_claim NUMERIC(15,2) DEFAULT 0,
    ncv_sett NUMERIC(15,2) DEFAULT 0,
    ncv_rev NUMERIC(15,2) DEFAULT 0,
    ncv_final NUMERIC(15,2) DEFAULT 0,
    po_grade_claim NUMERIC(15,2) DEFAULT 0,
    po_grade_sett NUMERIC(15,2) DEFAULT 0,
    po_grade_rev NUMERIC(15,2) DEFAULT 0,
    po_grade_final NUMERIC(15,2) DEFAULT 0,
    adjust_type TEXT,
    remark TEXT,
    claim_settlement NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schema Migrations & Alterations for New Rate & Premium Fields
ALTER TABLE IF EXISTS purchase_detail_master ADD COLUMN IF NOT EXISTS rate_qntl NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS purchase_detail_master ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS temporary_po_details ADD COLUMN IF NOT EXISTS rate_qntl NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS temporary_po_details ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS purchase_master ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS sauda_check_point ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS sauda_quality_details ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS premium NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS sett_rate NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS deduction_rate NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS sett_pct NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS rate_value NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS quantity_qtl NUMERIC(15,3) DEFAULT 0;
ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;

-- Disable RLS where appropriate for custom app access
ALTER TABLE IF EXISTS payment_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_detail_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS temporary_po_details DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HIGH PERFORMANCE COMPOSITE INDEXES FOR REDUCING DISK I/O & EGRESS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sauda_status_created ON sauda_master(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sauda_check_point_po_status ON sauda_check_point(po_no, status);
CREATE INDEX IF NOT EXISTS idx_purchase_master_po_status ON purchase_master(po_no, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_detail_po_grade ON purchase_detail_master(po_no, grade_code);
CREATE INDEX IF NOT EXISTS idx_temp_arrival_po_created ON temporary_material_received(po_no, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_final_arrival_no_status ON final_arrival(final_arrival_no, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_mr_status ON inspection_master(mr_no, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mill_inspection_mr_po ON mill_inspection_master(mr_no, po_no, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_master_supp_po ON payment_master(supplier, po_no, mr_no);
CREATE INDEX IF NOT EXISTS idx_payment_details_voucher ON payment_details(voucher_no, mr_no);
CREATE INDEX IF NOT EXISTS idx_material_issue_no_date ON material_issue_master(issue_no, date DESC);
CREATE INDEX IF NOT EXISTS idx_material_mismatch_created ON material_mismatch(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_satta_mismatch_created ON satta_mismatch(created_at DESC);

-- ============================================================================
-- CLUB P.O & ARRIVAL MANUAL HISTORY TABLE (clubbed_pomr)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clubbed_pomr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id TEXT UNIQUE NOT NULL,
    clubbed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    primary_po_no TEXT NOT NULL,
    po_no TEXT,
    ptf_no TEXT,
    po_date TEXT,
    clubbed_po_nos JSONB DEFAULT '[]'::jsonb,
    po_nos TEXT,
    primary_mr_no TEXT,
    mr_no TEXT,
    final_arrival_no TEXT,
    temporary_arrival_no TEXT,
    arrival_date TEXT,
    clubbed_mr_nos JSONB DEFAULT '[]'::jsonb,
    amad_nos TEXT,
    supplier TEXT,
    challan_supplier TEXT,
    broker TEXT,
    area TEXT,
    lorry_number TEXT,
    challan_no TEXT,
    packets NUMERIC(15,2) DEFAULT 0,
    total_po_lorries INTEGER DEFAULT 1,
    received_lorries_count INTEGER DEFAULT 1,
    total_po_weight NUMERIC(15,3) DEFAULT 0,
    total_received_weight NUMERIC(15,3) DEFAULT 0,
    total_weight_mt NUMERIC(15,3) DEFAULT 0,
    variance_pct NUMERIC(15,2) DEFAULT 0,
    recorded_by TEXT,
    clubbed_by TEXT,
    remarks TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unclubbed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS clubbed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS po_no TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS ptf_no TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS po_date TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS po_nos TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS mr_no TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS final_arrival_no TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS temporary_arrival_no TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS arrival_date TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS amad_nos TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS challan_supplier TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS broker TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS lorry_number TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS challan_no TEXT;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS packets NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS total_po_lorries INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS received_lorries_count INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS total_po_weight NUMERIC(15,3) DEFAULT 0;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS total_received_weight NUMERIC(15,3) DEFAULT 0;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS variance_pct NUMERIC(15,2) DEFAULT 0;
ALTER TABLE IF EXISTS clubbed_pomr ADD COLUMN IF NOT EXISTS recorded_by TEXT;
ALTER TABLE IF EXISTS clubbed_pomr DISABLE ROW LEVEL SECURITY;
