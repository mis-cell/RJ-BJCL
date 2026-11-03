import { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { dbModule } from '../../services/dbModule';
import { canDeleteData } from '../../lib/utils';
import { broadcastPermissionsUpdated } from '../../lib/permissions';
import { logChange } from '../../services/auditLogService';
import { TableDef, TABLES } from './adminDeskTypes';
import { Database } from 'lucide-react';

interface UseAdminDeskDataProps {
  isAuthenticated: boolean;
}

export function useAdminDeskData({ isAuthenticated }: UseAdminDeskDataProps) {
  const [tables, setTables] = useState<TableDef[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRow, setEditingRow] = useState<any>(null);
  const [isNewRow, setIsNewRow] = useState<boolean>(false);
  const lastEditingRowRef = useRef<any>(null);

  useEffect(() => {
    if (editingRow !== null && lastEditingRowRef.current === null) {
      const isNew = Object.keys(editingRow).length === 0;
      setIsNewRow(isNew);
    }
    lastEditingRowRef.current = editingRow;
  }, [editingRow]);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('TEXT');
  const [newTableName, setNewTableName] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Memoize purchaseOrders with real database values or fallback defaults
  const purchaseOrders = useMemo(() => {
    if (data && data.length > 0 && selectedTable?.name === 'purchase_master') {
      return data;
    }
    return [
      { po_no: 'PO-88/26', supplier: 'BENGAL BALING CO.', broker: 'DIRECT', area: 'KOLKATA CORE', total_contract_mt: 45, b_rate: 17400 },
      { po_no: 'PO-102/26', supplier: 'BIHAR ASSOCIATED FIBRES', broker: 'K.C. CHOPRA', area: 'BIHAR VALLEY', total_contract_mt: 36, b_rate: 17150 },
      { po_no: 'PO-115/26', supplier: 'ORISSA JUTE EXPORTERS', broker: 'R.K. MEHTA', area: 'ORISSA COAST', total_contract_mt: 60, b_rate: 17600 },
      { po_no: 'PO-142/26', supplier: 'EASTERN BALER TRADERS', broker: 'DIRECT', area: 'ASSAM REGION', total_contract_mt: 50, b_rate: 17200 },
    ];
  }, [data, selectedTable]);

  // Read tables schema metadata
  const fetchTables = async () => {
    if (!supabase) {
      setTables(TABLES);
      if (!selectedTable) setSelectedTable(TABLES[0]);
      return;
    }
    try {
      const isBootstrapped = typeof window !== 'undefined' && (sessionStorage.getItem('admindesk_tables_bootstrapped') || localStorage.getItem('admindesk_tables_bootstrapped'));
      if (!isBootstrapped) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('admindesk_tables_bootstrapped', '1');
          localStorage.setItem('admindesk_tables_bootstrapped', '1');
        }
        try {
          await supabase.rpc("exec_sql", {
            query: `
              CREATE TABLE IF NOT EXISTS user_master (
                user_id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'USER',
                status TEXT DEFAULT 'Active',
                allowed_modules TEXT DEFAULT '*',
                level TEXT DEFAULT 'L1',
                last_login TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );

              INSERT INTO user_master (user_id, username, password, role, status, allowed_modules, level)
              VALUES ('001', 'ADMIN', 'Admin@1234', 'ADMIN', 'Active', '*', 'L5')
              ON CONFLICT (username) DO NOTHING;
            `
          });
        } catch (err) {
          console.warn("Table patch user_master schema validation failure:", err);
        }

        try {
          await supabase.rpc("exec_sql", {
            query: `
              CREATE TABLE IF NOT EXISTS customer_master (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                firm_name TEXT,
                proprietor_name TEXT,
                email TEXT,
                contact_number TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS customer_master DISABLE ROW LEVEL SECURITY;

              CREATE TABLE IF NOT EXISTS moisture_logic (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                season TEXT,
                operating_area TEXT,
                threshold_limit TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS moisture_logic DISABLE ROW LEVEL SECURITY;

              INSERT INTO moisture_logic (season, operating_area, threshold_limit)
              SELECT 'JANUARY TO JUNE (WET SEASON)', 'DAISEE Operating Areas', 'Moisture threshold limit is 18%'
              WHERE NOT EXISTS (SELECT 1 FROM moisture_logic WHERE season = 'JANUARY TO JUNE (WET SEASON)' AND operating_area = 'DAISEE Operating Areas');

              INSERT INTO moisture_logic (season, operating_area, threshold_limit)
              SELECT 'JANUARY TO JUNE (WET SEASON)', 'Standard / Non-DAISEE', 'Moisture threshold limit is 16%'
              WHERE NOT EXISTS (SELECT 1 FROM moisture_logic WHERE season = 'JANUARY TO JUNE (WET SEASON)' AND operating_area = 'Standard / Non-DAISEE');

              INSERT INTO moisture_logic (season, operating_area, threshold_limit)
              SELECT 'JULY TO DECEMBER (DRY SEASON)', 'DAISEE Operating Areas', 'Moisture threshold limit is 20%'
              WHERE NOT EXISTS (SELECT 1 FROM moisture_logic WHERE season = 'JULY TO DECEMBER (DRY SEASON)' AND operating_area = 'DAISEE Operating Areas');

              INSERT INTO moisture_logic (season, operating_area, threshold_limit)
              SELECT 'JULY TO DECEMBER (DRY SEASON)', 'Standard / Non-DAISEE', 'Moisture threshold limit is 18%'
              WHERE NOT EXISTS (SELECT 1 FROM moisture_logic WHERE season = 'JULY TO DECEMBER (DRY SEASON)' AND operating_area = 'Standard / Non-DAISEE');
            `
          });
        } catch (err) {
          console.warn("Table creation warn on customer_master/moisture_logic:", err);
        }

        try {
          await supabase.rpc("exec_sql", {
            query: `
              CREATE TABLE IF NOT EXISTS user_activity_logs (
                log_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                username TEXT,
                activity_type TEXT,
                module_name TEXT,
                action_details TEXT,
                ip_address TEXT DEFAULT 'Local',
                created_at TIMESTAMPTZ DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS user_activity_logs DISABLE ROW LEVEL SECURITY;
            `
          });
        } catch (err) {
          console.warn("Table creation warn on user_activity_logs:", err);
        }

        try {
          await supabase.rpc("exec_sql", {
            query: `
              DROP TABLE IF EXISTS unit_maste CASCADE;

              CREATE TABLE IF NOT EXISTS unit_master (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                unit_name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS unit_master DISABLE ROW LEVEL SECURITY;

              INSERT INTO unit_master (unit_name)
              VALUES ('DRUMS'), ('BALES'), ('LOOSE'), ('P.BALES'), ('H.BALES')
              ON CONFLICT (unit_name) DO NOTHING;

              CREATE TABLE IF NOT EXISTS deduction_master (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                deduction TEXT UNIQUE,
                rate_per_qntl NUMERIC(15,2),
                rate_per_unit NUMERIC(15,2),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS deduction_master DISABLE ROW LEVEL SECURITY;
              ALTER TABLE IF EXISTS deduction_master ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

              CREATE TABLE IF NOT EXISTS tolerance_policy (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                status TEXT DEFAULT 'ACTIVE',
                is_active BOOLEAN DEFAULT true,
                policy_name TEXT NOT NULL,
                description TEXT,
                tolerance_pct NUMERIC(5,2) DEFAULT 5.00,
                max_limit_kg NUMERIC(10,2) DEFAULT 1500.00,
                max_limit_mt NUMERIC(10,3) DEFAULT 1.500,
                unit TEXT DEFAULT 'BALES',
                rule_formula TEXT DEFAULT 'Min(5% of Sauda MT, 1.500 MT)',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS tolerance_policy DISABLE ROW LEVEL SECURITY;

              INSERT INTO tolerance_policy (status, is_active, policy_name, description, tolerance_pct, max_limit_kg, max_limit_mt, unit, rule_formula)
              VALUES ('ACTIVE', true, 'Raw Jute Bales Standard Policy (5% or 1500 KG)', 'Lower of 5% of Sauda contract quantity or 1,500 KG (15.00 Qtl / 1.500 MT).', 5.00, 1500.00, 1.500, 'BALES', 'Min(5% of Sauda MT, 1.500 MT)')
              ON CONFLICT DO NOTHING;

              CREATE TABLE IF NOT EXISTS tolerance_policy_master (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                policy_name TEXT NOT NULL,
                tolerance_pct NUMERIC(5,2) DEFAULT 5.00,
                max_weight_limit_kg NUMERIC(10,2) DEFAULT 1500.00,
                max_weight_limit_mt NUMERIC(10,3) DEFAULT 1.500,
                applicable_unit TEXT DEFAULT 'BALES',
                is_active BOOLEAN DEFAULT true,
                is_default BOOLEAN DEFAULT false,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS tolerance_policy_master DISABLE ROW LEVEL SECURITY;

              INSERT INTO tolerance_policy_master (policy_name, tolerance_pct, max_weight_limit_kg, max_weight_limit_mt, applicable_unit, is_active, is_default, description)
              VALUES ('Raw Jute Bales Standard Policy (5% or 1500 KG)', 5.00, 1500.00, 1.500, 'BALES', true, true, 'Lower of 5% of Sauda contract quantity or 1,500 KG (15.00 Qtl / 1.500 MT).')
              ON CONFLICT DO NOTHING;

              CREATE TABLE IF NOT EXISTS lorry_weighments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                lorry_no TEXT NOT NULL,
                gross_wt NUMERIC DEFAULT 0,
                tare_wt NUMERIC DEFAULT 0,
                net_wt NUMERIC DEFAULT 0,
                weighment_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS lorry_weighments DISABLE ROW LEVEL SECURITY;
            `
          });
        } catch (err) {
          console.warn("Table creation warn on unit_master/deduction/lorry_weighments:", err);
        }

        try {
          await supabase.rpc("exec_sql", {
            query: `
              CREATE TABLE IF NOT EXISTS satta_base_rates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                start_date DATE NOT NULL,
                base_rate NUMERIC NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS satta_base_rates DISABLE ROW LEVEL SECURITY;

              CREATE TABLE IF NOT EXISTS satta_differentials (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                area TEXT NOT NULL,
                grade TEXT NOT NULL,
                differential NUMERIC NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS satta_differentials DISABLE ROW LEVEL SECURITY;

              CREATE TABLE IF NOT EXISTS satta_calculated_rates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                start_date DATE NOT NULL,
                area TEXT NOT NULL,
                grade TEXT NOT NULL,
                differential NUMERIC NOT NULL,
                calculated_rate NUMERIC NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              ALTER TABLE IF EXISTS satta_calculated_rates DISABLE ROW LEVEL SECURITY;
            `
          });
        } catch (err) {
          console.warn("Table creation warn on satta tables:", err);
        }
      }

      let dbTableNames: string[] = [];
      try {
        const { data: allTables, error: rpcErr } = await supabase.rpc("get_all_tables");
        if (!rpcErr && Array.isArray(allTables) && allTables.length > 0) {
          dbTableNames = allTables;
        }
      } catch (e) {}

      if (dbTableNames.length === 0) {
        try {
          const { data: sqlTables } = await supabase.rpc("exec_sql_return", {
            query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
          });
          if (Array.isArray(sqlTables) && sqlTables.length > 0) {
            dbTableNames = sqlTables.map((r: any) => r.table_name || r.tablename).filter(Boolean);
          }
        } catch (e) {}
      }

      if (dbTableNames.length > 0) {
        // Filter out system or backup tables
        const validDbTables = dbTableNames.filter(t => !t.startsWith('pg_') && !t.startsWith('sql_') && !t.startsWith('temp_'));
        
        const mergedTables: TableDef[] = [];
        
        // Add matching predefined schemas
        TABLES.forEach((known) => {
          if (validDbTables.includes(known.name)) {
            mergedTables.push(known);
          }
        });

        // Add any additional Supabase tables
        validDbTables.forEach((tName) => {
          if (!mergedTables.find((t) => t.name === tName)) {
            mergedTables.push({
              name: tName,
              label: tName.replace(/_/g, " ").toUpperCase(),
              icon: Database,
              pk: tName === "user_master" ? "user_id" : (tName.endsWith("_id") ? tName : "id"),
            });
          }
        });

        // Alphabetical sort by label
        mergedTables.sort((a, b) => a.label.localeCompare(b.label));

        setTables(mergedTables);
        if (!selectedTable || !mergedTables.find(t => t.name === selectedTable.name)) {
          setSelectedTable(mergedTables[0]);
        }
        return;
      }

      setTables(TABLES);
      if (!selectedTable) setSelectedTable(TABLES[0]);
    } catch (err) {
      console.error(err);
      setTables(TABLES);
      if (!selectedTable) setSelectedTable(TABLES[0]);
    }
  };

  const fetchData = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      let remoteRecords: any[] = [];
      let localRecords: any[] = [];

      try {
        localRecords = await dbModule.fetchAll(selectedTable.name);
      } catch (e) {}

      if (supabase) {
        const { data: remoteData, error } = await supabase
          .from(selectedTable.name)
          .select("*")
          .order(selectedTable.pk, { ascending: true })
          .limit(300);

        if (!error && remoteData) {
          remoteRecords = remoteData;
        }
      }

      const pk = selectedTable.pk;
      const combinedMap = new Map<string, any>();

      // Populate with local client database records first
      (localRecords || []).forEach((rec: any) => {
        const key = String(rec[pk] ?? rec.user_id ?? rec.id ?? '').trim();
        if (key) combinedMap.set(key, rec);
      });

      // Merge remote records (remote records take precedence if updated)
      (remoteRecords || []).forEach((rec: any) => {
        const key = String(rec[pk] ?? rec.user_id ?? rec.id ?? '').trim();
        if (key) combinedMap.set(key, rec);
      });

      const merged = Array.from(combinedMap.values());
      merged.sort((a, b) => {
        const aVal = a[pk] ?? '';
        const bVal = b[pk] ?? '';
        if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
          return Number(aVal) - Number(bVal);
        }
        return String(aVal).localeCompare(String(bVal));
      });

      let finalData = merged.length > 0 ? merged : (remoteRecords.length > 0 ? remoteRecords : localRecords);
      if (selectedTable.name === 'tolerance_policy' && finalData.length === 0) {
        finalData = [{
          id: '01',
          status: 'ACTIVE',
          policy_name: 'Raw Jute Bales Standard Policy (5% or 1500 KG)',
          description: 'Lower of 5% of Sauda contract quantity or 1,500 KG (15.00 Qtl / 1.500 MT).',
          tolerance_pct: 5,
          max_limit_kg: 1500,
          max_limit_mt: 1.500,
          unit: 'BALES',
          rule_formula: 'Min(5% of Sauda MT, 1.500 MT)',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];
      }
      setData(finalData);
    } catch (err) {
      console.error(err);
      const fallbackRecords = await dbModule.fetchAll(selectedTable.name).catch(() => []);
      setData(fallbackRecords);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTables();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedTable) {
      fetchData();
    }
  }, [selectedTable]);

  const currentColumns = useMemo(() => {
    if (!data || data.length === 0) {
      if (selectedTable?.name === "user_master") {
        return [
          { name: "user_id", type: "text" },
          { name: "username", type: "text" },
          { name: "password", type: "text" },
          { name: "role", type: "text" },
          { name: "status", type: "text" },
          { name: "allowed_modules", type: "text" },
          { name: "level", type: "text" },
          { name: "last_login", type: "timestamp" },
          { name: "created_at", type: "timestamp" },
        ];
      }
      if (selectedTable?.name === "tolerance_policy") {
        return [
          { name: "id", type: "text" },
          { name: "status", type: "text" },
          { name: "policy_name", type: "text" },
          { name: "description", type: "text" },
          { name: "tolerance_pct", type: "number" },
          { name: "max_limit_kg", type: "number" },
          { name: "max_limit_mt", type: "number" },
          { name: "unit", type: "text" },
          { name: "rule_formula", type: "text" },
          { name: "is_active", type: "text" },
          { name: "created_at", type: "timestamp" },
          { name: "updated_at", type: "timestamp" }
        ];
      }
      if (selectedTable?.name === "user_activity_logs") {
        return [
          { name: "log_id", type: "text" },
          { name: "username", type: "text" },
          { name: "activity_type", type: "text" },
          { name: "module_name", type: "text" },
          { name: "action_details", type: "text" },
          { name: "ip_address", type: "text" },
          { name: "created_at", type: "timestamp" }
        ];
      }
      return [{ name: selectedTable?.pk || "id", type: "text" }];
    }
    const cols = Object.keys(data[0]);
    if (selectedTable?.name === "user_master") {
      const standardOrder = ["user_id", "username", "password", "role", "status", "allowed_modules", "level", "last_login", "created_at"];
      standardOrder.forEach(sc => {
        if (!cols.includes(sc)) cols.push(sc);
      });
    }
    if (selectedTable?.name === "user_activity_logs") {
      const standardOrder = ["log_id", "username", "activity_type", "module_name", "action_details", "ip_address", "created_at"];
      standardOrder.forEach(sc => {
        if (!cols.includes(sc)) cols.push(sc);
      });
    }
    if (selectedTable?.name === "tolerance_policy") {
      const standardOrder = ["id", "status", "policy_name", "description", "tolerance_pct", "max_limit_kg", "max_limit_mt", "unit", "rule_formula", "is_active", "created_at", "updated_at"];
      const reordered: string[] = [];
      standardOrder.forEach(sc => {
        if (cols.includes(sc)) reordered.push(sc);
      });
      cols.forEach(c => {
        if (!reordered.includes(c)) reordered.push(c);
      });
      return reordered.map((key) => ({
        name: key,
        type: typeof data[0][key] === "number" ? "number" : "text",
      }));
    }
    return cols.map((key) => ({
      name: key,
      type: typeof data[0][key] === "number" ? "number" : "text",
    }));
  }, [data, selectedTable]);

  const editorColumns = useMemo(() => {
    return currentColumns.map((col) => col.name);
  }, [currentColumns]);

  const handleSave = async () => {
    if (!selectedTable || !editingRow) return;
    setLoading(true);
    try {
      const pk = selectedTable.pk;
      const isNew = isNewRow;

      if (selectedTable.name === "user_master") {
        if (!editingRow.username || !String(editingRow.username).trim()) {
          alert("Error: Username is required for User Master.");
          setLoading(false);
          return;
        }
        if (!editingRow.password || !String(editingRow.password).trim()) {
          alert("Error: Password is required for User Master.");
          setLoading(false);
          return;
        }

        // Generate unique user_id if missing or duplicate
        if (!editingRow.user_id || String(editingRow.user_id).trim() === "") {
          let maxNum = 1;
          if (data && data.length > 0) {
            const numericIds = data
              .map((r) => {
                const matched = String(r.user_id || "").match(/\d+/);
                return matched ? parseInt(matched[0], 10) : NaN;
              })
              .filter((n) => !isNaN(n));
            if (numericIds.length > 0) {
              maxNum = Math.max(...numericIds) + 1;
            }
          }
          editingRow.user_id = String(maxNum).padStart(3, "0");
        } else if (!isNaN(Number(editingRow.user_id))) {
          editingRow.user_id = String(Number(editingRow.user_id)).padStart(3, "0");
        }

        editingRow.username = String(editingRow.username).trim().toUpperCase();
        editingRow.password = String(editingRow.password).trim();
        editingRow.role = String(editingRow.role || "USER").trim().toUpperCase();
        editingRow.level = String(editingRow.level || "L1").trim().toUpperCase();
        editingRow.status = editingRow.status ? (editingRow.status.charAt(0).toUpperCase() + editingRow.status.slice(1).toLowerCase()) : "Active";
        if (editingRow.allowed_modules === undefined || editingRow.allowed_modules === null || editingRow.allowed_modules === "") {
          editingRow.allowed_modules = "*";
        }
        if (!editingRow.created_at) {
          editingRow.created_at = new Date().toISOString();
        }
      }

      if (selectedTable.name === "user_master") {
        const userPayload: any = {
          user_id: editingRow.user_id,
          username: editingRow.username,
          password: editingRow.password,
          role: editingRow.role,
          status: editingRow.status,
          allowed_modules: editingRow.allowed_modules,
          level: editingRow.level,
          created_at: editingRow.created_at || new Date().toISOString()
        };
        if (editingRow.last_login && String(editingRow.last_login).trim() !== "" && String(editingRow.last_login).trim() !== "null") {
          userPayload.last_login = editingRow.last_login;
        }

        await dbModule.upsert("user_master", userPayload, "user_id");

        broadcastPermissionsUpdated({
          userId: editingRow?.user_id,
          username: editingRow?.username,
          allowed_modules: editingRow?.allowed_modules,
          role: editingRow?.role,
          level: editingRow?.level
        });
      } else {
        const savePayload = { ...editingRow };
        if (savePayload.id === "" || savePayload.id === null) {
          delete savePayload.id;
        }
        delete savePayload.signature_url;
        delete savePayload.digital_signature;

        if (isNew) {
          await dbModule.insert(selectedTable.name, savePayload);
        } else {
          const pkVal = savePayload[pk];
          await dbModule.update(selectedTable.name, pk, pkVal, savePayload);
        }
      }

      setEditingRow(null);
      await fetchData();
      alert("Changes committed to database successfully.");
    } catch (err: any) {
      console.error("Admin Desk Save Error:", err);
      alert(`Save Failed: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pkValue: any) => {
    if (!canDeleteData()) {
      alert("🔒 Access Denied: Only Admin users (L5 / System Administrator) are authorized to delete records.");
      return;
    }
    if (!selectedTable) return;
    if (!confirm(`Are you certain you want to purge record with ${selectedTable.pk}: ${pkValue}?`)) {
      return;
    }
    setLoading(true);
    try {
      if (!supabase) {
        await dbModule.delete(selectedTable.name, selectedTable.pk, pkValue);
      } else {
        const { error } = await supabase
          .from(selectedTable.name)
          .delete()
          .eq(selectedTable.pk, pkValue);
        if (error) throw error;
      }
      if (selectedTable.name === "user_master") {
        broadcastPermissionsUpdated({});
      }
      await fetchData();
      alert("Record successfully deleted from database.");
    } catch (err: any) {
      console.error(err);
      alert(`Purge failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColumn = async (columnName: string) => {
    if (!selectedTable) return;
    if (!confirm(`Are you certain you want to drop column "${columnName}" from ${selectedTable.name}?`)) {
      return;
    }
    if (!supabase) {
      alert("Dynamic schema alteration is only supported on live relational SQL backend.");
      return;
    }
    try {
      const { error } = await supabase.rpc("exec_sql", {
        query: `ALTER TABLE ${selectedTable.name} DROP COLUMN IF EXISTS "${columnName}";`,
      });
      if (error) throw error;
      await fetchData();
      alert(`Column "${columnName}" successfully dropped.`);
    } catch (err: any) {
      alert(`Drop Column failed: ${err.message}`);
    }
  };

  const handleAddField = async () => {
    if (!selectedTable || !newFieldName.trim()) return;
    if (!supabase) {
      alert("Dynamic schema alteration is only supported on live SQL backend.");
      return;
    }
    try {
      const { error } = await supabase.rpc("exec_sql", {
        query: `ALTER TABLE ${selectedTable.name} ADD COLUMN IF NOT EXISTS "${newFieldName.trim()}" ${newFieldType};`,
      });
      if (error) throw error;
      setNewFieldName("");
      await fetchData();
      alert(`Field "${newFieldName}" successfully added.`);
    } catch (err: any) {
      alert(`Add Field failed: ${err.message}`);
    }
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim()) return;
    const cleanName = newTableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!supabase) {
      const newDef: TableDef = {
        name: cleanName,
        label: cleanName.replace(/_/g, " ").toUpperCase(),
        icon: Database,
        pk: "id",
      };
      setTables((prev) => [...prev, newDef]);
      setSelectedTable(newDef);
      setNewTableName("");
      alert(`Local Schema definition created for ${cleanName}.`);
      return;
    }
    try {
      const { error } = await supabase.rpc("exec_sql", {
        query: `
          CREATE TABLE IF NOT EXISTS "${cleanName}" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE IF EXISTS "${cleanName}" DISABLE ROW LEVEL SECURITY;
        `,
      });
      if (error) throw error;
      setNewTableName("");
      await fetchTables();
      const created = tables.find((t) => t.name === cleanName) || {
        name: cleanName,
        label: cleanName.replace(/_/g, " ").toUpperCase(),
        icon: Database,
        pk: "id",
      };
      setSelectedTable(created);
      alert(`Table "${cleanName}" successfully deployed to database.`);
    } catch (err: any) {
      alert(`Create Table Failed: ${err.message}`);
    }
  };

  const handleDropTable = async (tableName: string) => {
    if (!confirm(`CRITICAL WARNING: Are you certain you want to completely DROP & DESTROY table "${tableName}"? This action cannot be reversed.`)) {
      return;
    }
    if (!supabase) {
      setTables((prev) => prev.filter((t) => t.name !== tableName));
      setSelectedTable(tables[0] || null);
      alert(`Local Table ${tableName} removed.`);
      return;
    }
    try {
      const { error } = await supabase.rpc("exec_sql", {
        query: `DROP TABLE IF EXISTS "${tableName}" CASCADE;`,
      });
      if (error) throw error;
      await fetchTables();
      setSelectedTable(tables[0] || null);
      alert(`Table "${tableName}" dropped permanently from database.`);
    } catch (err: any) {
      alert(`Drop Table Failed: ${err.message}`);
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTable) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!results.data || results.data.length === 0) {
          alert("CSV is empty or could not be parsed.");
          return;
        }
        setLoading(true);
        try {
          if (!supabase) {
            for (const row of results.data) {
              await dbModule.insert(selectedTable.name, row);
            }
          } else {
            const { error } = await supabase
              .from(selectedTable.name)
              .insert(results.data);
            if (error) throw error;
          }
          await fetchData();
          alert(`Successfully imported ${results.data.length} records into ${selectedTable.name}.`);
        } catch (err: any) {
          alert(`CSV Import Failed: ${err.message}`);
        } finally {
          setLoading(false);
          e.target.value = "";
        }
      },
    });
  };

  const handleDatabaseExport = async () => {
    setIsExporting(true);
    try {
      const exportData: Record<string, any[]> = {};
      const tablesToExport = tables.length > 0 ? tables : TABLES;

      for (const table of tablesToExport) {
        try {
          if (supabase) {
            const { data, error } = await supabase.from(table.name).select("*").limit(1000);
            if (!error && data) {
              exportData[table.name] = data;
              continue;
            }
          }
          const localData = await dbModule.fetchAll(table.name).catch(() => []);
          exportData[table.name] = localData;
        } catch (e) {
          exportData[table.name] = [];
        }
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mill_ERP_Database_Full_Export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export error:", err);
      alert("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    tables,
    setTables,
    selectedTable,
    setSelectedTable,
    data,
    setData,
    loading,
    setLoading,
    searchTerm,
    setSearchTerm,
    editingRow,
    setEditingRow,
    isNewRow,
    setIsNewRow,
    newFieldName,
    setNewFieldName,
    newFieldType,
    setNewFieldType,
    newTableName,
    setNewTableName,
    isExporting,
    currentColumns,
    editorColumns,
    purchaseOrders,
    fetchTables,
    fetchData,
    handleSave,
    handleDelete,
    handleDeleteColumn,
    handleAddField,
    handleCreateTable,
    handleDropTable,
    handleCsvImport,
    handleDatabaseExport
  };
}
