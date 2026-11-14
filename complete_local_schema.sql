-- ==============================================================================
-- Bally Jute - 100% Complete Supabase PostgreSQL Database Schema (All 82 Tables & Functions)
-- Generated from live Supabase Cloud project lxuapkccxaadwixjpirs
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: "agency_master"
CREATE TABLE IF NOT EXISTS "agency_master" (
  "area_code" TEXT,
  "agency_code" TEXT NOT NULL,
  "agency_name" TEXT NOT NULL,
  "id" BIGINT NOT NULL,
  "area_name" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "amad_change_history"
CREATE TABLE IF NOT EXISTS "amad_change_history" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "amad_no" TEXT NOT NULL,
  "amad_id" TEXT,
  "action_type" TEXT NOT NULL,
  "modified_by" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ DEFAULT now(),
  "old_values" TEXT,
  "new_values" TEXT,
  "changes_summary" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "app_audit_logs"
CREATE TABLE IF NOT EXISTS "app_audit_logs" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "module" TEXT NOT NULL,
  "entity_name" TEXT,
  "record_id" TEXT,
  "action" TEXT DEFAULT 'UPDATE'::text NOT NULL,
  "field_name" TEXT,
  "field_label" TEXT,
  "old_value" TEXT,
  "new_value" TEXT,
  "user_name" TEXT NOT NULL,
  "user_role" TEXT,
  "remarks" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "area_master"
CREATE TABLE IF NOT EXISTS "area_master" (
  "area_code" TEXT NOT NULL,
  "area_name" TEXT NOT NULL,
  "id" BIGINT NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: "batch_master"
CREATE TABLE IF NOT EXISTS "batch_master" (
  "code" TEXT NOT NULL,
  "batch_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("code")
);

-- Table: "broker_master"
CREATE TABLE IF NOT EXISTS "broker_master" (
  "brok_code" TEXT NOT NULL,
  "brok_name" TEXT NOT NULL,
  "acc_no" TEXT,
  "brok_add1" TEXT,
  "brok_add2" TEXT,
  "brok_add3" TEXT,
  "brok_city" TEXT,
  "brok_contact" TEXT,
  "brok_ph_no" TEXT,
  "brok_cell_no" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "id" BIGINT NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: "closing_stock"
CREATE TABLE IF NOT EXISTS "closing_stock" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "stock_date" DATE NOT NULL,
  "godown" VARCHAR(50) NOT NULL,
  "commodity" VARCHAR(100) DEFAULT 'RAW JUTE'::character varying,
  "variety" VARCHAR(50),
  "grade" VARCHAR(50),
  "no_of_bales" INTEGER DEFAULT 0,
  "weight_qtl" NUMERIC(10, 2) DEFAULT 0.0,
  "rate_per_qtl" NUMERIC(10, 2) DEFAULT 0.0,
  "total_value" NUMERIC(12, 2) DEFAULT 0.0,
  "recorded_by" VARCHAR(100) DEFAULT 'ADMIN'::character varying,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "area" VARCHAR(150),
  "jci" VARCHAR(50) DEFAULT 'No'::character varying,
  "unit" VARCHAR(50) DEFAULT 'BALES'::character varying,
  "quantity" NUMERIC(15, 3) DEFAULT 0.00,
  PRIMARY KEY ("id")
);

-- Table: "clubbed_pomr"
CREATE TABLE IF NOT EXISTS "clubbed_pomr" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "club_id" TEXT NOT NULL,
  "clubbed_at" TIMESTAMPTZ DEFAULT now(),
  "primary_po_no" TEXT NOT NULL,
  "po_no" TEXT,
  "ptf_no" TEXT,
  "po_date" TEXT,
  "clubbed_po_nos" JSONB DEFAULT '[]'::jsonb,
  "po_nos" TEXT,
  "primary_mr_no" TEXT,
  "mr_no" TEXT,
  "final_arrival_no" TEXT,
  "temporary_arrival_no" TEXT,
  "arrival_date" TEXT,
  "clubbed_mr_nos" JSONB DEFAULT '[]'::jsonb,
  "amad_nos" TEXT,
  "supplier" TEXT,
  "challan_supplier" TEXT,
  "broker" TEXT,
  "area" TEXT,
  "lorry_number" TEXT,
  "challan_no" TEXT,
  "packets" NUMERIC(15, 2) DEFAULT 0,
  "total_po_lorries" INTEGER DEFAULT 1,
  "received_lorries_count" INTEGER DEFAULT 1,
  "total_po_weight" NUMERIC(15, 3) DEFAULT 0,
  "total_received_weight" NUMERIC(15, 3) DEFAULT 0,
  "total_weight_mt" NUMERIC(15, 3) DEFAULT 0,
  "variance_pct" NUMERIC(15, 2) DEFAULT 0,
  "recorded_by" TEXT,
  "clubbed_by" TEXT,
  "remarks" TEXT,
  "status" TEXT DEFAULT 'ACTIVE'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "unclubbed_at" TIMESTAMPTZ,
  PRIMARY KEY ("id")
);

-- Table: "customer_master"
CREATE TABLE IF NOT EXISTS "customer_master" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "firm_name" TEXT,
  "proprietor_name" TEXT,
  "email" TEXT,
  "contact_number" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id", "contact_number")
);

-- Table: "deduction_master"
CREATE TABLE IF NOT EXISTS "deduction_master" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "deduction" TEXT NOT NULL,
  "rate_per_qntl" NUMERIC(15, 2),
  "rate_per_unit" NUMERIC(15, 2),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "is_active" BOOLEAN DEFAULT true,
  PRIMARY KEY ("id")
);

-- Table: "department_master"
CREATE TABLE IF NOT EXISTS "department_master" (
  "dept_code" TEXT NOT NULL,
  "dept_name" TEXT NOT NULL,
  "location" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("dept_code")
);

-- Table: "final_arrival"
CREATE TABLE IF NOT EXISTS "final_arrival" (
  "final_arrival_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "id" UUID DEFAULT gen_random_uuid(),
  "financial_year" TEXT,
  "temporary_arrival_no" TEXT,
  "temporary_arrival_date" DATE,
  "final_arrival_no" TEXT,
  "final_arrival_date" DATE,
  "date" DATE,
  "po_no" TEXT,
  "po_date" DATE,
  "jci" TEXT DEFAULT 'No'::text,
  "challan_supplier" TEXT,
  "supplier" TEXT,
  "broker" TEXT,
  "transporter_name" TEXT,
  "challan_rr_no" TEXT,
  "challan_rr_date" DATE,
  "lorry_no" TEXT,
  "pan_no" TEXT,
  "consignment_note_no" TEXT,
  "consignment_note_date" DATE,
  "di_no" TEXT,
  "di_date" DATE,
  "invoice_no" TEXT,
  "invoice_date" DATE,
  "ptf" TEXT DEFAULT 'No'::text,
  "lorry_returned" TEXT DEFAULT 'No'::text,
  "lorry_returned_other_mill" TEXT DEFAULT 'No'::text,
  "arrival_area_code" TEXT,
  "arrival_area_name" TEXT,
  "unit_code" TEXT DEFAULT 'I'::text,
  "unit_name" TEXT DEFAULT 'BALES'::text,
  "way_bill_no" TEXT,
  "way_bill_date" DATE,
  "apmc_fees" NUMERIC(15, 2) DEFAULT 0.00,
  "remarks" TEXT,
  "total_packets" INTEGER DEFAULT 0,
  "weight_qtl" NUMERIC(15, 3) DEFAULT 0.000,
  "grid_details" JSONB,
  "challan_material_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "actual_gross_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "actual_tare_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "supplier_net_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "supplier_challan_gross" NUMERIC(15, 3) DEFAULT 0.000,
  "supplier_tare_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "electronic_net_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "electronic_gross_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "electronic_tare_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "weight_reduced" NUMERIC(15, 3) DEFAULT 0.000,
  "mr_no" TEXT,
  "mr_date" DATE,
  "broker_name" TEXT,
  "supplier_name" TEXT,
  "actual_moisture" NUMERIC(15, 3),
  "claim_moisture" NUMERIC(15, 3),
  "actual_dust" NUMERIC(15, 3),
  "claim_dust" NUMERIC(15, 3),
  "actual_ncv" NUMERIC(15, 3),
  "claim_ncv" NUMERIC(15, 3),
  "detention_days" INTEGER,
  "unloading_date" DATE,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "status" TEXT DEFAULT 'active'::text,
  "lorry_number" TEXT,
  "lorry_date" DATE,
  "consignment_note" TEXT,
  "challan_railway_receipt_no" TEXT,
  "arrival_no" TEXT,
  "jci_no" TEXT,
  "part_no" TEXT,
  "part_date" DATE,
  "area" TEXT,
  "rfs" TEXT DEFAULT 'No'::text,
  "rr_gr_no" TEXT,
  "arrival_date" DATE,
  PRIMARY KEY ("final_arrival_id")
);

-- Table: "financial_year_master"
CREATE TABLE IF NOT EXISTS "financial_year_master" (
  "year_code" TEXT NOT NULL,
  "start_date" DATE,
  "end_date" DATE,
  "is_active" BOOLEAN DEFAULT true,
  PRIMARY KEY ("year_code")
);

-- Table: "godown_audit"
CREATE TABLE IF NOT EXISTS "godown_audit" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "timestamp" TIMESTAMPTZ DEFAULT now(),
  "operator_id" TEXT DEFAULT 'OPERATOR-01'::text,
  "action_type" TEXT,
  "quantity" INTEGER,
  "item_type" TEXT,
  "source_ref" TEXT,
  "dest_ref" TEXT,
  "voucher_no" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "godown_entry"
CREATE TABLE IF NOT EXISTS "godown_entry" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "voucher_no" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "gdn_code" TEXT,
  "item_type" TEXT DEFAULT 'Jute Bales'::text,
  "account_name" TEXT,
  "quantity" INTEGER DEFAULT 0,
  "rate" NUMERIC(15, 2) DEFAULT 0.00,
  "amount" NUMERIC(15, 2) DEFAULT 0.00,
  "narration" TEXT,
  "voucher_type" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "godown_master"
CREATE TABLE IF NOT EXISTS "godown_master" (
  "gdn_code" TEXT NOT NULL,
  "gdn_name" TEXT NOT NULL,
  "gdn_capacity" NUMERIC(15, 2),
  "gdn_short_name" TEXT,
  "id" BIGINT NOT NULL,
  "gdn_location" TEXT,
  "location" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "godown_to_factory_detail"
CREATE TABLE IF NOT EXISTS "godown_to_factory_detail" (
  "detail_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "issue_no" TEXT NOT NULL,
  "srl" INTEGER NOT NULL,
  "crop" TEXT DEFAULT '2025-26'::text,
  "grade_name" TEXT,
  "marka" TEXT DEFAULT 'NO MARK'::text,
  "qty" NUMERIC(15, 2) DEFAULT 0.00,
  "weight_kgs" NUMERIC(15, 3) DEFAULT 0.00,
  "area" TEXT,
  "agency" TEXT,
  "code" TEXT,
  "batch_name" TEXT,
  "unit" TEXT,
  "place" TEXT,
  "itg_no" TEXT,
  "rate" NUMERIC(15, 2),
  "location_dest" TEXT,
  "godown_splits" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("detail_id")
);

-- Table: "godown_to_factory_master"
CREATE TABLE IF NOT EXISTS "godown_to_factory_master" (
  "issue_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT DEFAULT '2026-2027'::text NOT NULL,
  "issue_no" TEXT NOT NULL,
  "date" DATE DEFAULT CURRENT_DATE NOT NULL,
  "issue_type" TEXT DEFAULT 'FACTORY'::text,
  "department" TEXT,
  "godown" TEXT,
  "stock_group" TEXT DEFAULT 'RAW JUTE'::text,
  "remarks" TEXT,
  "requisition_no" TEXT,
  "requisition_date" DATE,
  "issued_for" TEXT,
  "batch_order" TEXT,
  "vehicle_no" TEXT,
  "issued_by" TEXT,
  "received_by" TEXT,
  "status" TEXT DEFAULT 'active'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("issue_id")
);

-- Table: "godown_wise_stock"
CREATE TABLE IF NOT EXISTS "godown_wise_stock" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "stock_date" DATE NOT NULL,
  "godown" VARCHAR(150) NOT NULL,
  "area" VARCHAR(150),
  "grade" VARCHAR(150),
  "jci" VARCHAR(50) DEFAULT 'No'::character varying,
  "unit" VARCHAR(50) DEFAULT 'BALES'::character varying,
  "quantity" NUMERIC(15, 3) DEFAULT 0.00 NOT NULL,
  "weight" NUMERIC(15, 3) DEFAULT 0.00 NOT NULL,
  "avg_weight" NUMERIC(15, 3) DEFAULT 0.00 NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "grade_master"
CREATE TABLE IF NOT EXISTS "grade_master" (
  "grade_code" TEXT NOT NULL,
  "grade_name" TEXT NOT NULL,
  "id" BIGINT NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: "imap_emails"
CREATE TABLE IF NOT EXISTS "imap_emails" (
  "id" TEXT NOT NULL,
  "subject" TEXT,
  "sender_name" TEXT,
  "sender_email" TEXT,
  "date" TIMESTAMPTZ,
  "snippet" TEXT,
  "body" TEXT,
  "unread" BOOLEAN DEFAULT true,
  "starred" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "attachments" TEXT,
  "html" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "inspection_checklist_details"
CREATE TABLE IF NOT EXISTS "inspection_checklist_details" (
  "id" BIGINT NOT NULL,
  "mr_no" TEXT,
  "srl_no" INTEGER,
  "arrival_grade" TEXT,
  "stock_grade_code" TEXT,
  "stock_grade_name" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marka" TEXT,
  "crop_year" TEXT,
  "lot" TEXT,
  "quantity" NUMERIC DEFAULT 0,
  "unit" TEXT DEFAULT 'BALES'::text,
  "challan_gross_wt" NUMERIC DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "marks" TEXT,
  "receipt_gross_wt" NUMERIC DEFAULT 0,
  "gross_weight_batch" NUMERIC DEFAULT 0,
  "add_weight" NUMERIC DEFAULT 0,
  "less_weight" NUMERIC DEFAULT 0,
  "reduced_weight" NUMERIC DEFAULT 0,
  "lorry_moisture_min" NUMERIC DEFAULT 0,
  "lorry_moisture_max" NUMERIC DEFAULT 0,
  "lorry_read_min" NUMERIC DEFAULT 0,
  "lorry_read_max" NUMERIC DEFAULT 0,
  "lorry_read_avg" NUMERIC DEFAULT 0,
  "insp_read_min" NUMERIC DEFAULT 0,
  "insp_read_max" NUMERIC DEFAULT 0,
  "insp_read_avg" NUMERIC DEFAULT 0,
  "moisture_act" NUMERIC DEFAULT 0,
  "moisture_claim" NUMERIC DEFAULT 0,
  "dust_act" NUMERIC DEFAULT 0,
  "dust_claim" NUMERIC DEFAULT 0,
  "ncv_act" NUMERIC DEFAULT 0,
  "ncv_claim" NUMERIC DEFAULT 0,
  "grade_down_act" NUMERIC DEFAULT 0,
  "grade_down_claim" NUMERIC DEFAULT 0,
  "final_receipt_wt" NUMERIC DEFAULT 0,
  "settlement_moisture" NUMERIC DEFAULT 0,
  "settlement_grade_down" NUMERIC DEFAULT 0,
  "settlement_dust" NUMERIC DEFAULT 0,
  "settlement_ncv" NUMERIC DEFAULT 0,
  "ropes_weight" NUMERIC DEFAULT 0,
  "ropes_tot_wt_grd" NUMERIC DEFAULT 0,
  "ropes_grade" TEXT,
  "chotta_weight" NUMERIC DEFAULT 0,
  "chotta_tot_wt_grd" NUMERIC DEFAULT 0,
  "chotta_grade" TEXT,
  "tolerable" TEXT,
  "row_remarks" TEXT,
  "jqi_remarks" TEXT,
  "jci_remarks" TEXT,
  "premium" TEXT,
  "is_premium" BOOLEAN DEFAULT false,
  "rate" NUMERIC DEFAULT 0,
  "rate_qntl" NUMERIC DEFAULT 0,
  "agency_code" TEXT,
  "actual_moisture" NUMERIC DEFAULT 0,
  "claim_moisture" NUMERIC DEFAULT 0,
  "actual_dust" NUMERIC DEFAULT 0,
  "claim_dust" NUMERIC DEFAULT 0,
  "actual_ncv" NUMERIC DEFAULT 0,
  "claim_ncv" NUMERIC DEFAULT 0,
  "actual_grade_down" NUMERIC DEFAULT 0,
  "claim_grade_down" NUMERIC DEFAULT 0,
  "amount" NUMERIC DEFAULT 0,
  PRIMARY KEY ("id")
);

-- Table: "inspection_details"
CREATE TABLE IF NOT EXISTS "inspection_details" (
  "id" BIGINT NOT NULL,
  "mr_no" TEXT,
  "srl_no" INTEGER,
  "arrival_grade" TEXT,
  "stock_grade_code" TEXT,
  "stock_grade_name" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marka" TEXT,
  "crop_year" TEXT,
  "lot" TEXT,
  "quantity" NUMERIC DEFAULT 0,
  "unit" TEXT DEFAULT 'BALES'::text,
  "challan_gross_wt" NUMERIC DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "marks" TEXT,
  "receipt_gross_wt" NUMERIC DEFAULT 0,
  "gross_weight_batch" NUMERIC DEFAULT 0,
  "add_weight" NUMERIC DEFAULT 0,
  "less_weight" NUMERIC DEFAULT 0,
  "reduced_weight" NUMERIC DEFAULT 0,
  "lorry_moisture_min" NUMERIC DEFAULT 0,
  "lorry_moisture_max" NUMERIC DEFAULT 0,
  "lorry_read_min" NUMERIC DEFAULT 0,
  "lorry_read_max" NUMERIC DEFAULT 0,
  "lorry_read_avg" NUMERIC DEFAULT 0,
  "insp_read_min" NUMERIC DEFAULT 0,
  "insp_read_max" NUMERIC DEFAULT 0,
  "insp_read_avg" NUMERIC DEFAULT 0,
  "moisture_act" NUMERIC DEFAULT 0,
  "moisture_claim" NUMERIC DEFAULT 0,
  "dust_act" NUMERIC DEFAULT 0,
  "dust_claim" NUMERIC DEFAULT 0,
  "ncv_act" NUMERIC DEFAULT 0,
  "ncv_claim" NUMERIC DEFAULT 0,
  "grade_down_act" NUMERIC DEFAULT 0,
  "grade_down_claim" NUMERIC DEFAULT 0,
  "final_receipt_wt" NUMERIC DEFAULT 0,
  "settlement_moisture" NUMERIC DEFAULT 0,
  "settlement_grade_down" NUMERIC DEFAULT 0,
  "settlement_dust" NUMERIC DEFAULT 0,
  "settlement_ncv" NUMERIC DEFAULT 0,
  "ropes_weight" NUMERIC DEFAULT 0,
  "ropes_tot_wt_grd" NUMERIC DEFAULT 0,
  "ropes_grade" TEXT,
  "chotta_weight" NUMERIC DEFAULT 0,
  "chotta_tot_wt_grd" NUMERIC DEFAULT 0,
  "chotta_grade" TEXT,
  "tolerable" TEXT,
  "row_remarks" TEXT,
  "jqi_remarks" TEXT,
  "jci_remarks" TEXT,
  "premium" TEXT,
  "is_premium" BOOLEAN DEFAULT false,
  "rate" NUMERIC DEFAULT 0,
  "rate_qntl" NUMERIC DEFAULT 0,
  "agency_code" TEXT,
  "actual_moisture" NUMERIC DEFAULT 0,
  "claim_moisture" NUMERIC DEFAULT 0,
  "actual_dust" NUMERIC DEFAULT 0,
  "claim_dust" NUMERIC DEFAULT 0,
  "actual_ncv" NUMERIC DEFAULT 0,
  "claim_ncv" NUMERIC DEFAULT 0,
  "actual_grade_down" NUMERIC DEFAULT 0,
  "claim_grade_down" NUMERIC DEFAULT 0,
  "amount" NUMERIC DEFAULT 0,
  PRIMARY KEY ("id")
);

-- Table: "inspection_master"
CREATE TABLE IF NOT EXISTS "inspection_master" (
  "mr_no" TEXT NOT NULL,
  "mr_date" DATE,
  "date" DATE,
  "arrival_no" TEXT,
  "arrival_date" DATE,
  "po_no" TEXT,
  "po_date" DATE,
  "broker_name" TEXT,
  "supplier_name" TEXT,
  "actual_moisture" NUMERIC,
  "claim_moisture" NUMERIC,
  "actual_dust" NUMERIC,
  "claim_dust" NUMERIC,
  "actual_ncv" NUMERIC,
  "claim_ncv" NUMERIC,
  "detention_days" NUMERIC,
  "unloading_date" DATE,
  "mill_po_no" TEXT,
  "mill_po_date" DATE,
  "mr_spcl_print" TEXT,
  "remarks" TEXT,
  "lorry_number" TEXT,
  "delivery_claim" NUMERIC DEFAULT 0,
  "deduction_type" TEXT,
  "deduction_rate" NUMERIC DEFAULT 0,
  "deduction_qty" NUMERIC DEFAULT 0,
  "deduction_amount" NUMERIC DEFAULT 0,
  "status" TEXT DEFAULT 'Completed'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "deduction_types" JSONB,
  "arrival_area_code" TEXT,
  "arrival_area_name" TEXT,
  "arrival_area" TEXT,
  "grid_details" JSONB,
  "details" JSONB,
  "arival_apmc_fees" NUMERIC DEFAULT 0,
  "broker" TEXT,
  "supplier" TEXT,
  "quality_matrix" JSONB,
  "advance_amount" NUMERIC DEFAULT 0,
  "on_account_advance_amount" NUMERIC DEFAULT 0,
  "settlement_amount" NUMERIC DEFAULT 0,
  "sent_settlement_date" DATE,
  "lorry_returned" TEXT,
  "lorry_returned_other_mill" TEXT,
  "mr_print_date" DATE,
  "consignment_no" TEXT,
  "consignment_date" DATE,
  "arrival_remarks" TEXT,
  "deductions" JSONB,
  PRIMARY KEY ("mr_no")
);

-- Table: "issue_master"
CREATE TABLE IF NOT EXISTS "issue_master" (
  "amad_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT NOT NULL,
  "amad_no" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "floor" TEXT,
  "chamber" TEXT,
  "farmer_name" TEXT,
  "acc_no" TEXT,
  "commodity" TEXT,
  "variety" TEXT,
  "grading" TEXT,
  "marka" TEXT,
  "bardana_type" TEXT,
  "vehicle_no" TEXT,
  "total_packets" INTEGER,
  "weight_qtl" NUMERIC(15, 2),
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "entry_notes" TEXT,
  "agency_name" TEXT,
  PRIMARY KEY ("amad_id")
);

-- Table: "lorry_weighments"
CREATE TABLE IF NOT EXISTS "lorry_weighments" (
  "id" UUID DEFAULT uuid_generate_v4() NOT NULL,
  "gate_pass" VARCHAR(50) NOT NULL,
  "entry_date" VARCHAR(20) NOT NULL,
  "type" VARCHAR(10) DEFAULT 'IN'::character varying,
  "lorry_no" VARCHAR(20) NOT NULL,
  "chalan_no" VARCHAR(50) NOT NULL,
  "in_time" VARCHAR(20) NOT NULL,
  "party_name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(100) NOT NULL,
  "quantity" NUMERIC(10, 2) DEFAULT 0.0,
  "unit" VARCHAR(20) DEFAULT 'BALES'::character varying,
  "mokam" VARCHAR(100),
  "marka" VARCHAR(100),
  "gate_gross_weight" NUMERIC(12, 2) DEFAULT 0.0,
  "gate_tare_weight" NUMERIC(12, 2) DEFAULT 0.0,
  "gate_net_weight" NUMERIC(12, 2) DEFAULT 0.0,
  "mill_gross_weight" NUMERIC(12, 2) DEFAULT 0.0,
  "mill_tare_weight" NUMERIC(12, 2) DEFAULT 0.0,
  "electric_gross_weight" NUMERIC(12, 2) DEFAULT 0.0,
  "electric_tare_weight" NUMERIC(12, 2) DEFAULT 0.0,
  "unload_status" VARCHAR(50) DEFAULT 'Pending'::character varying,
  "status" VARCHAR(50) DEFAULT 'Mill Weightment'::character varying NOT NULL,
  "mill_remarks" TEXT,
  "out_date" VARCHAR(20),
  "out_time" VARCHAR(20),
  "out_remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "grade" TEXT,
  "grade_details" JSONB,
  "department" TEXT DEFAULT 'Jute'::text,
  "current_stage" VARCHAR(100) DEFAULT 'Gate Entry'::character varying,
  "driver_number" TEXT,
  "driver_name" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "m.r_archive"
CREATE TABLE IF NOT EXISTS "m.r_archive" (
  "final_arrival_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "id" UUID DEFAULT gen_random_uuid(),
  "financial_year" TEXT,
  "temporary_arrival_no" TEXT,
  "temporary_arrival_date" DATE,
  "final_arrival_no" TEXT,
  "mr_no" TEXT,
  "final_arrival_date" DATE,
  "date" DATE,
  "po_no" TEXT,
  "po_date" DATE,
  "jci" TEXT DEFAULT 'No'::text,
  "challan_supplier" TEXT,
  "supplier" TEXT,
  "broker" TEXT,
  "transporter_name" TEXT,
  "challan_rr_no" TEXT,
  "challan_rr_date" DATE,
  "lorry_number" TEXT,
  "pan_no" TEXT,
  "consignment_note_no" TEXT,
  "consignment_note_date" DATE,
  "di_no" TEXT,
  "di_date" DATE,
  "invoice_no" TEXT,
  "invoice_date" DATE,
  "ptf" TEXT DEFAULT 'No'::text,
  "lorry_returned" TEXT DEFAULT 'No'::text,
  "lorry_returned_other_mill" TEXT DEFAULT 'No'::text,
  "arrival_area_code" TEXT,
  "arrival_area_name" TEXT,
  "unit_code" TEXT DEFAULT 'I'::text,
  "unit_name" TEXT DEFAULT 'BALES'::text,
  "way_bill_no" TEXT,
  "way_bill_date" DATE,
  "apmc_fees" NUMERIC(15, 2) DEFAULT 0.00,
  "gross_weight" NUMERIC(15, 3),
  "tare_weight" NUMERIC(15, 3),
  "net_weight" NUMERIC(15, 3),
  "chalan_wt" NUMERIC(15, 3),
  "electronic_scale_net" NUMERIC(15, 3),
  "item_name" TEXT,
  "quality" TEXT,
  "status" TEXT DEFAULT 'settled'::text,
  "archived_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("final_arrival_id")
);

-- Table: "m_r_settlement"
CREATE TABLE IF NOT EXISTS "m_r_settlement" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "po_no" TEXT NOT NULL,
  "material_details" TEXT,
  "quality" TEXT,
  "quantity" NUMERIC(15, 3) DEFAULT 0.000,
  "settlement_date" DATE,
  "payment_status" TEXT DEFAULT 'Pending'::text,
  "challan_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "supplier_net_wt" NUMERIC(15, 3) DEFAULT 0.000,
  "electronic_scale_net" NUMERIC(15, 3) DEFAULT 0.000,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "lorry_number" TEXT,
  "lorry_no" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "mail_logs"
CREATE TABLE IF NOT EXISTS "mail_logs" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  "to_email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT,
  "error_message" TEXT,
  "message_id" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "marka_master"
CREATE TABLE IF NOT EXISTS "marka_master" (
  "id" BIGINT NOT NULL,
  "marka_code" TEXT,
  "marka_name" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: "material_inspection"
CREATE TABLE IF NOT EXISTS "material_inspection" (
  "mr_no" TEXT NOT NULL,
  "mr_date" DATE,
  "date" DATE,
  "arrival_no" TEXT,
  "arrival_date" DATE,
  "po_no" TEXT,
  "po_date" DATE,
  "broker_name" TEXT,
  "supplier_name" TEXT,
  "actual_moisture" NUMERIC,
  "claim_moisture" NUMERIC,
  "actual_dust" NUMERIC,
  "claim_dust" NUMERIC,
  "actual_ncv" NUMERIC,
  "claim_ncv" NUMERIC,
  "detention_days" NUMERIC,
  "unloading_date" DATE,
  "mill_po_no" TEXT,
  "mill_po_date" DATE,
  "mr_spcl_print" TEXT,
  "remarks" TEXT,
  "lorry_number" TEXT,
  "delivery_claim" NUMERIC DEFAULT 0,
  "deduction_type" TEXT,
  "deduction_rate" NUMERIC DEFAULT 0,
  "deduction_qty" NUMERIC DEFAULT 0,
  "deduction_amount" NUMERIC DEFAULT 0,
  "status" TEXT DEFAULT 'Completed'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "deduction_types" JSONB,
  "arrival_area_code" TEXT,
  "arrival_area_name" TEXT,
  "arrival_area" TEXT,
  "grid_details" JSONB,
  "details" JSONB,
  "arival_apmc_fees" NUMERIC DEFAULT 0,
  "broker" TEXT,
  "supplier" TEXT,
  "quality_matrix" JSONB,
  "advance_amount" NUMERIC DEFAULT 0,
  "on_account_advance_amount" NUMERIC DEFAULT 0,
  "settlement_amount" NUMERIC DEFAULT 0,
  "sent_settlement_date" DATE,
  "lorry_returned" TEXT,
  "lorry_returned_other_mill" TEXT,
  "mr_print_date" DATE,
  "consignment_no" TEXT,
  "consignment_date" DATE,
  "arrival_remarks" TEXT,
  "deductions" JSONB,
  "unit_name" TEXT DEFAULT 'BALES'::text,
  "unit_code" TEXT,
  "unit" TEXT DEFAULT 'BALES'::text,
  "agency" TEXT,
  "area" TEXT,
  "marka" TEXT,
  "marks" TEXT,
  "quality" TEXT,
  "grade" TEXT,
  "item_name" TEXT,
  "item_code" TEXT,
  "rate" NUMERIC DEFAULT 0,
  "rate_qntl" NUMERIC DEFAULT 0,
  "amount" NUMERIC DEFAULT 0,
  "quantity" NUMERIC DEFAULT 0,
  "gross_weight" NUMERIC DEFAULT 0,
  "net_weight" NUMERIC DEFAULT 0,
  "company_id" TEXT,
  "unit_id" TEXT,
  "machine_id" TEXT,
  "shift" TEXT,
  "department" TEXT,
  "production_id" TEXT,
  "production_ref" TEXT,
  "batch_id" TEXT,
  "actual_grade_down" NUMERIC DEFAULT 0,
  "claim_grade_down" NUMERIC DEFAULT 0,
  "deduction_rows" JSONB,
  "deductions_json" TEXT,
  "total_quantity" NUMERIC DEFAULT 0,
  "challan_gross_wt" NUMERIC DEFAULT 0,
  "receipt_gross_wt" NUMERIC DEFAULT 0,
  "gross_weight_batch" NUMERIC DEFAULT 0,
  "add_weight" NUMERIC DEFAULT 0,
  "less_weight" NUMERIC DEFAULT 0,
  "reduced_weight" NUMERIC DEFAULT 0,
  "final_receipt_wt" NUMERIC DEFAULT 0,
  "arrival_grade" TEXT,
  "stock_grade_code" TEXT,
  "stock_grade_name" TEXT,
  "agency_code" TEXT,
  "crop_year" TEXT DEFAULT '2026-27'::text,
  "lot" TEXT,
  "lorry_read_min" NUMERIC DEFAULT 0,
  "lorry_read_max" NUMERIC DEFAULT 0,
  "lorry_read_avg" NUMERIC DEFAULT 0,
  "insp_read_min" NUMERIC DEFAULT 0,
  "insp_read_max" NUMERIC DEFAULT 0,
  "insp_read_avg" NUMERIC DEFAULT 0,
  "ropes_weight" NUMERIC DEFAULT 0,
  "ropes_tot_wt_grd" NUMERIC DEFAULT 0,
  "ropes_grade" TEXT,
  "chotta_weight" NUMERIC DEFAULT 0,
  "chotta_tot_wt_grd" NUMERIC DEFAULT 0,
  "chotta_grade" TEXT,
  "habijabi_weight" NUMERIC DEFAULT 0,
  "habijabi_tot_wt_grd" NUMERIC DEFAULT 0,
  "habijabi_grade" TEXT,
  PRIMARY KEY ("mr_no")
);

-- Table: "material_inspection_deductions"
CREATE TABLE IF NOT EXISTS "material_inspection_deductions" (
  "id" BIGINT NOT NULL,
  "mr_no" TEXT,
  "po_no" TEXT,
  "arrival_no" TEXT,
  "deduction_type" TEXT,
  "deduction_rate" NUMERIC DEFAULT 0,
  "deduction_qty" NUMERIC DEFAULT 0,
  "deduction_amount" NUMERIC DEFAULT 0,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "mr_date" DATE,
  "po_date" DATE,
  "arrival_date" DATE,
  "supplier" TEXT,
  "supplier_name" TEXT,
  "broker" TEXT,
  "broker_name" TEXT,
  "lorry_number" TEXT,
  "unit" TEXT DEFAULT 'BALES'::text,
  "gross_weight_mt" NUMERIC(15, 3) DEFAULT 0,
  "total_bales" NUMERIC(15, 2) DEFAULT 0,
  "avg_bale_weight" NUMERIC(15, 2) DEFAULT 0,
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "material_inspection_details"
CREATE TABLE IF NOT EXISTS "material_inspection_details" (
  "id" BIGINT NOT NULL,
  "mr_no" TEXT,
  "srl_no" INTEGER,
  "arrival_grade" TEXT,
  "stock_grade_code" TEXT,
  "stock_grade_name" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marka" TEXT,
  "crop_year" TEXT,
  "lot" TEXT,
  "quantity" NUMERIC DEFAULT 0,
  "unit" TEXT DEFAULT 'BALES'::text,
  "challan_gross_wt" NUMERIC DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "marks" TEXT,
  "receipt_gross_wt" NUMERIC DEFAULT 0,
  "gross_weight_batch" NUMERIC DEFAULT 0,
  "add_weight" NUMERIC DEFAULT 0,
  "less_weight" NUMERIC DEFAULT 0,
  "reduced_weight" NUMERIC DEFAULT 0,
  "lorry_moisture_min" NUMERIC DEFAULT 0,
  "lorry_moisture_max" NUMERIC DEFAULT 0,
  "lorry_read_min" NUMERIC DEFAULT 0,
  "lorry_read_max" NUMERIC DEFAULT 0,
  "lorry_read_avg" NUMERIC DEFAULT 0,
  "insp_read_min" NUMERIC DEFAULT 0,
  "insp_read_max" NUMERIC DEFAULT 0,
  "insp_read_avg" NUMERIC DEFAULT 0,
  "moisture_act" NUMERIC DEFAULT 0,
  "moisture_claim" NUMERIC DEFAULT 0,
  "dust_act" NUMERIC DEFAULT 0,
  "dust_claim" NUMERIC DEFAULT 0,
  "ncv_act" NUMERIC DEFAULT 0,
  "ncv_claim" NUMERIC DEFAULT 0,
  "grade_down_act" NUMERIC DEFAULT 0,
  "grade_down_claim" NUMERIC DEFAULT 0,
  "final_receipt_wt" NUMERIC DEFAULT 0,
  "settlement_moisture" NUMERIC DEFAULT 0,
  "settlement_grade_down" NUMERIC DEFAULT 0,
  "settlement_dust" NUMERIC DEFAULT 0,
  "settlement_ncv" NUMERIC DEFAULT 0,
  "ropes_weight" NUMERIC DEFAULT 0,
  "ropes_tot_wt_grd" NUMERIC DEFAULT 0,
  "ropes_grade" TEXT,
  "chotta_weight" NUMERIC DEFAULT 0,
  "chotta_tot_wt_grd" NUMERIC DEFAULT 0,
  "chotta_grade" TEXT,
  "tolerable" TEXT,
  "row_remarks" TEXT,
  "jqi_remarks" TEXT,
  "jci_remarks" TEXT,
  "premium" TEXT,
  "is_premium" BOOLEAN DEFAULT false,
  "rate" NUMERIC DEFAULT 0,
  "rate_qntl" NUMERIC DEFAULT 0,
  "agency_code" TEXT,
  "actual_moisture" NUMERIC DEFAULT 0,
  "claim_moisture" NUMERIC DEFAULT 0,
  "actual_dust" NUMERIC DEFAULT 0,
  "claim_dust" NUMERIC DEFAULT 0,
  "actual_ncv" NUMERIC DEFAULT 0,
  "claim_ncv" NUMERIC DEFAULT 0,
  "actual_grade_down" NUMERIC DEFAULT 0,
  "claim_grade_down" NUMERIC DEFAULT 0,
  "amount" NUMERIC DEFAULT 0,
  PRIMARY KEY ("id")
);

-- Table: "material_mismatch"
CREATE TABLE IF NOT EXISTS "material_mismatch" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "po_no" TEXT,
  "arrival_no" TEXT,
  "inspection_no" TEXT,
  "area" TEXT,
  "grade" TEXT,
  "field" TEXT,
  "expected_value" TEXT,
  "actual_value" TEXT,
  "status" TEXT DEFAULT 'open'::text,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "mill_inspection_deduction"
CREATE TABLE IF NOT EXISTS "mill_inspection_deduction" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "mr_no" TEXT NOT NULL,
  "mr_date" DATE,
  "po_no" TEXT,
  "po_date" DATE,
  "arrival_no" TEXT,
  "arrival_date" DATE,
  "supplier" TEXT,
  "supplier_name" TEXT,
  "broker" TEXT,
  "broker_name" TEXT,
  "lorry_number" TEXT,
  "deduction_type" TEXT NOT NULL,
  "deduction_rate" NUMERIC(15, 2) DEFAULT 0,
  "deduction_qty" NUMERIC(15, 2) DEFAULT 0,
  "deduction_amount" NUMERIC(15, 2) DEFAULT 0,
  "unit" TEXT DEFAULT 'BALES'::text,
  "gross_weight_mt" NUMERIC(15, 3) DEFAULT 0,
  "total_bales" NUMERIC(15, 2) DEFAULT 0,
  "avg_bale_weight" NUMERIC(15, 2) DEFAULT 0,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "mill_inspection_detail"
CREATE TABLE IF NOT EXISTS "mill_inspection_detail" (
  "id" BIGINT NOT NULL,
  "mr_no" TEXT,
  "srl_no" INTEGER,
  "arrival_grade" TEXT,
  "stock_grade_code" TEXT,
  "stock_grade_name" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marka" TEXT,
  "crop_year" TEXT,
  "lot" TEXT,
  "quantity" NUMERIC DEFAULT 0,
  "unit" TEXT DEFAULT 'BALES'::text,
  "challan_gross_wt" NUMERIC DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "marks" TEXT,
  "receipt_gross_wt" NUMERIC DEFAULT 0,
  "gross_weight_batch" NUMERIC DEFAULT 0,
  "add_weight" NUMERIC DEFAULT 0,
  "less_weight" NUMERIC DEFAULT 0,
  "reduced_weight" NUMERIC DEFAULT 0,
  "lorry_moisture_min" NUMERIC DEFAULT 0,
  "lorry_moisture_max" NUMERIC DEFAULT 0,
  "lorry_read_min" NUMERIC DEFAULT 0,
  "lorry_read_max" NUMERIC DEFAULT 0,
  "lorry_read_avg" NUMERIC DEFAULT 0,
  "insp_read_min" NUMERIC DEFAULT 0,
  "insp_read_max" NUMERIC DEFAULT 0,
  "insp_read_avg" NUMERIC DEFAULT 0,
  "moisture_act" NUMERIC DEFAULT 0,
  "moisture_claim" NUMERIC DEFAULT 0,
  "dust_act" NUMERIC DEFAULT 0,
  "dust_claim" NUMERIC DEFAULT 0,
  "ncv_act" NUMERIC DEFAULT 0,
  "ncv_claim" NUMERIC DEFAULT 0,
  "grade_down_act" NUMERIC DEFAULT 0,
  "grade_down_claim" NUMERIC DEFAULT 0,
  "final_receipt_wt" NUMERIC DEFAULT 0,
  "settlement_moisture" NUMERIC DEFAULT 0,
  "settlement_grade_down" NUMERIC DEFAULT 0,
  "settlement_dust" NUMERIC DEFAULT 0,
  "settlement_ncv" NUMERIC DEFAULT 0,
  "ropes_weight" NUMERIC DEFAULT 0,
  "ropes_tot_wt_grd" NUMERIC DEFAULT 0,
  "ropes_grade" TEXT,
  "chotta_weight" NUMERIC DEFAULT 0,
  "chotta_tot_wt_grd" NUMERIC DEFAULT 0,
  "chotta_grade" TEXT,
  "tolerable" TEXT,
  "row_remarks" TEXT,
  "jqi_remarks" TEXT,
  "jci_remarks" TEXT,
  "premium" TEXT,
  "is_premium" BOOLEAN DEFAULT false,
  "rate" NUMERIC DEFAULT 0,
  "rate_qntl" NUMERIC DEFAULT 0,
  "agency_code" TEXT,
  "actual_moisture" NUMERIC DEFAULT 0,
  "claim_moisture" NUMERIC DEFAULT 0,
  "actual_dust" NUMERIC DEFAULT 0,
  "claim_dust" NUMERIC DEFAULT 0,
  "actual_ncv" NUMERIC DEFAULT 0,
  "claim_ncv" NUMERIC DEFAULT 0,
  "actual_grade_down" NUMERIC DEFAULT 0,
  "claim_grade_down" NUMERIC DEFAULT 0,
  "amount" NUMERIC DEFAULT 0,
  PRIMARY KEY ("id")
);

-- Table: "mill_inspection_master"
CREATE TABLE IF NOT EXISTS "mill_inspection_master" (
  "mr_no" TEXT NOT NULL,
  "mr_date" DATE,
  "date" DATE,
  "arrival_no" TEXT,
  "arrival_date" DATE,
  "po_no" TEXT,
  "po_date" DATE,
  "broker_name" TEXT,
  "supplier_name" TEXT,
  "actual_moisture" NUMERIC,
  "claim_moisture" NUMERIC,
  "actual_dust" NUMERIC,
  "claim_dust" NUMERIC,
  "actual_ncv" NUMERIC,
  "claim_ncv" NUMERIC,
  "detention_days" NUMERIC,
  "unloading_date" DATE,
  "mill_po_no" TEXT,
  "mill_po_date" DATE,
  "mr_spcl_print" TEXT,
  "remarks" TEXT,
  "lorry_number" TEXT,
  "delivery_claim" NUMERIC DEFAULT 0,
  "deduction_type" TEXT,
  "deduction_rate" NUMERIC DEFAULT 0,
  "deduction_qty" NUMERIC DEFAULT 0,
  "deduction_amount" NUMERIC DEFAULT 0,
  "status" TEXT DEFAULT 'Completed'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "deduction_types" JSONB,
  "arrival_area_code" TEXT,
  "arrival_area_name" TEXT,
  "arrival_area" TEXT,
  "grid_details" JSONB,
  "details" JSONB,
  "arival_apmc_fees" NUMERIC DEFAULT 0,
  "broker" TEXT,
  "supplier" TEXT,
  "quality_matrix" JSONB,
  "advance_amount" NUMERIC DEFAULT 0,
  "on_account_advance_amount" NUMERIC DEFAULT 0,
  "settlement_amount" NUMERIC DEFAULT 0,
  "sent_settlement_date" DATE,
  "lorry_returned" TEXT,
  "lorry_returned_other_mill" TEXT,
  "mr_print_date" DATE,
  "consignment_no" TEXT,
  "consignment_date" DATE,
  "arrival_remarks" TEXT,
  "deductions" JSONB,
  PRIMARY KEY ("mr_no")
);

-- Table: "mill_inspection_print_logs"
CREATE TABLE IF NOT EXISTS "mill_inspection_print_logs" (
  "id" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: "mill_issue_detail"
CREATE TABLE IF NOT EXISTS "mill_issue_detail" (
  "detail_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "issue_no" TEXT NOT NULL,
  "srl" INTEGER NOT NULL,
  "crop" TEXT DEFAULT '2025-26'::text,
  "grade_code" TEXT,
  "grade_name" TEXT,
  "marka" TEXT DEFAULT 'NO MARK'::text,
  "qty" NUMERIC(15, 2) DEFAULT 0.00,
  "weight_kgs" NUMERIC(15, 3) DEFAULT 0.00,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "area" TEXT,
  "agency" TEXT,
  "code" TEXT,
  "batch_name" TEXT,
  "unit" TEXT,
  "place" TEXT,
  "itg_no" TEXT,
  "rate" NUMERIC(15, 2),
  "location_dest" TEXT,
  "godown_splits" JSONB,
  PRIMARY KEY ("detail_id")
);

-- Table: "mill_issue_master"
CREATE TABLE IF NOT EXISTS "mill_issue_master" (
  "issue_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT DEFAULT '2026-2027'::text NOT NULL,
  "issue_no" TEXT NOT NULL,
  "date" DATE DEFAULT CURRENT_DATE NOT NULL,
  "issue_type" TEXT DEFAULT 'FACTORY ISSUE'::text,
  "mill_shift" TEXT DEFAULT 'A'::text,
  "department" TEXT NOT NULL,
  "godown" TEXT NOT NULL,
  "stock_group" TEXT DEFAULT 'RAW JUTE'::text,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "grade_name" TEXT,
  "unit" TEXT,
  "quantity" NUMERIC(15, 3),
  "weight_mt" NUMERIC(15, 3),
  "challan_no" TEXT,
  "gate_pass_no" TEXT,
  "vehicle_no" TEXT,
  "party_name" TEXT,
  "destination_godown" TEXT,
  "requisition_no" TEXT,
  "issued_by" TEXT,
  "received_by" TEXT,
  "stack_no" TEXT,
  "jci" TEXT,
  "batch_order" TEXT,
  "requisition_date" DATE,
  "issued_for" TEXT,
  "status" TEXT DEFAULT 'active'::text,
  "lorry_number" TEXT,
  PRIMARY KEY ("issue_id")
);

-- Table: "moisture_logic"
CREATE TABLE IF NOT EXISTS "moisture_logic" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "season" TEXT,
  "operating_area" TEXT,
  "threshold_limit" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "status" TEXT DEFAULT 'Inactive'::text,
  PRIMARY KEY ("id")
);

-- Table: "mr_archive"
CREATE TABLE IF NOT EXISTS "mr_archive" (
  "final_arrival_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "id" UUID DEFAULT gen_random_uuid(),
  "financial_year" TEXT,
  "temporary_arrival_no" TEXT,
  "temporary_arrival_date" DATE,
  "final_arrival_no" TEXT,
  "mr_no" TEXT,
  "final_arrival_date" DATE,
  "date" DATE,
  "po_no" TEXT,
  "po_date" DATE,
  "jci" TEXT DEFAULT 'No'::text,
  "challan_supplier" TEXT,
  "supplier" TEXT,
  "broker" TEXT,
  "transporter_name" TEXT,
  "challan_rr_no" TEXT,
  "challan_rr_date" DATE,
  "lorry_number" TEXT,
  "pan_no" TEXT,
  "consignment_note_no" TEXT,
  "consignment_note_date" DATE,
  "di_no" TEXT,
  "di_date" DATE,
  "invoice_no" TEXT,
  "invoice_date" DATE,
  "ptf" TEXT DEFAULT 'No'::text,
  "lorry_returned" TEXT DEFAULT 'No'::text,
  "lorry_returned_other_mill" TEXT DEFAULT 'No'::text,
  "arrival_area_code" TEXT,
  "arrival_area_name" TEXT,
  "unit_code" TEXT DEFAULT 'I'::text,
  "unit_name" TEXT DEFAULT 'BALES'::text,
  "way_bill_no" TEXT,
  "way_bill_date" DATE,
  "apmc_fees" NUMERIC(15, 2) DEFAULT 0.00,
  "gross_weight" NUMERIC(15, 3),
  "tare_weight" NUMERIC(15, 3),
  "net_weight" NUMERIC(15, 3),
  "chalan_wt" NUMERIC(15, 3),
  "electronic_scale_net" NUMERIC(15, 3),
  "item_name" TEXT,
  "quality" TEXT,
  "status" TEXT DEFAULT 'settled'::text,
  "archived_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("final_arrival_id")
);

-- Table: "mr_settlement_detail"
CREATE TABLE IF NOT EXISTS "mr_settlement_detail" (
  "detail_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "mr_no" TEXT,
  "col_index" INTEGER NOT NULL,
  "grade" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marka_crop" TEXT,
  "quantity" INTEGER DEFAULT 0,
  "arr_qty_wt" NUMERIC(15, 3) DEFAULT 0.000,
  "min_qty_wt" NUMERIC(15, 3) DEFAULT 0.000,
  "wt_phota" NUMERIC(15, 3) DEFAULT 0.000,
  "wt_quantity" NUMERIC(15, 3) DEFAULT 0.000,
  "rate_value" NUMERIC(15, 2) DEFAULT 0.00,
  "gd_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "gd_sett" NUMERIC(15, 2) DEFAULT 0.00,
  "gd_rev" NUMERIC(15, 2) DEFAULT 0.00,
  "gd_final" NUMERIC(15, 2) DEFAULT 0.00,
  "moist_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "moist_sett" NUMERIC(15, 2) DEFAULT 0.00,
  "moist_rev" NUMERIC(15, 2) DEFAULT 0.00,
  "moist_final" NUMERIC(15, 2) DEFAULT 0.00,
  "dust_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "dust_sett" NUMERIC(15, 2) DEFAULT 0.00,
  "dust_rev" NUMERIC(15, 2) DEFAULT 0.00,
  "dust_final" NUMERIC(15, 2) DEFAULT 0.00,
  "ncv_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "ncv_sett" NUMERIC(15, 2) DEFAULT 0.00,
  "ncv_rev" NUMERIC(15, 2) DEFAULT 0.00,
  "ncv_final" NUMERIC(15, 2) DEFAULT 0.00,
  "po_grade_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "po_grade_sett" NUMERIC(15, 2) DEFAULT 0.00,
  "po_grade_rev" NUMERIC(15, 2) DEFAULT 0.00,
  "po_grade_final" NUMERIC(15, 2) DEFAULT 0.00,
  "adjust_type" TEXT,
  "remark" TEXT,
  "claim_settlement" NUMERIC(15, 2) DEFAULT 0.00,
  "premium" NUMERIC DEFAULT 0,
  "sett_pct" NUMERIC DEFAULT 0,
  "deduction_rate" NUMERIC DEFAULT 0,
  "sett_rate" NUMERIC DEFAULT 0,
  "quantity_qtl" NUMERIC DEFAULT 0,
  "amount" NUMERIC DEFAULT 0,
  "lower_grade" TEXT DEFAULT ''::text,
  "target_lower_grade" TEXT DEFAULT ''::text,
  "lower_grade_rate" NUMERIC DEFAULT 0,
  "grade_diff" NUMERIC DEFAULT 0,
  PRIMARY KEY ("detail_id")
);

-- Table: "mr_settlement_master"
CREATE TABLE IF NOT EXISTS "mr_settlement_master" (
  "settlement_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "mr_no" TEXT NOT NULL,
  "sett_date" DATE,
  "po_type" TEXT,
  "broker" TEXT,
  "supplier" TEXT,
  "chn_supplier" TEXT,
  "po_no" TEXT,
  "po_date" DATE,
  "lorry_no" TEXT,
  "auto_ho_settlement" BOOLEAN DEFAULT false,
  "detention_days" INTEGER DEFAULT 0,
  "arrival_no" TEXT,
  "arrival_date" DATE,
  "arival_apmc_fees" NUMERIC(15, 2) DEFAULT 0.00,
  "actual_apmc_fees" NUMERIC(15, 2) DEFAULT 0.00,
  "remarks" TEXT,
  "summary_rate_qtel" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_rate_aff_cd_cl" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_delivery_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_rate_wt_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_instl_rate" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_material_value" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_misc_add" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_misc_less" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_premium_amount" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_less_amount" NUMERIC(15, 2) DEFAULT 0.00,
  "summary_instl_amount" NUMERIC(15, 2) DEFAULT 0.00,
  "val_material_value" NUMERIC(15, 2) DEFAULT 0.00,
  "val_add_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "val_less_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "val_premium_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "val_less_amount" NUMERIC(15, 2) DEFAULT 0.00,
  "val_qty_claim" NUMERIC(15, 2) DEFAULT 0.00,
  "val_ex_short" NUMERIC(15, 2) DEFAULT 0.00,
  "final_less_adv" NUMERIC(15, 2) DEFAULT 0.00,
  "final_on_ac_adv" NUMERIC(15, 2) DEFAULT 0.00,
  "final_apmc_fees" NUMERIC(15, 2) DEFAULT 0.00,
  "final_cst_pct_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "payable_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "payable_bill_no" TEXT,
  "payable_bill_date" DATE,
  "wt_ded_wt_1" NUMERIC(15, 3) DEFAULT 0.000,
  "wt_ded_wt_2" NUMERIC(15, 3) DEFAULT 0.000,
  "wt_ded_wt_3" NUMERIC(15, 3) DEFAULT 0.000,
  "rate_qntl" NUMERIC(15, 2) DEFAULT 0.00,
  "value_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "adjustment_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "net_amt" NUMERIC(15, 2) DEFAULT 0.00,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "payment_status" TEXT DEFAULT 'Pending'::text,
  "challan_weight" NUMERIC(15, 3) DEFAULT 0.000,
  "supplier_net_wt" NUMERIC(15, 3) DEFAULT 0.000,
  "electronic_scale_net" NUMERIC(15, 3) DEFAULT 0.000,
  "summary_deduction_type" TEXT,
  "summary_deduction_rate" NUMERIC DEFAULT 0,
  "summary_deduction_qty" NUMERIC DEFAULT 0,
  "summary_deduction_amount" NUMERIC DEFAULT 0,
  "summary_premium_wt" NUMERIC DEFAULT 0,
  "deductions" JSONB,
  "lorry_number" TEXT,
  "print_count" INTEGER DEFAULT 0,
  "last_printed_at" TIMESTAMPTZ,
  "last_printed_by" TEXT,
  "last_printed_by_name" TEXT,
  PRIMARY KEY ("settlement_id")
);

-- Table: "opening_stock"
CREATE TABLE IF NOT EXISTS "opening_stock" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "opening_date" DATE NOT NULL,
  "godown" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "jci" TEXT DEFAULT 'No'::text NOT NULL,
  "unit" TEXT DEFAULT 'BALES'::text NOT NULL,
  "quantity" NUMERIC(15, 3) DEFAULT 0.00 NOT NULL,
  "weight" NUMERIC(15, 3) DEFAULT 0.00 NOT NULL,
  "avg_weight" NUMERIC(15, 3) DEFAULT 0.00 NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "stock_date" DATE,
  PRIMARY KEY ("id")
);

-- Table: "p.o_archive"
CREATE TABLE IF NOT EXISTS "p.o_archive" (
  "po_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT,
  "purchase_order" TEXT,
  "po_type" TEXT,
  "ptf_no" TEXT,
  "pending" BOOLEAN DEFAULT false,
  "po_no" TEXT,
  "po_date" DATE,
  "broker" TEXT,
  "supplier" TEXT,
  "challan_supplier" TEXT,
  "area" TEXT,
  "trans_paid_by" TEXT,
  "weight_unit_kgs" NUMERIC(15, 3),
  "against_cancellation" TEXT,
  "purchase_unit_code" TEXT,
  "purchase_unit_name" TEXT,
  "total_lorries" NUMERIC(15, 2),
  "units_per_lorry" NUMERIC(15, 2),
  "total_units" NUMERIC(15, 2),
  "weight_per_lorry" NUMERIC(15, 3),
  "total_contract_mt" NUMERIC(15, 3),
  "marka_type" TEXT,
  "marka_penalty" NUMERIC(15, 2),
  "qty_penalty" NUMERIC(15, 2),
  "delivery_from" DATE,
  "delivery_to" DATE,
  "grace_days" INTEGER,
  "delivery_penalty" NUMERIC(15, 2),
  "contract_po_no" TEXT,
  "contract_date" DATE,
  "rate_detail" TEXT,
  "delivery_schedule" TEXT,
  "terms_condition" TEXT,
  "remarks" TEXT,
  "po_identification" TEXT,
  "b_rate" NUMERIC(15, 2),
  "s_date" DATE,
  "status" TEXT DEFAULT 'settled'::text,
  "archived_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "pending_received" NUMERIC(15, 3) DEFAULT 0.000,
  PRIMARY KEY ("po_id")
);

-- Table: "party_ledger"
CREATE TABLE IF NOT EXISTS "party_ledger" (
  "ledger_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "party_id" TEXT NOT NULL,
  "party_name" TEXT NOT NULL,
  "transaction_date" DATE NOT NULL,
  "transaction_type" TEXT NOT NULL,
  "reference_no" TEXT,
  "debit" NUMERIC(15, 2) DEFAULT 0.00,
  "credit" NUMERIC(15, 2) DEFAULT 0.00,
  "balance" NUMERIC(15, 2) DEFAULT 0.00,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("ledger_id")
);

-- Table: "payment_details"
CREATE TABLE IF NOT EXISTS "payment_details" (
  "detail_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" UUID,
  "voucher_no" TEXT,
  "mr_no" TEXT,
  "col_index" INTEGER,
  "grade" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marka_crop" TEXT,
  "quantity" NUMERIC DEFAULT 0,
  "arr_qty_wt" NUMERIC DEFAULT 0,
  "min_qty_wt" NUMERIC DEFAULT 0,
  "wt_phota" NUMERIC DEFAULT 0,
  "wt_quantity" NUMERIC DEFAULT 0,
  "rate_value" NUMERIC DEFAULT 0,
  "gd_claim" NUMERIC DEFAULT 0,
  "gd_sett" NUMERIC DEFAULT 0,
  "gd_rev" NUMERIC DEFAULT 0,
  "gd_final" NUMERIC DEFAULT 0,
  "moist_claim" NUMERIC DEFAULT 0,
  "moist_sett" NUMERIC DEFAULT 0,
  "moist_rev" NUMERIC DEFAULT 0,
  "moist_final" NUMERIC DEFAULT 0,
  "dust_claim" NUMERIC DEFAULT 0,
  "dust_sett" NUMERIC DEFAULT 0,
  "dust_rev" NUMERIC DEFAULT 0,
  "dust_final" NUMERIC DEFAULT 0,
  "ncv_claim" NUMERIC DEFAULT 0,
  "ncv_sett" NUMERIC DEFAULT 0,
  "ncv_rev" NUMERIC DEFAULT 0,
  "ncv_final" NUMERIC DEFAULT 0,
  "po_grade_claim" NUMERIC DEFAULT 0,
  "po_grade_sett" NUMERIC DEFAULT 0,
  "po_grade_rev" NUMERIC DEFAULT 0,
  "po_grade_final" NUMERIC DEFAULT 0,
  "adjust_type" TEXT,
  "remark" TEXT,
  "claim_settlement" NUMERIC DEFAULT 0,
  "bill_no" TEXT,
  "bill_date" DATE,
  "bill_amount" NUMERIC(15, 2),
  "paid_amount" NUMERIC(15, 2),
  "balance_amount" NUMERIC(15, 2),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "sett_pct" NUMERIC DEFAULT 0,
  "deduction_rate" NUMERIC DEFAULT 0,
  "sett_rate" NUMERIC DEFAULT 0,
  "quantity_qtl" NUMERIC DEFAULT 0,
  "amount" NUMERIC DEFAULT 0,
  "premium" NUMERIC(15, 2) DEFAULT 0,
  PRIMARY KEY ("detail_id")
);

-- Table: "payment_master"
CREATE TABLE IF NOT EXISTS "payment_master" (
  "payment_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "voucher_no" TEXT NOT NULL,
  "payment_date" DATE,
  "mr_no" TEXT,
  "po_no" TEXT,
  "po_date" DATE,
  "sett_date" DATE,
  "po_type" TEXT,
  "broker" TEXT,
  "supplier" TEXT,
  "party_id" TEXT,
  "party_name" TEXT,
  "chn_supplier" TEXT,
  "lorry_number" TEXT,
  "arrival_no" TEXT,
  "arrival_date" DATE,
  "arival_apmc_fees" NUMERIC DEFAULT 0,
  "payable_amt" NUMERIC DEFAULT 0,
  "payable_bill_no" TEXT,
  "payable_bill_date" DATE,
  "total_amount" NUMERIC DEFAULT 0,
  "paid_amount" NUMERIC DEFAULT 0,
  "payment_mode" TEXT,
  "bank_name" TEXT,
  "reference_no" TEXT,
  "remarks" TEXT,
  "status" TEXT DEFAULT 'completed'::text,
  "payment_status" TEXT DEFAULT 'Paid'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "advance_payment_done" TEXT DEFAULT 'No'::text,
  "advance_payment_from" TEXT DEFAULT '1'::text,
  "payment_settlementdate" TEXT,
  "tenor" TEXT,
  "repayment_date" TEXT,
  "premium" NUMERIC(15, 2) DEFAULT 0,
  "total_packets" NUMERIC(15, 2) DEFAULT 0,
  "total_weight" NUMERIC(15, 3) DEFAULT 0,
  "b_rate" NUMERIC(15, 2) DEFAULT 0,
  "advance_payment_financier" TEXT,
  PRIMARY KEY ("payment_id")
);

-- Table: "po_archive"
CREATE TABLE IF NOT EXISTS "po_archive" (
  "po_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT,
  "purchase_order" TEXT,
  "po_type" TEXT,
  "ptf_no" TEXT,
  "pending" BOOLEAN DEFAULT false,
  "po_no" TEXT,
  "po_date" DATE,
  "broker" TEXT,
  "supplier" TEXT,
  "challan_supplier" TEXT,
  "area" TEXT,
  "trans_paid_by" TEXT,
  "weight_unit_kgs" NUMERIC(15, 3),
  "against_cancellation" TEXT,
  "purchase_unit_code" TEXT,
  "purchase_unit_name" TEXT,
  "total_lorries" NUMERIC(15, 2),
  "units_per_lorry" NUMERIC(15, 2),
  "total_units" NUMERIC(15, 2),
  "weight_per_lorry" NUMERIC(15, 3),
  "total_contract_mt" NUMERIC(15, 3),
  "marka_type" TEXT,
  "marka_penalty" NUMERIC(15, 2),
  "qty_penalty" NUMERIC(15, 2),
  "delivery_from" DATE,
  "delivery_to" DATE,
  "grace_days" INTEGER,
  "delivery_penalty" NUMERIC(15, 2),
  "contract_po_no" TEXT,
  "contract_date" DATE,
  "rate_detail" TEXT,
  "delivery_schedule" TEXT,
  "terms_condition" TEXT,
  "remarks" TEXT,
  "po_identification" TEXT,
  "b_rate" NUMERIC(15, 2),
  "s_date" DATE,
  "status" TEXT DEFAULT 'settled'::text,
  "archived_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "pending_received" NUMERIC(15, 3) DEFAULT 0.000,
  PRIMARY KEY ("po_id")
);

-- Table: "production_records"
CREATE TABLE IF NOT EXISTS "production_records" (
  "id" TEXT NOT NULL,
  "batch_no" TEXT,
  "lot_no" TEXT,
  "production_no" TEXT,
  "date" DATE,
  "status" TEXT DEFAULT 'Active'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "purchase_detail_master"
CREATE TABLE IF NOT EXISTS "purchase_detail_master" (
  "item_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "po_no" TEXT,
  "srl_no" INTEGER,
  "crop_year" TEXT,
  "grade_code" TEXT,
  "agency_code" TEXT,
  "marka_code" TEXT,
  "quantity" INTEGER,
  "weight_mt" NUMERIC(15, 3),
  "rate_qntl" NUMERIC(15, 2),
  "premium" NUMERIC(15, 2) DEFAULT 0,
  "grade_name" TEXT,
  "agency_name" TEXT,
  "marka_name" TEXT,
  PRIMARY KEY ("item_id")
);

-- Table: "purchase_master"
CREATE TABLE IF NOT EXISTS "purchase_master" (
  "po_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT NOT NULL,
  "purchase_order" TEXT,
  "po_type" TEXT,
  "ptf_no" TEXT,
  "pending" BOOLEAN DEFAULT true,
  "po_no" TEXT NOT NULL,
  "po_date" DATE NOT NULL,
  "broker" TEXT,
  "supplier" TEXT,
  "challan_supplier" TEXT,
  "area" TEXT,
  "trans_paid_by" TEXT,
  "weight_unit_kgs" NUMERIC(15, 2),
  "against_cancellation" TEXT,
  "purchase_unit_code" TEXT,
  "purchase_unit_name" TEXT,
  "total_lorries" NUMERIC(15, 2),
  "units_per_lorry" NUMERIC(15, 2),
  "total_units" NUMERIC(15, 2),
  "weight_per_lorry" NUMERIC(15, 3),
  "total_contract_mt" NUMERIC(15, 3),
  "marka_type" TEXT,
  "marka_penalty" NUMERIC(15, 2),
  "qty_penalty" NUMERIC(15, 2),
  "delivery_from" DATE,
  "delivery_to" DATE,
  "grace_days" INTEGER,
  "delivery_penalty" NUMERIC(15, 2),
  "contract_po_no" TEXT,
  "contract_date" DATE,
  "rate_detail" TEXT,
  "delivery_schedule" TEXT,
  "terms_condition" TEXT,
  "remarks" TEXT,
  "po_identification" TEXT,
  "b_rate" NUMERIC(15, 2),
  "s_date" DATE,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "pending_received" NUMERIC(15, 3) DEFAULT 0.000,
  "status" TEXT DEFAULT 'active'::text,
  "excess_short_deduction" NUMERIC(15, 2),
  "excess_short_status" TEXT,
  "open_remarks" JSONB,
  "premium" NUMERIC(15, 2) DEFAULT 0,
  PRIMARY KEY ("po_id")
);

-- Table: "quality_items"
CREATE TABLE IF NOT EXISTS "quality_items" (
  "id" UUID DEFAULT uuid_generate_v4() NOT NULL,
  "gate_pass" VARCHAR(50) NOT NULL,
  "quality" VARCHAR(50) NOT NULL,
  "quantity" NUMERIC(10, 2) NOT NULL,
  "unit" VARCHAR(20) DEFAULT 'BALES'::character varying NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- Table: "report_master"
CREATE TABLE IF NOT EXISTS "report_master" (
  "report_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "report_name" TEXT,
  "report_type" TEXT,
  "last_generated" TIMESTAMPTZ,
  PRIMARY KEY ("report_id")
);

-- Table: "requisitions"
CREATE TABLE IF NOT EXISTS "requisitions" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "requisition_no" TEXT NOT NULL,
  "requisition_date" DATE DEFAULT CURRENT_DATE NOT NULL,
  "department" TEXT NOT NULL,
  "issued_for" TEXT DEFAULT 'MAIN MILL'::text,
  "batch_order" TEXT,
  "stock_group" TEXT DEFAULT 'RAW JUTE'::text,
  "crop_year" TEXT DEFAULT '2025-26'::text,
  "grade_name" TEXT DEFAULT 'TD5'::text,
  "marka" TEXT DEFAULT 'NO MARK'::text,
  "qty_bales" NUMERIC(15, 2) DEFAULT 0.00,
  "weight_kgs" NUMERIC(15, 3) DEFAULT 0.00,
  "status" TEXT DEFAULT 'PENDING'::text,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "return_lorry"
CREATE TABLE IF NOT EXISTS "return_lorry" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "new_po_no" TEXT NOT NULL,
  "po_no" TEXT NOT NULL,
  "reference_po_no" TEXT NOT NULL,
  "mr_no" TEXT NOT NULL,
  "mr_date" TEXT,
  "final_arrival_no" TEXT,
  "temporary_arrival_no" TEXT,
  "arrival_no" TEXT,
  "arrival_date" TEXT,
  "unloading_date" TEXT,
  "mill_po_no" TEXT,
  "mill_po_date" TEXT,
  "mr_spcl_print" TEXT,
  "broker_name" TEXT,
  "supplier_name" TEXT,
  "lorry_number" TEXT,
  "lorry_sequence_no" INTEGER DEFAULT 1,
  "received_weight_mt" NUMERIC(15, 3) DEFAULT 0,
  "challan_gross_wt" NUMERIC(15, 3) DEFAULT 0,
  "receipt_gross_wt" NUMERIC(15, 3) DEFAULT 0,
  "total_challan_gross_wt" NUMERIC(15, 3) DEFAULT 0,
  "total_receipt_gross_wt" NUMERIC(15, 3) DEFAULT 0,
  "actual_moisture" NUMERIC(10, 2) DEFAULT 0,
  "claim_moisture" NUMERIC(10, 2) DEFAULT 0,
  "actual_dust" NUMERIC(10, 2) DEFAULT 0,
  "claim_dust" NUMERIC(10, 2) DEFAULT 0,
  "actual_ncv" NUMERIC(10, 2) DEFAULT 0,
  "claim_ncv" NUMERIC(10, 2) DEFAULT 0,
  "actual_grade_down" NUMERIC(10, 2) DEFAULT 0,
  "claim_grade_down" NUMERIC(10, 2) DEFAULT 0,
  "detention_days" INTEGER DEFAULT 0,
  "delivery_claim" NUMERIC(15, 2) DEFAULT 0,
  "deduction_type" TEXT,
  "deduction_rate" NUMERIC(15, 2) DEFAULT 0,
  "deduction_qty" NUMERIC(15, 3) DEFAULT 0,
  "deduction_amount" NUMERIC(15, 2) DEFAULT 0,
  "advance_amount" NUMERIC(15, 2) DEFAULT 0,
  "on_account_advance_amount" NUMERIC(15, 2) DEFAULT 0,
  "settlement_amount" NUMERIC(15, 2) DEFAULT 0,
  "sent_settlement_date" TEXT,
  "lorry_returned" TEXT DEFAULT 'Yes'::text,
  "lorry_returned_other_mill" TEXT DEFAULT 'No'::text,
  "mr_print_date" TEXT,
  "consignment_no" TEXT,
  "consignment_date" TEXT,
  "arival_apmc_fees" NUMERIC(15, 2) DEFAULT 0,
  "arrival_remarks" TEXT,
  "insp_remarks" TEXT,
  "unit_name" TEXT,
  "quality_matrix" JSONB DEFAULT '{}'::jsonb,
  "inspection_details" JSONB DEFAULT '[]'::jsonb,
  "grid_details" JSONB DEFAULT '[]'::jsonb,
  "financial_year" TEXT DEFAULT '2026-2027'::text,
  "purchase_order" TEXT DEFAULT 'FINAL PO'::text,
  "po_type" TEXT DEFAULT 'Return Lorry'::text,
  "status" TEXT DEFAULT 'open'::text,
  "ptf_no" TEXT,
  "pending" BOOLEAN DEFAULT true,
  "po_date" TEXT,
  "s_date" TEXT,
  "broker_code" TEXT,
  "broker" TEXT,
  "supplier_code" TEXT,
  "supplier" TEXT,
  "challan_supplier_code" TEXT,
  "challan_supplier" TEXT,
  "area_code" TEXT,
  "area" TEXT,
  "trans_paid_by" TEXT DEFAULT 'PARTY'::text,
  "weight_unit_kgs" NUMERIC(10, 2) DEFAULT 147.5,
  "against_cancellation" TEXT DEFAULT 'No'::text,
  "purchase_unit_code" TEXT DEFAULT '1'::text,
  "purchase_unit_name" TEXT DEFAULT 'BALES'::text,
  "total_lorries" NUMERIC(10, 2) DEFAULT 1,
  "units_per_lorry" NUMERIC(10, 2) DEFAULT 0,
  "total_units" NUMERIC(10, 2) DEFAULT 0,
  "weight_per_lorry" NUMERIC(15, 3) DEFAULT 0,
  "total_contract_mt" NUMERIC(15, 3) DEFAULT 0,
  "marka_type" TEXT DEFAULT 'Normal'::text,
  "marka_penalty" NUMERIC(10, 2) DEFAULT 0,
  "qty_penalty" NUMERIC(10, 2) DEFAULT 0,
  "delivery_from" TEXT,
  "delivery_to" TEXT,
  "shipment_date" TEXT,
  "grace_days" INTEGER DEFAULT 0,
  "shipment_days" INTEGER DEFAULT 0,
  "delivery_penalty" NUMERIC(10, 2) DEFAULT 0,
  "shipment_penalty" NUMERIC(10, 2) DEFAULT 0,
  "contract_po_no" TEXT,
  "sauda_no" TEXT,
  "contract_date" TEXT,
  "rate_detail" TEXT,
  "delivery_schedule" TEXT,
  "terms_condition" TEXT,
  "remarks" TEXT,
  "po_remarks" TEXT,
  "po_identification" TEXT DEFAULT 'Direct Advance Payment'::text,
  "b_rate" NUMERIC(15, 2) DEFAULT 0,
  "sauda_details" JSONB DEFAULT '[]'::jsonb,
  "is_return_lorry" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "saved_to_sauda_checkpoint" BOOLEAN DEFAULT false,
  PRIMARY KEY ("id")
);

-- Table: "return_lorry_details"
CREATE TABLE IF NOT EXISTS "return_lorry_details" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "return_po_no" TEXT NOT NULL,
  "reference_po_no" TEXT NOT NULL,
  "mr_no" TEXT,
  "srl_no" INTEGER DEFAULT 1,
  "crop_year" TEXT DEFAULT '2026-27'::text,
  "grade_code" TEXT,
  "grade_name" TEXT,
  "arrival_grade" TEXT,
  "stock_grade_code" TEXT,
  "stock_grade_name" TEXT,
  "area" TEXT,
  "agency_code" TEXT,
  "agency_name" TEXT,
  "marka_code" TEXT,
  "marka_name" TEXT,
  "lot" TEXT,
  "unit" TEXT DEFAULT 'BALES'::text,
  "quantity" NUMERIC(15, 3) DEFAULT 0,
  "weight_mt" NUMERIC(15, 3) DEFAULT 0,
  "challan_gross_wt" NUMERIC(15, 3) DEFAULT 0,
  "receipt_gross_wt" NUMERIC(15, 3) DEFAULT 0,
  "final_receipt_wt" NUMERIC(15, 3) DEFAULT 0,
  "rate_qntl" NUMERIC(15, 2) DEFAULT 0,
  "premium" NUMERIC(15, 2) DEFAULT 0,
  "actual_moisture" NUMERIC(10, 2) DEFAULT 0,
  "claim_moisture" NUMERIC(10, 2) DEFAULT 0,
  "actual_dust" NUMERIC(10, 2) DEFAULT 0,
  "claim_dust" NUMERIC(10, 2) DEFAULT 0,
  "actual_ncv" NUMERIC(10, 2) DEFAULT 0,
  "claim_ncv" NUMERIC(10, 2) DEFAULT 0,
  "actual_grade_down" NUMERIC(10, 2) DEFAULT 0,
  "claim_grade_down" NUMERIC(10, 2) DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "satta_base_rate_audit_logs"
CREATE TABLE IF NOT EXISTS "satta_base_rate_audit_logs" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "old_rate" NUMERIC(15, 2),
  "new_rate" NUMERIC(15, 2) NOT NULL,
  "changed_date" DATE NOT NULL,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "base_rate_id" TEXT,
  "changed_by" TEXT,
  "updated_by_id" TEXT,
  "approval_status" TEXT DEFAULT 'PENDING'::text,
  "approved_by" TEXT,
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMPTZ,
  PRIMARY KEY ("id")
);

-- Table: "satta_base_rates"
CREATE TABLE IF NOT EXISTS "satta_base_rates" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "base_rate" NUMERIC(15, 2) DEFAULT 17500 NOT NULL,
  "start_date" DATE DEFAULT CURRENT_DATE NOT NULL,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "previous_rate" NUMERIC,
  "updated_by" TEXT,
  "updated_by_id" TEXT,
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "approval_status" TEXT DEFAULT 'APPROVED'::text,
  "approved_by" TEXT,
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMPTZ,
  "approval_remarks" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "satta_calculated_rates"
CREATE TABLE IF NOT EXISTS "satta_calculated_rates" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "base_rate_id" UUID,
  "base_rate" NUMERIC(15, 2) NOT NULL,
  "start_date" DATE NOT NULL,
  "area" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "differential" NUMERIC(15, 2) NOT NULL,
  "final_rate" NUMERIC(15, 2) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "satta_differential_audit_logs"
CREATE TABLE IF NOT EXISTS "satta_differential_audit_logs" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "changed_date" DATE DEFAULT CURRENT_DATE NOT NULL,
  "area" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "old_differential" NUMERIC(15, 2),
  "new_differential" NUMERIC(15, 2) NOT NULL,
  "differential_change" NUMERIC(15, 2),
  "changed_by" TEXT DEFAULT 'ADMIN'::text,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "satta_differentials"
CREATE TABLE IF NOT EXISTS "satta_differentials" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "area" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "differential" NUMERIC(15, 2) DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "satta_master"
CREATE TABLE IF NOT EXISTS "satta_master" (
  "satta_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT DEFAULT '2026-2027'::text NOT NULL,
  "satta_no" TEXT NOT NULL,
  "date" DATE DEFAULT CURRENT_DATE NOT NULL,
  "broker" TEXT,
  "supplier" TEXT,
  "status" TEXT DEFAULT 'pending'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "session" TEXT,
  "po_type" TEXT,
  "challan_supplier" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marks" TEXT,
  "no_of_lorries" INTEGER,
  "units_per_lorry_type" TEXT,
  "total_unit" INTEGER,
  "wt_per_lorry" NUMERIC(15, 3),
  "unit_type" TEXT,
  "total_wt_in_ton" NUMERIC(15, 3),
  "shipment_date" DATE,
  "shipment_days" INTEGER,
  "shipment_penalty" NUMERIC(15, 2),
  "marks_claim" NUMERIC(15, 2),
  "quantity_claim" NUMERIC(15, 2),
  "b_rate" NUMERIC(15, 2) DEFAULT 0,
  "b_date" DATE,
  "superior_normal_marks" TEXT,
  "signature_url" TEXT,
  "remarks" TEXT,
  "units_per_lorry" NUMERIC(15, 2),
  PRIMARY KEY ("satta_id")
);

-- Table: "satta_mismatch"
CREATE TABLE IF NOT EXISTS "satta_mismatch" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "sauda_no" TEXT,
  "po_no" TEXT,
  "area" TEXT,
  "grade" TEXT,
  "field" TEXT,
  "expected_value" TEXT,
  "actual_value" TEXT,
  "expected_rate" NUMERIC(15, 2),
  "actual_rate" NUMERIC(15, 2),
  "status" TEXT DEFAULT 'open'::text,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "approval_level" TEXT,
  "approved_at" TIMESTAMPTZ,
  "approved_by" TEXT,
  "mismatch_id" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "satta_quality_details"
CREATE TABLE IF NOT EXISTS "satta_quality_details" (
  "id" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: "sauda_approval_history"
CREATE TABLE IF NOT EXISTS "sauda_approval_history" (
  "id" TEXT NOT NULL,
  "sauda_id" TEXT,
  "sauda_no" TEXT NOT NULL,
  "action_type" TEXT NOT NULL,
  "user_id" TEXT,
  "username" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "remarks" TEXT,
  "financial_year" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "sauda_check_point"
CREATE TABLE IF NOT EXISTS "sauda_check_point" (
  "po_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT NOT NULL,
  "purchase_order" TEXT,
  "po_type" TEXT,
  "ptf_no" TEXT,
  "pending" BOOLEAN DEFAULT true,
  "po_no" TEXT NOT NULL,
  "po_date" DATE NOT NULL,
  "broker" TEXT,
  "supplier" TEXT,
  "challan_supplier" TEXT,
  "area" TEXT,
  "trans_paid_by" TEXT,
  "weight_unit_kgs" NUMERIC(15, 2),
  "against_cancellation" TEXT,
  "purchase_unit_code" TEXT,
  "purchase_unit_name" TEXT,
  "total_lorries" NUMERIC(15, 2),
  "units_per_lorry" NUMERIC(15, 2),
  "total_units" NUMERIC(15, 2),
  "weight_per_lorry" NUMERIC(15, 3),
  "total_contract_mt" NUMERIC(15, 3),
  "marka_type" TEXT,
  "marka_penalty" NUMERIC(15, 2),
  "qty_penalty" NUMERIC(15, 2),
  "delivery_from" DATE,
  "delivery_to" DATE,
  "grace_days" INTEGER,
  "delivery_penalty" NUMERIC(15, 2),
  "contract_po_no" TEXT,
  "contract_date" DATE,
  "rate_detail" TEXT,
  "delivery_schedule" TEXT,
  "terms_condition" TEXT,
  "remarks" TEXT,
  "po_identification" TEXT,
  "b_rate" NUMERIC(15, 2),
  "s_date" DATE,
  "status" TEXT DEFAULT 'pending'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "excess_short_deduction" NUMERIC(15, 2),
  "excess_short_status" TEXT,
  "open_remarks" JSONB,
  "premium" NUMERIC(15, 2) DEFAULT 0,
  PRIMARY KEY ("po_id")
);

-- Table: "sauda_check_point_deductions"
CREATE TABLE IF NOT EXISTS "sauda_check_point_deductions" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "po_no" TEXT NOT NULL,
  "sauda_no" TEXT,
  "supplier" TEXT,
  "broker" TEXT,
  "contract_weight_mt" NUMERIC(15, 3),
  "tolerance_pct" NUMERIC(15, 3),
  "tolerance_mt" NUMERIC(15, 3),
  "tolerance_type" TEXT,
  "min_acceptable_mt" NUMERIC(15, 3),
  "max_acceptable_mt" NUMERIC(15, 3),
  "total_received_mt" NUMERIC(15, 3),
  "variation_type" TEXT,
  "variation_mt" NUMERIC(15, 3),
  "selected_grade" TEXT,
  "sauda_rate" NUMERIC(15, 2),
  "satta_rate" NUMERIC(15, 2),
  "last_arrival_date" DATE,
  "applicable_rate" NUMERIC(15, 2),
  "rate_basis" TEXT,
  "deduction_qty_mt" NUMERIC(15, 3),
  "deduction_amount" NUMERIC(15, 2),
  "status" TEXT DEFAULT 'calculated'::text,
  "remarks" TEXT,
  "arrival_numbers" TEXT,
  "grade_breakdown" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "rate_difference" NUMERIC(15, 2),
  "deduction_qty_qtl" NUMERIC(15, 2),
  "approved_by" TEXT,
  "approval_level" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "sauda_check_point_details"
CREATE TABLE IF NOT EXISTS "sauda_check_point_details" (
  "item_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "po_no" TEXT,
  "srl_no" INTEGER,
  "crop_year" TEXT,
  "grade_code" TEXT,
  "agency_code" TEXT,
  "marka_code" TEXT,
  "quantity" INTEGER,
  "weight_mt" NUMERIC(15, 3),
  "rate_qntl" NUMERIC(15, 2),
  "premium" NUMERIC(15, 2) DEFAULT 0,
  "grade_name" TEXT,
  "agency_name" TEXT,
  "marka_name" TEXT,
  PRIMARY KEY ("item_id")
);

-- Table: "sauda_master"
CREATE TABLE IF NOT EXISTS "sauda_master" (
  "sauda_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT NOT NULL,
  "sauda_no" TEXT NOT NULL,
  "session" TEXT,
  "po_type" TEXT,
  "date" DATE NOT NULL,
  "broker" TEXT,
  "supplier" TEXT,
  "challan_supplier" TEXT,
  "area" TEXT,
  "agency" TEXT,
  "marks" TEXT,
  "no_of_lorries" INTEGER,
  "units_per_lorry_type" TEXT,
  "total_unit" INTEGER,
  "wt_per_lorry" NUMERIC(15, 3),
  "unit_type" TEXT,
  "total_wt_in_ton" NUMERIC(15, 3),
  "shipment_date" DATE,
  "shipment_days" INTEGER,
  "shipment_penalty" NUMERIC(15, 2),
  "marks_claim" NUMERIC(15, 2),
  "quantity_claim" NUMERIC(15, 2),
  "remarks" TEXT,
  "b_rate" NUMERIC(15, 2),
  "b_date" DATE,
  "status" TEXT DEFAULT 'pending'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "units_per_lorry" NUMERIC(15, 2),
  "rejected_by" TEXT,
  "rejected_at" TIMESTAMPTZ,
  "approved_by" TEXT,
  "approved_at" TIMESTAMPTZ,
  "checked_by" TEXT,
  "checked_at" TIMESTAMPTZ,
  "is_checked" BOOLEAN DEFAULT false,
  "approval_status" TEXT,
  "created_by" TEXT,
  "rejected_user_id" TEXT,
  "approved_user_id" TEXT,
  "quality_details" JSONB,
  "superior_normal_marks" TEXT,
  "rejection_remarks" TEXT,
  "submitted_by" TEXT,
  "submitted_at" TIMESTAMPTZ,
  "resubmission_count" INTEGER DEFAULT 0,
  "last_updated_at" TIMESTAMPTZ,
  PRIMARY KEY ("sauda_id")
);

-- Table: "sauda_quality_details"
CREATE TABLE IF NOT EXISTS "sauda_quality_details" (
  "detail_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "sauda_id" UUID,
  "financial_year" TEXT,
  "quality" TEXT,
  "qty" NUMERIC(15, 3),
  "rs" NUMERIC(15, 2),
  "agency" TEXT,
  "marka" TEXT,
  "premium" NUMERIC(15, 2) DEFAULT 0,
  "sauda_no" TEXT,
  PRIMARY KEY ("detail_id")
);

-- Table: "settlement_print_history"
CREATE TABLE IF NOT EXISTS "settlement_print_history" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "mr_no" TEXT NOT NULL,
  "print_count" INTEGER NOT NULL,
  "printed_by_name" TEXT,
  "printed_by_id" TEXT,
  "printed_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "sms_sauda"
CREATE TABLE IF NOT EXISTS "sms_sauda" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "sauda_no" TEXT,
  "po_type" TEXT DEFAULT 'Normal'::text,
  "date" DATE,
  "session" TEXT,
  "broker" TEXT,
  "supplier" TEXT,
  "challan_supplier" TEXT,
  "area" TEXT,
  "no_of_lorries" INTEGER,
  "units_per_lorry" NUMERIC(15, 2),
  "total_unit" INTEGER,
  "wt_per_lorry" NUMERIC(15, 3),
  "unit_type" TEXT,
  "total_wt_tons" NUMERIC(15, 3),
  "shipment_date" DATE,
  "shipment_days" INTEGER,
  "shipment_penalty" NUMERIC(15, 2),
  "marks_claim" NUMERIC(15, 2),
  "quantity_claim" NUMERIC(15, 2),
  "remarks" TEXT,
  "b_rate" NUMERIC(15, 2),
  "b_date" DATE,
  "superior_normal_marks" TEXT,
  "status" TEXT DEFAULT 'Pending'::text,
  "quality_details" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "sms_id" TEXT,
  "raw_sms_body" TEXT,
  "sauda_created" BOOLEAN DEFAULT false,
  "marked_by" TEXT,
  "marked_at" TIMESTAMPTZ,
  "approval_level" TEXT,
  "approved_at" TEXT,
  "approved_by" TEXT,
  "mismatch_cleared" TEXT,
  "satta_dispute_approved" TEXT,
  "satta_remarks" TEXT,
  PRIMARY KEY ("id")
);

-- Table: "supply_master"
CREATE TABLE IF NOT EXISTS "supply_master" (
  "supp_code" TEXT NOT NULL,
  "supp_name" TEXT NOT NULL,
  "acc_no" TEXT,
  "supp_add1" TEXT,
  "supp_add2" TEXT,
  "supp_add3" TEXT,
  "supp_city" TEXT,
  "supp_contact" TEXT,
  "supp_ph_no" TEXT,
  "supp_cell_no" TEXT,
  "supp_fax_no" TEXT,
  "supp_email" TEXT,
  "supp_webadd" TEXT,
  "erp_user_code" TEXT,
  "pan_no" TEXT,
  "ifsc_code" TEXT,
  "ifsc_branch" TEXT,
  "supplier_group" TEXT,
  "jc_regis_no" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "id" BIGINT NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: "temporary_material_received"
CREATE TABLE IF NOT EXISTS "temporary_material_received" (
  "amad_id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "financial_year" TEXT NOT NULL,
  "temporary_arrival_no" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "jci" TEXT,
  "challan_supplier" TEXT,
  "supplier" TEXT,
  "broker" TEXT,
  "transporter_name" TEXT,
  "challan_rr_no" TEXT,
  "lorry_number" TEXT,
  "pan_no" TEXT,
  "lorry_date" DATE,
  "consignment_note_no" TEXT,
  "di_no" TEXT,
  "di_date" DATE,
  "invoice_no" TEXT,
  "invoice_date" DATE,
  "ptf" TEXT,
  "lorry_returned" TEXT,
  "lorry_returned_other_mill" TEXT,
  "arrival_area_code" TEXT,
  "arrival_area_name" TEXT,
  "unit_code" TEXT,
  "unit_name" TEXT,
  "way_bill_no" TEXT,
  "way_bill_date" DATE,
  "apmc_fees" NUMERIC,
  "remarks" TEXT,
  "total_packets" INTEGER,
  "weight_qtl" NUMERIC,
  "grid_details" JSONB,
  "challan_material_weight" NUMERIC,
  "actual_gross_weight" NUMERIC,
  "actual_tare_weight" NUMERIC,
  "supplier_net_weight" NUMERIC,
  "supplier_challan_gross" NUMERIC,
  "supplier_tare_weight" NUMERIC,
  "electronic_net_weight" NUMERIC,
  "electronic_gross_weight" NUMERIC,
  "electronic_tare_weight" NUMERIC,
  "weight_reduced" NUMERIC,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "po_no" TEXT,
  "status" TEXT,
  "commodity" TEXT,
  "variety" TEXT,
  "grading" TEXT,
  "marka" TEXT,
  "packets" INTEGER,
  "weight" NUMERIC,
  "entry_notes" TEXT,
  "agency_name" TEXT,
  "consignment_note" TEXT,
  "challan_railway_receipt_no" TEXT,
  "phota" TEXT,
  PRIMARY KEY ("amad_id")
);

-- Table: "tolerance_policy"
CREATE TABLE IF NOT EXISTS "tolerance_policy" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "status" TEXT DEFAULT 'ACTIVE'::text,
  "is_active" BOOLEAN DEFAULT true,
  "policy_name" TEXT NOT NULL,
  "description" TEXT,
  "tolerance_pct" NUMERIC(5, 2) DEFAULT 5.00,
  "max_limit_kg" NUMERIC(10, 2) DEFAULT 1500.00,
  "max_limit_mt" NUMERIC(10, 3) DEFAULT 1.500,
  "unit" TEXT DEFAULT 'BALES'::text,
  "rule_formula" TEXT DEFAULT 'Min(5% of Sauda MT, 1.500 MT)'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "tolerance_policy_master"
CREATE TABLE IF NOT EXISTS "tolerance_policy_master" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "policy_name" TEXT NOT NULL,
  "tolerance_pct" NUMERIC(5, 2) DEFAULT 5.00,
  "max_weight_limit_kg" NUMERIC(10, 2) DEFAULT 1500.00,
  "max_weight_limit_mt" NUMERIC(10, 3) DEFAULT 1.500,
  "applicable_unit" TEXT DEFAULT 'BALES'::text,
  "is_active" BOOLEAN DEFAULT true,
  "is_default" BOOLEAN DEFAULT false,
  "description" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "unit_master"
CREATE TABLE IF NOT EXISTS "unit_master" (
  "id" UUID DEFAULT gen_random_uuid() NOT NULL,
  "unit_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Table: "user_activity_logs"
CREATE TABLE IF NOT EXISTS "user_activity_logs" (
  "log_id" BIGINT NOT NULL,
  "username" TEXT,
  "activity_type" TEXT,
  "module_name" TEXT,
  "action_details" TEXT,
  "ip_address" TEXT DEFAULT 'Local'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("log_id")
);

-- Table: "user_master"
CREATE TABLE IF NOT EXISTS "user_master" (
  "user_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT DEFAULT 'USER'::text,
  "status" TEXT DEFAULT 'Active'::text,
  "allowed_modules" TEXT DEFAULT '*'::text,
  "level" TEXT DEFAULT 'L1'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "last_login" TIMESTAMPTZ,
  PRIMARY KEY ("user_id")
);

-- View: amad_register
CREATE OR REPLACE VIEW "amad_register" AS
SELECT amad_id,
    financial_year,
    temporary_arrival_no AS amad_no,
    po_no,
    date,
    jci,
    challan_supplier,
    supplier,
    agency_name,
    broker,
    transporter_name,
    challan_rr_no,
    lorry_number AS lorry_no,
    pan_no,
    lorry_date,
    consignment_note_no,
    di_no,
    di_date,
    invoice_no,
    invoice_date,
    ptf,
    lorry_returned,
    lorry_returned_other_mill,
    arrival_area_code,
    arrival_area_name,
    unit_code,
    unit_name,
    way_bill_no,
    way_bill_date,
    apmc_fees,
    remarks,
    total_packets,
    weight_qtl,
    grid_details,
    challan_material_weight,
    actual_gross_weight,
    actual_tare_weight,
    supplier_net_weight,
    supplier_challan_gross,
    supplier_tare_weight,
    electronic_net_weight,
    electronic_gross_weight,
    electronic_tare_weight,
    weight_reduced,
    entry_notes,
    created_at
   FROM temporary_material_received;;

-- Functions (9 Functions from Supabase)
-- Function: exec_sql
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE query;
END;
$function$;

-- Function: exec_sql_return
CREATE OR REPLACE FUNCTION public.exec_sql_return(query text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    r record;
BEGIN
    FOR r IN EXECUTE query LOOP
        RETURN NEXT to_jsonb(r);
    END LOOP;
END;
$function$;

-- Function: fn_save_material_inspection
CREATE OR REPLACE FUNCTION public.fn_save_material_inspection(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
        DECLARE
          v_mr_no TEXT;
          v_prod_id TEXT;
          v_prod_exists BOOLEAN := true;
          v_res RECORD;
          v_item JSONB;
        BEGIN
          v_mr_no := TRIM(payload->>'mr_no');
          IF v_mr_no IS NULL OR v_mr_no = '' THEN
            RAISE EXCEPTION 'M.R. No is mandatory for Material Inspection Register.';
          END IF;

          v_prod_id := TRIM(COALESCE(payload->>'production_id', ''));
          IF v_prod_id <> '' THEN
            SELECT EXISTS(
              SELECT 1 FROM production_records 
              WHERE id = v_prod_id OR batch_no = v_prod_id OR production_no = v_prod_id OR lot_no = v_prod_id
            ) INTO v_prod_exists;

            IF NOT v_prod_exists THEN
              RAISE EXCEPTION 'Required Production row % not found in database.', v_prod_id;
            END IF;
          END IF;

          INSERT INTO material_inspection (
            mr_no, mr_date, date, arrival_no, arrival_date, po_no, po_date,
            broker_name, supplier_name, broker, supplier,
            actual_moisture, claim_moisture, actual_dust, claim_dust,
            actual_ncv, claim_ncv, actual_grade_down, claim_grade_down,
            detention_days, unloading_date, mill_po_no, mill_po_date,
            mr_spcl_print, remarks, lorry_number, delivery_claim,
            deduction_type, deduction_rate, deduction_qty, deduction_amount,
            deductions, deduction_rows, deductions_json, deduction_types,
            unit_name, unit, status, grid_details, details,
            company_id, unit_id, machine_id, shift, department,
            production_id, production_ref, batch_id, quantity, total_quantity,
            challan_gross_wt, receipt_gross_wt, gross_weight_batch,
            add_weight, less_weight, reduced_weight, final_receipt_wt,
            arrival_grade, stock_grade_code, stock_grade_name, area, agency,
            agency_code, marks, marka, crop_year, lot,
            created_at, updated_at
          ) VALUES (
            v_mr_no,
            COALESCE((payload->>'mr_date')::DATE, CURRENT_DATE),
            COALESCE((payload->>'date')::DATE, CURRENT_DATE),
            COALESCE(payload->>'arrival_no', v_mr_no),
            COALESCE((payload->>'arrival_date')::DATE, CURRENT_DATE),
            payload->>'po_no',
            (payload->>'po_date')::DATE,
            payload->>'broker_name',
            payload->>'supplier_name',
            payload->>'broker',
            payload->>'supplier',
            COALESCE((payload->>'actual_moisture')::NUMERIC, 0),
            COALESCE((payload->>'claim_moisture')::NUMERIC, 0),
            COALESCE((payload->>'actual_dust')::NUMERIC, 0),
            COALESCE((payload->>'claim_dust')::NUMERIC, 0),
            COALESCE((payload->>'actual_ncv')::NUMERIC, 0),
            COALESCE((payload->>'claim_ncv')::NUMERIC, 0),
            COALESCE((payload->>'actual_grade_down')::NUMERIC, 0),
            COALESCE((payload->>'claim_grade_down')::NUMERIC, 0),
            COALESCE((payload->>'detention_days')::NUMERIC, 0),
            (payload->>'unloading_date')::DATE,
            payload->>'mill_po_no',
            (payload->>'mill_po_date')::DATE,
            payload->>'mr_spcl_print',
            payload->>'remarks',
            payload->>'lorry_number',
            COALESCE((payload->>'delivery_claim')::NUMERIC, 0),
            payload->>'deduction_type',
            COALESCE((payload->>'deduction_rate')::NUMERIC, 0),
            COALESCE((payload->>'deduction_qty')::NUMERIC, 0),
            COALESCE((payload->>'deduction_amount')::NUMERIC, 0),
            payload->'deductions',
            payload->'deduction_rows',
            payload->>'deductions_json',
            payload->'deduction_types',
            COALESCE(payload->>'unit_name', 'BALES'),
            COALESCE(payload->>'unit', 'BALES'),
            COALESCE(payload->>'status', 'Completed'),
            payload->'grid_details',
            payload->'details',
            payload->>'company_id',
            payload->>'unit_id',
            payload->>'machine_id',
            payload->>'shift',
            payload->>'department',
            payload->>'production_id',
            payload->>'production_ref',
            payload->>'batch_id',
            COALESCE((payload->>'quantity')::NUMERIC, 0),
            COALESCE((payload->>'total_quantity')::NUMERIC, 0),
            COALESCE((payload->>'challan_gross_wt')::NUMERIC, 0),
            COALESCE((payload->>'receipt_gross_wt')::NUMERIC, 0),
            COALESCE((payload->>'gross_weight_batch')::NUMERIC, 0),
            COALESCE((payload->>'add_weight')::NUMERIC, 0),
            COALESCE((payload->>'less_weight')::NUMERIC, 0),
            COALESCE((payload->>'reduced_weight')::NUMERIC, 0),
            COALESCE((payload->>'final_receipt_wt')::NUMERIC, 0),
            payload->>'arrival_grade',
            payload->>'stock_grade_code',
            payload->>'stock_grade_name',
            payload->>'area',
            payload->>'agency',
            payload->>'agency_code',
            payload->>'marks',
            payload->>'marka',
            COALESCE(payload->>'crop_year', '2026-27'),
            payload->>'lot',
            NOW(),
            NOW()
          )
          ON CONFLICT (mr_no) DO UPDATE SET
            mr_date = EXCLUDED.mr_date,
            date = EXCLUDED.date,
            arrival_no = EXCLUDED.arrival_no,
            arrival_date = EXCLUDED.arrival_date,
            po_no = EXCLUDED.po_no,
            po_date = EXCLUDED.po_date,
            broker_name = EXCLUDED.broker_name,
            supplier_name = EXCLUDED.supplier_name,
            broker = EXCLUDED.broker,
            supplier = EXCLUDED.supplier,
            actual_moisture = EXCLUDED.actual_moisture,
            claim_moisture = EXCLUDED.claim_moisture,
            actual_dust = EXCLUDED.actual_dust,
            claim_dust = EXCLUDED.claim_dust,
            actual_ncv = EXCLUDED.actual_ncv,
            claim_ncv = EXCLUDED.claim_ncv,
            actual_grade_down = EXCLUDED.actual_grade_down,
            claim_grade_down = EXCLUDED.claim_grade_down,
            detention_days = EXCLUDED.detention_days,
            unloading_date = EXCLUDED.unloading_date,
            mill_po_no = EXCLUDED.mill_po_no,
            mill_po_date = EXCLUDED.mill_po_date,
            mr_spcl_print = EXCLUDED.mr_spcl_print,
            remarks = EXCLUDED.remarks,
            lorry_number = EXCLUDED.lorry_number,
            delivery_claim = EXCLUDED.delivery_claim,
            deduction_type = EXCLUDED.deduction_type,
            deduction_rate = EXCLUDED.deduction_rate,
            deduction_qty = EXCLUDED.deduction_qty,
            deduction_amount = EXCLUDED.deduction_amount,
            deductions = EXCLUDED.deductions,
            deduction_rows = EXCLUDED.deduction_rows,
            deductions_json = EXCLUDED.deductions_json,
            deduction_types = EXCLUDED.deduction_types,
            unit_name = EXCLUDED.unit_name,
            unit = EXCLUDED.unit,
            status = EXCLUDED.status,
            grid_details = EXCLUDED.grid_details,
            details = EXCLUDED.details,
            company_id = EXCLUDED.company_id,
            unit_id = EXCLUDED.unit_id,
            machine_id = EXCLUDED.machine_id,
            shift = EXCLUDED.shift,
            department = EXCLUDED.department,
            production_id = EXCLUDED.production_id,
            production_ref = EXCLUDED.production_ref,
            batch_id = EXCLUDED.batch_id,
            quantity = EXCLUDED.quantity,
            total_quantity = EXCLUDED.total_quantity,
            challan_gross_wt = EXCLUDED.challan_gross_wt,
            receipt_gross_wt = EXCLUDED.receipt_gross_wt,
            gross_weight_batch = EXCLUDED.gross_weight_batch,
            add_weight = EXCLUDED.add_weight,
            less_weight = EXCLUDED.less_weight,
            reduced_weight = EXCLUDED.reduced_weight,
            final_receipt_wt = EXCLUDED.final_receipt_wt,
            arrival_grade = EXCLUDED.arrival_grade,
            stock_grade_code = EXCLUDED.stock_grade_code,
            stock_grade_name = EXCLUDED.stock_grade_name,
            area = EXCLUDED.area,
            agency = EXCLUDED.agency,
            agency_code = EXCLUDED.agency_code,
            marks = EXCLUDED.marks,
            marka = EXCLUDED.marka,
            crop_year = EXCLUDED.crop_year,
            lot = EXCLUDED.lot,
            updated_at = NOW()
          RETURNING * INTO v_res;

          -- Clean and insert into material_inspection_deductions
          DELETE FROM material_inspection_deductions WHERE mr_no = v_mr_no;
          IF payload->'deduction_rows' IS NOT NULL AND jsonb_array_length(payload->'deduction_rows') > 0 THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'deduction_rows')
            LOOP
              INSERT INTO material_inspection_deductions (
                mr_no, po_no, arrival_no, mr_date, po_date, arrival_date,
                supplier, supplier_name, broker, broker_name, lorry_number,
                deduction_type, deduction_rate, deduction_qty, deduction_amount,
                unit, gross_weight_mt, total_bales, avg_bale_weight, remarks,
                created_at, updated_at
              ) VALUES (
                v_mr_no,
                payload->>'po_no',
                COALESCE(payload->>'arrival_no', v_mr_no),
                COALESCE((payload->>'mr_date')::DATE, CURRENT_DATE),
                (payload->>'po_date')::DATE,
                COALESCE((payload->>'arrival_date')::DATE, CURRENT_DATE),
                payload->>'supplier',
                payload->>'supplier_name',
                payload->>'broker',
                payload->>'broker_name',
                payload->>'lorry_number',
                v_item->>'deduction_type',
                COALESCE((v_item->>'deduction_rate')::NUMERIC, 0),
                COALESCE((v_item->>'deduction_qty')::NUMERIC, 0),
                COALESCE((v_item->>'deduction_amount')::NUMERIC, 0),
                COALESCE(payload->>'unit', 'BALES'),
                COALESCE((payload->>'receipt_gross_wt')::NUMERIC, 0),
                COALESCE((payload->>'total_quantity')::NUMERIC, 0),
                0,
                v_item->>'remarks',
                NOW(),
                NOW()
              );
            END LOOP;
          END IF;

          RETURN jsonb_build_object(
            'success', true,
            'recordId', v_res.mr_no,
            'affectedRows', 1,
            'data', to_jsonb(v_res)
          );
        END;
        $function$;

-- Function: get_all_tables
CREATE OR REPLACE FUNCTION public.get_all_tables()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
    DECLARE
      res json;
    BEGIN
      SELECT json_agg(table_name) INTO res FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      RETURN res;
    END;
    $function$;

-- Function: search_all_tables
CREATE OR REPLACE FUNCTION public.search_all_tables(search_text text)
 RETURNS TABLE(table_name text, column_name text, matched_value text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    r RECORD;
    sql_query TEXT;
BEGIN
    FOR r IN
        SELECT
            c.table_schema,
            c.table_name,
            c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.data_type IN ('character varying', 'character', 'text')
        ORDER BY c.table_name, c.ordinal_position
    LOOP

        sql_query := format(
            'SELECT %L::TEXT, %L::TEXT, %I::TEXT
             FROM %I.%I
             WHERE %I::TEXT ILIKE %L',
            r.table_name,
            r.column_name,
            r.column_name,
            r.table_schema,
            r.table_name,
            r.column_name,
            '%' || search_text || '%'
        );

        RETURN QUERY EXECUTE sql_query;

    END LOOP;
END;
$function$;

-- Function: trg_material_inspection_validate_sync
CREATE OR REPLACE FUNCTION public.trg_material_inspection_validate_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
        BEGIN
          -- Enforce mandatory mr_no
          IF NEW.mr_no IS NULL OR TRIM(NEW.mr_no) = '' THEN
            RAISE EXCEPTION 'M.R. No is mandatory for Material Inspection Register.';
          END IF;

          -- Fallback arrival_no to mr_no
          IF NEW.arrival_no IS NULL OR TRIM(NEW.arrival_no) = '' THEN
            NEW.arrival_no := NEW.mr_no;
          END IF;

          -- Sanitize dates
          IF NEW.mr_date IS NULL THEN
            NEW.mr_date := CURRENT_DATE;
          END IF;
          IF NEW.date IS NULL THEN
            NEW.date := NEW.mr_date;
          END IF;
          IF NEW.arrival_date IS NULL THEN
            NEW.arrival_date := NEW.mr_date;
          END IF;

          NEW.updated_at := NOW();
          RETURN NEW;
        END;
        $function$;

-- Function: update_purchase_pending_received
CREATE OR REPLACE FUNCTION public.update_purchase_pending_received()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
            DECLARE
              v_po_no TEXT;
              v_total_contract NUMERIC(15,3);
              v_total_settled NUMERIC(15,3);
            BEGIN
              IF TG_OP = 'DELETE' THEN
                v_po_no := OLD.po_no;
              ELSE
                v_po_no := NEW.po_no;
              END IF;

              SELECT COALESCE(total_contract_mt, 0)
              INTO v_total_contract
              FROM purchase_master
              WHERE po_no = v_po_no;

              SELECT COALESCE(SUM(quantity), 0)
              INTO v_total_settled
              FROM m_r_settlement
              WHERE po_no = v_po_no;

              UPDATE purchase_master
              SET pending_received = GREATEST(0, v_total_contract - v_total_settled)
              WHERE po_no = v_po_no;

              IF TG_OP = 'DELETE' THEN
                RETURN OLD;
              END IF;
              RETURN NEW;
            END;
            $function$;

-- Function: update_timestamp_column
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$;

-- Function: upper_supp_name_trigger
CREATE OR REPLACE FUNCTION public.upper_supp_name_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
              BEGIN
                IF NEW.supp_name IS NOT NULL THEN
                  NEW.supp_name := UPPER(NEW.supp_name);
                END IF;
                RETURN NEW;
              END;
              $function$;

