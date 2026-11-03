export interface UserContext {
  userId?: string;
  userName?: string;
  username?: string;
  userRole?: string;
  userLevel?: string;
  allowedModules?: string[];
  permissions?: string[];
  [key: string]: any;
}

export interface SystemModuleDef {
  id: string;
  label: string;
  category: string;
  pageId: string;
  aliases: string[];
  description?: string;
}

// Master Directory of every independent Module ID in the application
export const ALL_SYSTEM_MODULES: SystemModuleDef[] = [
  // 1. Overview
  {
    id: 'dashboard',
    label: 'Dashboard (Operational Hub)',
    category: 'Overview',
    pageId: 'dashboard',
    aliases: ['dashboard', 'operational_hub', 'hub', 'home', 'operational hub', 'operationalhub']
  },

  // 2. Gate Operations
  {
    id: 'main_gate',
    label: 'Main Gate',
    category: 'Gate Operations',
    pageId: 'main_gate',
    aliases: ['main_gate', 'maingate', 'main gate', 'gate_module', 'gate module', 'lorry_entry', 'lorry entry', 'dispatch']
  },

  // 3. Sauda & Procurement
  {
    id: 'sms_sauda',
    label: 'SMS Sauda Desk',
    category: 'Sauda & Procurement',
    pageId: 'sms_sauda',
    aliases: ['sms_sauda', 'sms', 'sms_desk', 'sms desk', 'sms_interfaces', 'sms sauda', 'smssauda', 'sms sauda desk', 'smssaudadesk', 'sms_contracts', 'sms_contract']
  },
  {
    id: 'sauda',
    label: 'Sauda Desk',
    category: 'Sauda & Procurement',
    pageId: 'sauda',
    aliases: [
      'sauda', 'sauda_desk', 'sauda desk', 'saudadesk', 'sauda_entry', 'sauda entry', 'saudaentry',
      'sauda_master', 'sauda master', 'saudamaster', 'sauda_bookings', 'sauda bookings',
      'saudabookings', 'sauda_module', 'sauda module', 'sauda_contracts', 'sauda contracts',
      'saudacontracts', 'sauda_book', 'saudabook', 'sauda_deal', 'saudadeal'
    ]
  },
  {
    id: 'satta',
    label: 'Satta Desk',
    category: 'Sauda & Procurement',
    pageId: 'satta',
    aliases: ['satta', 'satta_desk', 'satta desk', 'sattadesk', 'satta_entry', 'satta entry', 'sattaentry', 'satta_master', 'satta_chart', 'satta chart', 'sattachart', 'rate_chart', 'rate chart', 'ratechart', 'satta_rates', 'satta rates', 'sattarates', 'satta_rate_chart']
  },
  {
    id: 'po',
    label: 'Sauda Check Point',
    category: 'Sauda & Procurement',
    pageId: 'po',
    aliases: ['po', 'sauda_check', 'sauda check', 'saudacheck', 'sauda_check_point', 'sauda check point', 'saudacheckpoint', 'sauda_po_check', 'purchase_order', 'purchase order', 'temp_po', 'po_temp', 'temp po']
  },
  {
    id: 'final_po',
    label: 'Final P.O',
    category: 'Sauda & Procurement',
    pageId: 'final_po',
    aliases: ['final_po', 'final po', 'finalpo', 'final_purchase_order', 'final purchase order', 'po_final', 'po final', 'pofinal']
  },

  // 4. Arrival & Inspection
  {
    id: 'amad',
    label: 'Temporary Arrival',
    category: 'Arrival & Inspection',
    pageId: 'amad',
    aliases: ['amad', 'amad_entry', 'amad entry', 'tmr', 'temporary_arrival', 'temporary arrival', 'temporary_mr', 'temporary mr', 'temp arrival']
  },
  {
    id: 'final_arrival',
    label: 'Final Arrival',
    category: 'Arrival & Inspection',
    pageId: 'final_arrival',
    aliases: ['final_arrival', 'final arrival', 'finalarrival', 'final_mr', 'final mr', 'finalmr', 'final_arrival_entry']
  },
  {
    id: 'inspection',
    label: 'Mill Inspection',
    category: 'Arrival & Inspection',
    pageId: 'inspection',
    aliases: ['inspection', 'mill_inspection', 'mill inspection', 'millinspection', 'mill_inspection_master', 'final_mr_inspection']
  },
  {
    id: 'material_inspection',
    label: 'Inspection Checklist',
    category: 'Arrival & Inspection',
    pageId: 'material_inspection',
    aliases: ['material_inspection', 'material inspection', 'materialinspection', 'inspection_checklist', 'inspection checklist', 'quality_inspection', 'quality inspection']
  },
  {
    id: 'mismatch',
    label: 'Satta Mismatch Case',
    category: 'Arrival & Inspection',
    pageId: 'mismatch',
    aliases: ['mismatch', 'satta_mismatch', 'satta mismatch', 'mismatch_case', 'mismatch case']
  },
  {
    id: 'material_mismatch',
    label: 'Material Mismatch Case',
    category: 'Arrival & Inspection',
    pageId: 'material_mismatch',
    aliases: ['material_mismatch', 'material mismatch', 'materialmismatch', 'mat_mismatch']
  },

  // 5. Club & Financial
  {
    id: 'club_po_mr',
    label: 'Club P.O & Arrival',
    category: 'Club & Financial',
    pageId: 'club_po_mr',
    aliases: ['club_po_mr', 'club po mr', 'club_po', 'club po', 'club_mr', 'club mr', 'club']
  },
  {
    id: 'return_lorry',
    label: 'Return Lorry',
    category: 'Club & Financial',
    pageId: 'return_lorry',
    aliases: ['return_lorry', 'return lorry', 'returnlorry']
  },
  {
    id: 'payment',
    label: 'Payment Module',
    category: 'Club & Financial',
    pageId: 'payment',
    aliases: ['payment', 'payment_module', 'payment module', 'payments']
  },
  {
    id: 'mr_settlement',
    label: 'Settlement',
    category: 'Club & Financial',
    pageId: 'mr_settlement',
    aliases: ['mr_settlement', 'mr settlement', 'settlement', 'mr_claim', 'claim_settlement']
  },

  // 6. Inventory & Issue
  {
    id: 'issue',
    label: 'Material Issue',
    category: 'Inventory & Issue',
    pageId: 'issue',
    aliases: ['issue', 'material_issue', 'material issue', 'material_issue_entry']
  },
  {
    id: 'closing_stock',
    label: 'Stock Inventory',
    category: 'Inventory & Issue',
    pageId: 'closing_stock',
    aliases: ['closing_stock', 'closing stock', 'stock_inventory', 'stock inventory', 'stock', 'inventory']
  },
  {
    id: 'requisition_desk',
    label: 'Requisition Desk',
    category: 'Inventory & Issue',
    pageId: 'requisition_desk',
    aliases: ['requisition_desk', 'requisition desk', 'requisition', 'req_desk']
  },
  {
    id: 'bardana',
    label: 'Godown Master',
    category: 'Inventory & Issue',
    pageId: 'bardana',
    aliases: ['bardana', 'godown_master', 'godown master', 'godown']
  },
  {
    id: 'weight_bridge',
    label: 'Weight Bridge',
    category: 'Inventory & Issue',
    pageId: 'weight_bridge',
    aliases: ['weight_bridge', 'weight bridge', 'weigh_bridge', 'weighbridge', 'wb_view_dashboard', 'wb_stage1_create', 'wb_stage2_create', 'wb_stage3_create', 'wb_view_final']
  },

  // 7. Reports & Administration
  {
    id: 'reports',
    label: 'Report',
    category: 'Reports & Administration',
    pageId: 'reports',
    aliases: ['report', 'reports', 'system_reports', 'system reports', 'analytical_reports']
  },
  {
    id: 'vyapari',
    label: 'Trade (Traders Directory)',
    category: 'Reports & Administration',
    pageId: 'treds',
    aliases: [
      'trade', 'trades', 'treds', 'trede', 'tred', 'treds_report', 'trade_report', 'vyapari', 'trader', 'traders',
      'traders_directory', 'traders directory', 'trader_directory', 'trader directory',
      'trade_directory', 'trade directory', 'trade (traders directory)', 'trade / traders directory',
      'traders_master', 'trader_master', 'trade_master'
    ]
  },
  {
    id: 'admindesk',
    label: 'Admin Desk',
    category: 'Reports & Administration',
    pageId: 'admindesk',
    aliases: ['admindesk', 'admin_desk', 'admin desk', 'admin_vault', 'admin']
  },
  {
    id: 'system_change_logs',
    label: 'System Change Log',
    category: 'Reports & Administration',
    pageId: 'system_change_logs',
    aliases: ['system_change_logs', 'system_change_log', 'change_log', 'system change log', 'change logs']
  },
  {
    id: 'settings',
    label: 'Config Center / Settings',
    category: 'Reports & Administration',
    pageId: 'settings',
    aliases: ['settings', 'config_center', 'config center', 'config_guide']
  },
  {
    id: 'ai_assistant',
    label: 'Jarves AI 2.0',
    category: 'Reports & Administration',
    pageId: 'ai_assistant',
    aliases: ['ai_assistant', 'ai assistant', 'jarves_ai', 'jarves ai', 'ai_portal', 'jarves']
  },
];

// Canonical Alias Direct Mapping Table (Strict Normalization Engine)
const EXACT_CANONICAL_MAP: Record<string, string> = {
  // Sauda aliases -> strictly 'sauda'
  'sauda': 'sauda',
  'sauda_desk': 'sauda',
  'sauda desk': 'sauda',
  'saudadesk': 'sauda',
  'sauda_entry': 'sauda',
  'sauda entry': 'sauda',
  'saudaentry': 'sauda',
  'sauda_master': 'sauda',
  'sauda master': 'sauda',
  'saudamaster': 'sauda',
  'sauda_bookings': 'sauda',
  'sauda bookings': 'sauda',
  'saudabookings': 'sauda',
  'sauda_contracts': 'sauda',
  'sauda contracts': 'sauda',
  'saudacontracts': 'sauda',
  'sauda_module': 'sauda',
  'sauda module': 'sauda',
  'saudamodule': 'sauda',
  'sauda_book': 'sauda',
  'saudabook': 'sauda',
  'sauda_deal': 'sauda',
  'saudadeal': 'sauda',

  // SMS Sauda aliases -> strictly 'sms_sauda'
  'sms_sauda': 'sms_sauda',
  'sms sauda': 'sms_sauda',
  'smssauda': 'sms_sauda',
  'sms_sauda_desk': 'sms_sauda',
  'sms sauda desk': 'sms_sauda',
  'smssaudadesk': 'sms_sauda',
  'sms_desk': 'sms_sauda',
  'sms desk': 'sms_sauda',
  'smsdesk': 'sms_sauda',
  'sms_interfaces': 'sms_sauda',
  'sms_contracts': 'sms_sauda',
  'sms_contract': 'sms_sauda',
  'sms': 'sms_sauda',

  // Satta aliases -> strictly 'satta'
  'satta': 'satta',
  'satta_desk': 'satta',
  'satta desk': 'satta',
  'sattadesk': 'satta',
  'satta_entry': 'satta',
  'satta entry': 'satta',
  'sattaentry': 'satta',
  'satta_master': 'satta',
  'satta master': 'satta',
  'sattamaster': 'satta',
  'satta_chart': 'satta',
  'satta chart': 'satta',
  'sattachart': 'satta',
  'satta_rate_chart': 'satta',
  'satta rate chart': 'satta',
  'sattaratechart': 'satta',
  'rate_chart': 'satta',
  'rate chart': 'satta',
  'ratechart': 'satta',
  'satta_rates': 'satta',
  'satta rates': 'satta',
  'sattarates': 'satta',

  // Sauda Check Point (PO) -> strictly 'po'
  'po': 'po',
  'sauda_check': 'po',
  'sauda check': 'po',
  'saudacheck': 'po',
  'sauda_check_point': 'po',
  'sauda check point': 'po',
  'saudacheckpoint': 'po',
  'sauda_po_check': 'po',
  'purchase_order': 'po',
  'purchase order': 'po',
  'purchaseorder': 'po',
  'temp_po': 'po',
  'po_temp': 'po',
  'temp po': 'po',

  // Final PO -> strictly 'final_po'
  'final_po': 'final_po',
  'final po': 'final_po',
  'finalpo': 'final_po',
  'final_purchase_order': 'final_po',
  'final purchase order': 'final_po',
  'po_final': 'final_po',
  'po final': 'final_po',
  'pofinal': 'final_po',

  // Gate Operations
  'main_gate': 'main_gate',
  'main gate': 'main_gate',
  'maingate': 'main_gate',
  'lorry_entry': 'main_gate',
  'lorry entry': 'main_gate',
  'lorryentry': 'main_gate',
  'gate_module': 'main_gate',
  'gate module': 'main_gate',
  'dispatch': 'main_gate',

  // Temporary Arrival (Amad)
  'amad': 'amad',
  'amad_entry': 'amad',
  'amad entry': 'amad',
  'amadentry': 'amad',
  'temporary_arrival': 'amad',
  'temporary arrival': 'amad',
  'temporaryarrival': 'amad',
  'temporary_mr': 'amad',
  'temporary mr': 'amad',
  'temporarymr': 'amad',
  'tmr': 'amad',

  // Final Arrival
  'final_arrival': 'final_arrival',
  'final arrival': 'final_arrival',
  'finalarrival': 'final_arrival',
  'final_mr': 'final_arrival',
  'final mr': 'final_arrival',
  'finalmr': 'final_arrival',
  'final_arrival_entry': 'final_arrival',

  // Mill Inspection
  'inspection': 'inspection',
  'mill_inspection': 'inspection',
  'mill inspection': 'inspection',
  'millinspection': 'inspection',
  'mill_inspection_master': 'inspection',
  'final_mr_inspection': 'inspection',

  // Inspection Checklist
  'material_inspection': 'material_inspection',
  'material inspection': 'material_inspection',
  'materialinspection': 'material_inspection',
  'inspection_checklist': 'material_inspection',
  'inspection checklist': 'material_inspection',
  'quality_inspection': 'material_inspection',
  'quality inspection': 'material_inspection',

  // Mismatch Cases
  'mismatch': 'mismatch',
  'satta_mismatch': 'mismatch',
  'satta mismatch': 'mismatch',
  'mismatch_case': 'mismatch',
  'mismatch case': 'mismatch',
  'material_mismatch': 'material_mismatch',
  'material mismatch': 'material_mismatch',
  'materialmismatch': 'material_mismatch',
  'mat_mismatch': 'material_mismatch',

  // Financial & Management
  'dashboard': 'dashboard',
  'operational_hub': 'dashboard',
  'operational hub': 'dashboard',
  'operationalhub': 'dashboard',
  'home': 'dashboard',
  'hub': 'dashboard',
  'club_po_mr': 'club_po_mr',
  'club po mr': 'club_po_mr',
  'club_po': 'club_po_mr',
  'club po': 'club_po_mr',
  'club_mr': 'club_po_mr',
  'club mr': 'club_po_mr',
  'club': 'club_po_mr',
  'payment': 'payment',
  'payment_module': 'payment',
  'payment module': 'payment',
  'payments': 'payment',
  'mr_settlement': 'mr_settlement',
  'mr settlement': 'mr_settlement',
  'settlement': 'mr_settlement',
  'mr_claim': 'mr_settlement',
  'claim_settlement': 'mr_settlement',
  'issue': 'issue',
  'closing_stock': 'closing_stock',
  'closing stock': 'closing_stock',
  'stock': 'closing_stock',
  'inventory': 'closing_stock',
  'requisition_desk': 'requisition_desk',
  'requisition': 'requisition_desk',
  'bardana': 'bardana',
  'weight_bridge': 'weight_bridge',
  'weighbridge': 'weight_bridge',
  'reports': 'reports',
  'treds': 'vyapari',
  'tred': 'vyapari',
  'trede': 'vyapari',
  'treds_report': 'vyapari',
  'treds report': 'vyapari',
  'trede_report': 'vyapari',
  'trede report': 'vyapari',
  'trade': 'vyapari',
  'trades': 'vyapari',
  'trade_report': 'vyapari',
  'trade report': 'vyapari',
  'vyapari': 'vyapari',
  'trader': 'vyapari',
  'traders': 'vyapari',
  'traders_directory': 'vyapari',
  'traders directory': 'vyapari',
  'trader_directory': 'vyapari',
  'trader directory': 'vyapari',
  'trade_directory': 'vyapari',
  'trade directory': 'vyapari',
  'trade (traders directory)': 'vyapari',
  'trade / traders directory': 'vyapari',
  'system_change_logs': 'system_change_logs',
  'system_change_log': 'system_change_logs',
  'system change log': 'system_change_logs',
  'change_logs': 'system_change_logs',
  'change_log': 'system_change_logs',
  'admindesk': 'admindesk',
  'admin': 'admindesk',
  'settings': 'settings',
  'ai_assistant': 'ai_assistant',
};

// Resolves any page name, route alias, label, or legacy ID to its exact primary Module ID
export function getCanonicalModuleId(idOrAlias: string): string {
  if (!idOrAlias) return '';
  const clean = String(idOrAlias).toLowerCase().trim();
  if (clean === '*' || clean === 'all') return '*';

  // 1. Direct fast lookup in exact alias map
  if (EXACT_CANONICAL_MAP[clean]) {
    return EXACT_CANONICAL_MAP[clean];
  }

  // 2. Direct ID / pageId match in master modules
  const directMatch = ALL_SYSTEM_MODULES.find(
    (m) => m.id.toLowerCase() === clean || m.pageId.toLowerCase() === clean
  );
  if (directMatch) return directMatch.id;

  // 3. Direct label match
  const labelMatch = ALL_SYSTEM_MODULES.find(
    (m) => m.label.toLowerCase() === clean
  );
  if (labelMatch) return labelMatch.id;

  // 4. Exact alias match
  const aliasMatch = ALL_SYSTEM_MODULES.find((m) =>
    m.aliases.some((a) => a.toLowerCase() === clean)
  );
  if (aliasMatch) return aliasMatch.id;

  // 5. Normalized alphanumeric match (stripping all spaces, dashes, dots, underscores)
  const alphaClean = clean.replace(/[^a-z0-9]/g, '');
  if (!alphaClean) return clean;

  if (EXACT_CANONICAL_MAP[alphaClean]) {
    return EXACT_CANONICAL_MAP[alphaClean];
  }

  const alphaMatch = ALL_SYSTEM_MODULES.find((m) => {
    if (m.id.replace(/[^a-z0-9]/g, '').toLowerCase() === alphaClean) return true;
    if (m.pageId.replace(/[^a-z0-9]/g, '').toLowerCase() === alphaClean) return true;
    if (m.label.replace(/[^a-z0-9]/g, '').toLowerCase() === alphaClean) return true;
    return m.aliases.some(
      (a) => a.replace(/[^a-z0-9]/g, '').toLowerCase() === alphaClean
    );
  });
  if (alphaMatch) return alphaMatch.id;

  // 6. Semantic keyword mapping for user-entered terms
  if (alphaClean.includes('smssauda') || alphaClean.includes('smsdesk') || (alphaClean.startsWith('sms') && alphaClean.includes('sauda'))) return 'sms_sauda';
  if (alphaClean.includes('saudadesk') || alphaClean.includes('saudabook') || alphaClean.includes('saudacontract') || alphaClean === 'sauda' || alphaClean === 'saudaentry' || (alphaClean.includes('sauda') && !alphaClean.includes('check') && !alphaClean.includes('checkpoint'))) return 'sauda';
  if (alphaClean.includes('sattachart') || alphaClean.includes('sattarate') || alphaClean.includes('satta')) return 'satta';
  if (alphaClean.includes('saudacheck') || alphaClean === 'po' || alphaClean === 'potemp') return 'po';
  if (alphaClean.includes('finalpo') || alphaClean === 'pofinal') return 'final_po';
  if (alphaClean.includes('maingate') || alphaClean.includes('lorryentry')) return 'main_gate';
  if (alphaClean.includes('finalarrival') || alphaClean.includes('finalmr')) return 'final_arrival';
  if (alphaClean.includes('materialinspection') || alphaClean.includes('inspectionchecklist')) return 'material_inspection';
  if (alphaClean.includes('inspection')) return 'inspection';
  if (alphaClean.includes('materialmismatch')) return 'material_mismatch';
  if (alphaClean.includes('mismatch')) return 'mismatch';
  if (alphaClean.includes('clubpo')) return 'club_po_mr';
  if (alphaClean.includes('payment')) return 'payment';
  if (alphaClean.includes('settlement')) return 'mr_settlement';
  if (alphaClean.includes('issue')) return 'issue';
  if (alphaClean.includes('closingstock') || alphaClean.includes('stockinventory') || alphaClean === 'stock' || alphaClean === 'inventory') return 'closing_stock';
  if (alphaClean.includes('requisition')) return 'requisition_desk';
  if (alphaClean.includes('bardana') || alphaClean.includes('godown')) return 'bardana';
  if (alphaClean.includes('weightbridge') || alphaClean.includes('weighbridge')) return 'weight_bridge';
  if (alphaClean.includes('report')) return 'reports';
  if (
    alphaClean.includes('vyapari') ||
    alphaClean.includes('trader') ||
    alphaClean.includes('treds') ||
    alphaClean.includes('trede') ||
    alphaClean === 'trade' ||
    alphaClean === 'trades' ||
    alphaClean === 'treds' ||
    alphaClean === 'trede' ||
    alphaClean.includes('tradedir') ||
    alphaClean.includes('tradereport') ||
    alphaClean.includes('tredsreport')
  ) return 'vyapari';
  if (alphaClean.includes('admindesk') || alphaClean === 'admin') return 'admindesk';
  if (alphaClean.includes('setting') || alphaClean.includes('config')) return 'settings';
  if (alphaClean.includes('jarves') || alphaClean.includes('aiassistant')) return 'ai_assistant';

  return clean;
}

// Normalizes any allowed_modules input (string, comma-separated, array, JSON, or bracketed string) into a pristine canonical ID list
export function normalizeAllowedModules(modules: string[] | string | undefined | null): string[] {
  if (!modules) return [];
  if (modules === '*') return ['*'];

  // Handle JSON string or stringified array (e.g. '["sauda_desk", "sms_sauda"]')
  let parsed: any = modules;
  if (typeof modules === 'string') {
    const trimmed = modules.trim();
    if (trimmed === '*' || trimmed === '"*"' || trimmed === "['*']" || trimmed === '["*"]') return ['*'];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // Remove brackets if JSON.parse fails (e.g. [sauda_desk, sms_sauda])
        parsed = trimmed.slice(1, -1);
      }
    }
  }

  const rawList: string[] = Array.isArray(parsed)
    ? parsed
    : String(parsed).split(',');

  const normalized: string[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const str = String(item).replace(/[\[\]"']/g, '').trim();
    if (!str) continue;
    if (str === '*' || str === 'all') {
      return ['*'];
    }
    // Handle cases where comma-separated values exist inside array elements
    if (str.includes(',')) {
      str.split(',').forEach((sub) => {
        const subClean = sub.replace(/[\[\]"']/g, '').trim();
        const c = getCanonicalModuleId(subClean);
        if (c) normalized.push(c);
      });
    } else {
      const c = getCanonicalModuleId(str);
      if (c) normalized.push(c);
    }
  }

  return Array.from(new Set(normalized));
}

let currentUserContext: UserContext = {
  userId: 'default_operator',
  userName: 'Operator',
  username: 'Operator',
  userRole: 'USER',
  userLevel: 'L1',
  allowedModules: [],
  permissions: ['VIEW'],
};

// Listeners for live permission change notifications
type PermissionListener = (context: UserContext) => void;
const permissionListeners = new Set<PermissionListener>();

export function subscribeToPermissions(listener: PermissionListener): () => void {
  permissionListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
  };
}

let isNotifyingListeners = false;

export function setCurrentUserContext(context: Partial<UserContext> | null | undefined, notify: boolean = true): void {
  if (context) {
    const updatedUser = context.username || context.userName || currentUserContext.username || currentUserContext.userName;
    const normalizedMods = context.allowedModules !== undefined
      ? normalizeAllowedModules(context.allowedModules)
      : currentUserContext.allowedModules;

    currentUserContext = {
      ...currentUserContext,
      ...context,
      userName: updatedUser,
      username: updatedUser,
      allowedModules: normalizedMods,
    };
    
    // Save to localStorage for persistence
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('bally_user_context', JSON.stringify(currentUserContext));
      }
    } catch (e) {
      console.warn("Could not save user context to localStorage:", e);
    }

    // Notify all subscribers (safely without recursive loops)
    if (notify && !isNotifyingListeners) {
      isNotifyingListeners = true;
      try {
        permissionListeners.forEach((fn) => {
          try {
            fn(currentUserContext);
          } catch (err) {
            console.error("Error in permission listener:", err);
          }
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bally-permissions-updated', { detail: currentUserContext }));
        }
      } finally {
        isNotifyingListeners = false;
      }
    }
  }
}

export function getCurrentUserContext(): UserContext {
  if (typeof window !== 'undefined') {
    try {
      const savedCtx = window.localStorage.getItem('bally_user_context');
      const savedSess = window.localStorage.getItem('bally_auth_session');
      let merged: any = { ...currentUserContext };

      if (savedCtx) {
        const parsed = JSON.parse(savedCtx);
        if (parsed && typeof parsed === 'object') {
          merged = { ...merged, ...parsed };
        }
      }

      if (savedSess) {
        const parsed = JSON.parse(savedSess);
        if (parsed && typeof parsed === 'object') {
          const nameVal = parsed.userName || parsed.username || parsed.name || parsed.userId || parsed.user_id;
          if (nameVal) {
            merged.userName = nameVal;
            merged.username = nameVal;
          }
          if (parsed.role || parsed.userRole) merged.userRole = parsed.role || parsed.userRole;
          if (parsed.level || parsed.userLevel) merged.userLevel = parsed.level || parsed.userLevel;
          if (parsed.userId || parsed.user_id) merged.userId = parsed.userId || parsed.user_id;
        }
      }

      if (merged.userName || merged.username) {
        merged.userName = merged.userName || merged.username;
        merged.username = merged.username || merged.userName;
      }

      currentUserContext = {
        ...merged,
        allowedModules: normalizeAllowedModules(merged.allowedModules || merged.allowed_modules || []),
      };
    } catch {
      // Ignore fallback errors
    }
  }
  return currentUserContext;
}

export function isUserAdmin(roleOrContext?: string | UserContext): boolean {
  let role = '';
  let level = '';
  let username = '';
  let allowed: string[] = [];
  let isAdmFlag = false;

  if (typeof roleOrContext === 'string') {
    role = roleOrContext.toUpperCase();
  } else if (roleOrContext && typeof roleOrContext === 'object') {
    role = (roleOrContext.userRole || (roleOrContext as any).role || '').toUpperCase();
    level = (roleOrContext.userLevel || (roleOrContext as any).level || '').toUpperCase();
    username = (roleOrContext.username || roleOrContext.userName || (roleOrContext as any).userId || (roleOrContext as any).user_id || '').toUpperCase();
    allowed = normalizeAllowedModules(roleOrContext.allowedModules || (roleOrContext as any).allowed_modules || []);
    isAdmFlag = Boolean((roleOrContext as any).isAdmin || (roleOrContext as any).is_admin);
  } else {
    const ctx = getCurrentUserContext();
    role = (ctx?.userRole || (ctx as any)?.role || '').toUpperCase();
    level = (ctx?.userLevel || (ctx as any)?.level || '').toUpperCase();
    username = (ctx?.username || ctx?.userName || (ctx as any)?.userId || '').toUpperCase();
    allowed = normalizeAllowedModules(ctx?.allowedModules || []);
    isAdmFlag = Boolean((ctx as any)?.isAdmin || (ctx as any)?.is_admin);
  }

  // Check stored auth session from localStorage if memory context was reset or unhydrated
  if (!isAdmFlag && role !== 'ADMIN' && role !== 'ADMINISTRATOR' && level !== 'ADMIN' && username !== 'ADMIN') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const sessionRaw = window.localStorage.getItem('bally_auth_session');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          const sRole = String(parsed.role || '').toUpperCase();
          const sLevel = String(parsed.level || '').toUpperCase();
          const sUser = String(parsed.username || parsed.userId || '').toUpperCase();
          if (sRole === 'ADMIN' || sRole === 'ADMINISTRATOR' || sLevel === 'ADMIN' || sUser === 'ADMIN' || parsed.allowed_modules === '*') {
            return true;
          }
        }
      }
    } catch {}
  }

  const isRoleAdmin = 
    role === 'ADMIN' || 
    role === 'ADMINISTRATOR' || 
    level === 'ADMIN' || 
    level === 'ADMINISTRATOR' || 
    level === 'MAX' || 
    username === 'ADMIN' || 
    isAdmFlag;

  return isRoleAdmin || allowed.includes('*');
}

export function isL5OrAdmin(): boolean {
  const ctx = getCurrentUserContext();
  const level = (ctx?.userLevel || '').toUpperCase();
  return isUserAdmin() || level === 'L5' || level === 'L4';
}

export function isLevel4OrAbove(roleOrContext?: any): boolean {
  const ctx = (roleOrContext && typeof roleOrContext === 'object') ? roleOrContext : getCurrentUserContext();
  if (isUserAdmin(ctx)) return true;
  const level = String(ctx?.userLevel || (ctx as any)?.level || '').trim().toUpperCase();
  const role = String(ctx?.userRole || (ctx as any)?.role || '').trim().toUpperCase();
  return level === 'L4' || level === 'L5' || level === 'MAX' || role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN';
}

export function isUserId10(roleOrContext?: any): boolean {
  let uid = '';
  let uname = '';
  if (roleOrContext && typeof roleOrContext === 'object') {
    uid = String(roleOrContext.userId || roleOrContext.user_id || '').trim().toLowerCase();
    uname = String(roleOrContext.username || roleOrContext.userName || '').trim().toLowerCase();
  } else if (typeof roleOrContext === 'string') {
    uid = roleOrContext.trim().toLowerCase();
    uname = roleOrContext.trim().toLowerCase();
  } else {
    const ctx = getCurrentUserContext();
    uid = String(ctx?.userId || (ctx as any)?.user_id || '').trim().toLowerCase();
    uname = String(ctx?.username || ctx?.userName || '').trim().toLowerCase();
  }

  let sessionUid = '';
  let sessionUname = '';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawSess = window.localStorage.getItem('bally_auth_session');
      if (rawSess) {
        const parsed = JSON.parse(rawSess);
        sessionUid = String(parsed?.userId || parsed?.user_id || '').trim().toLowerCase();
        sessionUname = String(parsed?.username || parsed?.userName || '').trim().toLowerCase();
      }
    }
  } catch {}

  const targets = ['010', '10', 'user010', 'user 010', 'user10', 'user 10', 'shyamlahoti', 'shyam lahoti'];
  return (
    targets.includes(uid) ||
    targets.includes(uname) ||
    targets.includes(sessionUid) ||
    targets.includes(sessionUname)
  );
}

export function isUserId2(roleOrContext?: any): boolean {
  let uid = '';
  let uname = '';
  if (roleOrContext && typeof roleOrContext === 'object') {
    uid = String(roleOrContext.userId || roleOrContext.user_id || '').trim().toLowerCase();
    uname = String(roleOrContext.username || roleOrContext.userName || '').trim().toLowerCase();
  } else if (typeof roleOrContext === 'string') {
    uid = roleOrContext.trim().toLowerCase();
    uname = roleOrContext.trim().toLowerCase();
  } else {
    const ctx = getCurrentUserContext();
    uid = String(ctx?.userId || (ctx as any)?.user_id || '').trim().toLowerCase();
    uname = String(ctx?.username || ctx?.userName || '').trim().toLowerCase();
  }

  let sessionUid = '';
  let sessionUname = '';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawSess = window.localStorage.getItem('bally_auth_session');
      if (rawSess) {
        const parsed = JSON.parse(rawSess);
        sessionUid = String(parsed?.userId || parsed?.user_id || '').trim().toLowerCase();
        sessionUname = String(parsed?.username || parsed?.userName || '').trim().toLowerCase();
      }
    }
  } catch {}

  const targets = ['02', '2', '002', 'user02', 'user 02', 'user2', 'user 2', 'user 002'];
  return (
    targets.includes(uid) ||
    targets.includes(uname) ||
    targets.includes(sessionUid) ||
    targets.includes(sessionUname)
  );
}

export function canEditOrDelete(recordOrUser?: any): boolean {
  const ctx = (recordOrUser && typeof recordOrUser === 'object' && ('userRole' in recordOrUser || 'role' in recordOrUser || 'userLevel' in recordOrUser || 'userId' in recordOrUser || 'username' in recordOrUser))
    ? recordOrUser
    : getCurrentUserContext();
  if (!ctx) return false;
  if (isUserAdmin(ctx) || isL5OrAdmin() || isUserId2(ctx)) return true;
  const level = String(ctx.userLevel || (ctx as any).level || '').trim().toUpperCase();
  const role = String(ctx.userRole || (ctx as any).role || '').trim().toUpperCase();
  if (level === 'L4' || level === 'L5' || level === 'MAX' || role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN' || role === 'MAKER' || role === 'OPERATOR' || role === 'USER') {
    return true;
  }
  if (Array.isArray(ctx.permissions) && (ctx.permissions.includes('ALL') || ctx.permissions.includes('EDIT') || ctx.permissions.includes('DELETE'))) {
    return true;
  }
  if ((ctx as any).can_edit_delete === true || (ctx as any).canEdit === true) {
    return true;
  }
  return true;
}

export function enforceEditOrDeletePermission(actionName: string = 'this action'): boolean {
  if (!canEditOrDelete()) {
    if (typeof window !== 'undefined' && window.alert) {
      alert(`Access Denied: Your Operator profile does not hold permissions for ${actionName}.`);
    }
    return false;
  }
  return true;
}

export function canViewCompletedData(): boolean {
  return true;
}

/**
 * Checks whether a Sauda contract is marked as approved / checked (e.g. approved by User 010).
 */
export function isSaudaApproved(sauda: any): boolean {
  if (!sauda) return false;
  const status = String(sauda.status || '').toUpperCase();
  const approvalStatus = String(sauda.approval_status || '').toUpperCase();
  return Boolean(
    sauda.is_checked ||
    status === 'APPROVED' ||
    approvalStatus === 'APPROVED' ||
    status === 'CHECKED' ||
    approvalStatus === 'CHECKED' ||
    Boolean(sauda.approved_by) ||
    Boolean(sauda.checked_by)
  );
}

/**
 * Sauda Contract Edit Policy:
 * In Sauda Desk, if a user (e.g. User 002) enters any Sauda and that Sauda is approved by User 010 (Checker),
 * then it CANNOT be edited by any user; ONLY ADMIN can edit it.
 * If the contract is not approved (e.g. pending or rejected), maker / editor can edit & resubmit.
 */
export function canEditSaudaContract(sauda: any, roleOrContext?: any): boolean {
  if (!sauda) return true;
  // Once approved by User 010, permanently locked against editing by ALL users!
  if (isSaudaApproved(sauda)) {
    return false;
  }
  const status = String(sauda.status || sauda.approval_status || '').toUpperCase();
  // While Pending Approval, locked against editing
  if (status === 'PENDING') {
    return false;
  }
  return canEditOrDelete(roleOrContext);
}

/**
 * Sauda Contract Delete Policy:
 * Once approved by User 010, permanently locked against deletion by ALL users!
 */
export function canDeleteSaudaContract(sauda: any, roleOrContext?: any): boolean {
  if (!sauda) return true;
  // Once approved by User 010, permanently locked against deletion by ALL users!
  if (isSaudaApproved(sauda)) {
    return false;
  }
  const status = String(sauda.status || sauda.approval_status || '').toUpperCase();
  if (status === 'PENDING') {
    return false;
  }
  return canEditOrDelete(roleOrContext);
}

/**
 * Strict Independent Module Permission Checker (canAccess)
 * 
 * Rules:
 * 1. Admin or full access ('*') returns TRUE for all modules.
 * 2. Every Module ID is independent. Parent groups do NOT grant permissions.
 * 3. Exact matching: canAccess("sms_sauda") verifies sms_sauda; canAccess("sauda") verifies sauda.
 * 4. Aliases: "sauda_desk", "saudadesk", "Sauda Desk", "sauda" all resolve to "sauda".
 */
export function canAccess(
  targetModuleOrPage: string,
  allowedModulesOverride?: string[],
  isAdminOverride?: boolean
): boolean {
  if (!targetModuleOrPage) return true;

  const ctx = getCurrentUserContext();
  const rawAllowed = allowedModulesOverride !== undefined
    ? allowedModulesOverride
    : (ctx.allowedModules || []);

  const cleanAllowed = normalizeAllowedModules(rawAllowed);

  // If specific modules are passed (e.g. ['dashboard', 'sms_sauda', 'sauda']), enforce them strictly!
  if (cleanAllowed.length > 0) {
    if (cleanAllowed.includes('*')) return true;
    const canonicalTarget = getCanonicalModuleId(targetModuleOrPage);
    return cleanAllowed.includes(canonicalTarget);
  }

  // If no allowed modules were provided, fallback to admin check
  const isAdmin = isAdminOverride !== undefined ? isAdminOverride : isUserAdmin(ctx);
  if (isAdmin) return true;

  return false;
}

// Alias hasModulePermission to canAccess for seamless backwards compatibility
export const hasModulePermission = canAccess;

/**
 * Filter an array of navigation menus by user permissions.
 * 
 * Rules:
 * - Parent menus (e.g. "Sauda To P.O", "Temporary Arrival To Final Arrival", etc.) are navigation containers ONLY.
 * - If a menu has `subItems`, each subItem is checked independently via canAccess.
 * - If a parent menu has NO permitted subItems, the entire parent menu is HIDDEN.
 * - If a parent menu has permitted subItems, ONLY the permitted subItems are shown.
 * - Leaf menus (e.g. Dashboard) are checked via canAccess.
 */
export function filterMenuByPermissions<T extends { id: string; pageId?: string; subItems?: any[] }>(
  menus: T[],
  allowedModulesOverride?: string[],
  isAdminOverride?: boolean
): T[] {
  const result: T[] = [];

  for (const menu of menus) {
    if (menu.subItems && menu.subItems.length > 0) {
      // Filter child subItems strictly
      const permittedSubItems = menu.subItems.filter((sub) => {
        const checkId = sub.pageId || sub.id;
        return canAccess(checkId, allowedModulesOverride, isAdminOverride);
      });

      // A parent menu appears ONLY when at least one child module inside that group is assigned
      if (permittedSubItems.length > 0) {
        result.push({
          ...menu,
          subItems: permittedSubItems,
        });
      }
    } else {
      // Leaf menu (e.g. dashboard)
      const checkId = menu.pageId || menu.id;
      if (canAccess(checkId, allowedModulesOverride, isAdminOverride)) {
        result.push(menu);
      }
    }
  }

  return result;
}

/**
 * Determine the default/first landing page for a user based on their allowed modules.
 */
export function getFirstAllowedPage(
  allowedModulesOverride?: string[],
  isAdminOverride?: boolean
): string {
  const isAdmin = isAdminOverride !== undefined ? isAdminOverride : isUserAdmin();
  if (isAdmin) return 'dashboard';

  const ctx = getCurrentUserContext();
  const allowedList = allowedModulesOverride !== undefined
    ? allowedModulesOverride
    : (ctx.allowedModules || []);

  if (allowedList.includes('*')) return 'dashboard';
  if (canAccess('dashboard', allowedList, false)) return 'dashboard';

  // Find the first registered module that is permitted
  for (const mod of ALL_SYSTEM_MODULES) {
    if (canAccess(mod.id, allowedList, false)) {
      return mod.pageId;
    }
  }

  // If nothing matched, check if any string in allowedList matches a module
  if (allowedList.length > 0) {
    const first = allowedList[0].trim();
    if (first && first !== '*') {
      const canonical = getCanonicalModuleId(first);
      const found = ALL_SYSTEM_MODULES.find(m => m.id === canonical);
      if (found) return found.pageId;
      return first;
    }
  }

  return 'sauda';
}

/**
 * Broadcast permission update event across windows and components
 */
export function broadcastPermissionsUpdated(detail: {
  userId?: string;
  username?: string;
  allowed_modules?: string;
  role?: string;
  level?: string;
}): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bally-permissions-updated', { detail }));
  }
}


