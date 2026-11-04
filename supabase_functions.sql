
-- =======================================================
-- ALL 9 STORED FUNCTIONS FROM SUPABASE
-- =======================================================

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE query;
END;
$function$
;

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
$function$
;

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
    $function$
;

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
            $function$
;

CREATE OR REPLACE FUNCTION public.update_timestamp_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

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
              $function$
;

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
        $function$
;

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
$function$
;

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
        $function$
;

