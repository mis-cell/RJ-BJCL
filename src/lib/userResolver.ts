import { getCurrentUserContext } from './permissions';
import { supabase } from './supabase';
import { dbModule } from '../services/dbModule';

// Internal cache for user_id / username / lowercase identifier -> Display Username
const userDisplayMap: Record<string, string> = {
  '001': 'ADMIN',
  '1': 'ADMIN',
  'admin': 'ADMIN',
  '002': 'RAHUL',
  '02': 'RAHUL',
  '2': 'RAHUL',
  'rahul': 'RAHUL',
  '006': 'Ashish Kankaria',
  '6': 'Ashish Kankaria',
  '010': 'SHYAMLAHOTI',
  '10': 'SHYAMLAHOTI',
  'shyamlahoti': 'SHYAMLAHOTI',
  'checker': 'SHYAMLAHOTI',
  '011': 'ACCOUNT',
  '11': 'ACCOUNT',
  '012': 'MBAJAJ',
  '12': 'MBAJAJ',
  '013': 'SIMUL',
  '13': 'SIMUL',
  '014': 'ANKANA',
  '14': 'ANKANA',
};

const userIdByUsernameMap: Record<string, string> = {
  'admin': '001',
  '001': '001',
  '1': '001',
  'rahul': '002',
  '002': '002',
  '02': '002',
  '2': '002',
  'ashish kankaria': '006',
  '006': '006',
  '6': '006',
  'shyamlahoti': '010',
  'shyam lahoti': '010',
  'checker': '010',
  '010': '010',
  '10': '010',
  'account': '011',
  '011': '011',
  '11': '011',
  'mbajaj': '012',
  '012': '012',
  '12': '012',
  'simul': '013',
  '013': '013',
  '13': '013',
  'ankana': '014',
  '014': '014',
  '14': '014',
};

let isLoaded = false;

/**
 * Loads user records from user_master (Supabase or local dbModule)
 * and builds a resolution map from user_id -> username.
 */
export async function initUserMap(): Promise<Record<string, string>> {
  if (isLoaded) return userDisplayMap;
  try {
    let users: any[] = [];
    if (supabase) {
      const { data } = await supabase.from('user_master').select('*');
      if (data && data.length > 0) users = data;
    }
    if (users.length === 0) {
      users = await dbModule.fetchAll('user_master').catch(() => []);
    }

    if (Array.isArray(users)) {
      users.forEach(u => {
        const uid = String(u.user_id || u.id || '').trim();
        const uname = String(u.username || u.name || u.user_name || '').trim();
        if (uid && uname) {
          const pad3 = /^\d+$/.test(uid) ? uid.padStart(3, '0') : uid;
          userDisplayMap[uid] = uname;
          userDisplayMap[uid.toLowerCase()] = uname;
          userDisplayMap[uname.toLowerCase()] = uname;
          const numOnly = uid.replace(/^0+/, '');
          if (numOnly) {
            userDisplayMap[numOnly] = uname;
            userIdByUsernameMap[numOnly] = pad3;
          }
          userDisplayMap[pad3] = uname;
          userIdByUsernameMap[uid.toLowerCase()] = pad3;
          userIdByUsernameMap[pad3.toLowerCase()] = pad3;
          userIdByUsernameMap[uname.toLowerCase()] = pad3;
        }
      });
      if (userDisplayMap['010']) {
        userDisplayMap['checker'] = userDisplayMap['010'];
        userDisplayMap['user 10'] = userDisplayMap['010'];
        userDisplayMap['user 010'] = userDisplayMap['010'];
      }
    }
    isLoaded = true;
  } catch (err) {
    console.warn("Could not load user map from user_master:", err);
  }
  return userDisplayMap;
}

/**
 * Resolves any user ID or username identifier into a clean, displayable username.
 * Never outputs hardcoded "User 2" or generic placeholders unless fallback is requested.
 */
export function resolveDisplayName(identifier?: string | null, fallback = 'Unknown User'): string {
  if (!identifier) {
    const ctx = getCurrentUserContext();
    const active = ctx.userName || ctx.username || ctx.userId;
    if (active && active.toLowerCase() !== 'user 2' && active.toLowerCase() !== 'user' && active.toLowerCase() !== 'operator' && active.toLowerCase() !== 'default_operator') {
      return resolveDisplayName(active, fallback);
    }
    return fallback;
  }

  let clean = String(identifier).trim();
  if (!clean) return fallback;

  // Strip embedded "(ID: XXX)" if present
  const idMatch = clean.match(/^(.+?)\s*\(\s*ID:\s*([^)]+)\)$/i);
  if (idMatch) {
    clean = idMatch[1].trim();
  }

  // Handle historic "User 2" or "User 002" references
  if (clean.toLowerCase() === 'user 2' || clean.toLowerCase() === 'user 002' || clean.toLowerCase() === 'user2') {
    return userDisplayMap['002'] || 'RAHUL';
  }

  if (clean.toLowerCase() === 'user 10' || clean.toLowerCase() === 'user 010' || clean.toLowerCase() === 'user10' || clean.toLowerCase() === 'checker') {
    return userDisplayMap['010'] || 'SHYAMLAHOTI';
  }

  // Check exact map match
  if (userDisplayMap[clean]) return userDisplayMap[clean];

  // Lowercase lookup
  const lower = clean.toLowerCase();
  if (userDisplayMap[lower]) return userDisplayMap[lower];

  // Numeric ID lookups without leading zeros
  const numClean = clean.replace(/^0+/, '');
  if (numClean && userDisplayMap[numClean]) return userDisplayMap[numClean];

  // If it's a valid custom username, return it
  if (lower !== 'user' && lower !== 'null' && lower !== 'undefined' && lower !== 'default_operator' && lower !== 'operator') {
    return clean;
  }

  return fallback;
}

/**
 * Resolves both Username and User ID for any stored user identifier, without defaulting to "Admin".
 */
export function resolveUserIdentity(
  rawIdentifier?: string | null,
  rawUserId?: string | null
): { username: string; userId: string; displayLabel: string } {
  let cleanIdent = String(rawIdentifier || '').trim();
  let cleanId = String(rawUserId || '').trim();

  // Extract from "USERNAME (ID: 002)" or "USERNAME [002]" if formatted
  const embeddedMatch = cleanIdent.match(/^(.+?)\s*(?:\(\s*(?:ID:\s*)?([^)]+)\)|\[\s*(?:ID:\s*)?([^\]]+)\])$/i);
  if (embeddedMatch) {
    cleanIdent = embeddedMatch[1].trim();
    if (!cleanId) {
      cleanId = String(embeddedMatch[2] || embeddedMatch[3] || '').trim();
    }
  }

  if (cleanId === 'op_1' || cleanId === 'default_operator') {
    cleanId = '';
  }
  if (cleanIdent === 'op_1' || cleanIdent === 'default_operator' || cleanIdent === 'Operator') {
    cleanIdent = '';
  }

  if (!cleanIdent && !cleanId) {
    return { username: '', userId: '', displayLabel: '' };
  }

  const resolvedUsername = resolveDisplayName(cleanIdent || cleanId, '');
  const lowerName = (resolvedUsername || cleanIdent).toLowerCase();
  const lowerId = cleanId.toLowerCase();

  let resolvedId =
    (lowerId && userIdByUsernameMap[lowerId]) ||
    (lowerName && userIdByUsernameMap[lowerName]) ||
    (cleanIdent && userIdByUsernameMap[cleanIdent.toLowerCase()]) ||
    cleanId ||
    '';

  if (resolvedId && /^\d+$/.test(resolvedId)) {
    resolvedId = resolvedId.padStart(3, '0');
  }

  if (!resolvedId && /^\d+$/.test(cleanIdent)) {
    resolvedId = cleanIdent.padStart(3, '0');
  }

  const finalUsername = resolvedUsername || cleanIdent || resolvedId;
  if (!finalUsername) {
    return { username: '', userId: '', displayLabel: '' };
  }

  const displayLabel = resolvedId
    ? `${finalUsername} (ID: ${resolvedId})`
    : finalUsername;

  return {
    username: finalUsername,
    userId: resolvedId,
    displayLabel,
  };
}

/**
 * Returns the authenticated user's ID, username, and formatted display label with guaranteed resolution.
 * Never defaults to ADMIN unless the active authenticated user is actually Admin (001).
 */
export function getAuthenticatedUser(): { userId: string; username: string; displayLabel: string } {
  const userCtx = getCurrentUserContext();
  let rawUserId = String(userCtx.userId || '').trim();
  let rawUsername = String(userCtx.userName || userCtx.username || '').trim();

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedSess = window.localStorage.getItem('bally_auth_session');
      if (savedSess) {
        const parsed = JSON.parse(savedSess);
        if (parsed && typeof parsed === 'object') {
          if (parsed.userId || parsed.user_id) {
            rawUserId = String(parsed.userId || parsed.user_id).trim();
          }
          if (parsed.username || parsed.userName) {
            rawUsername = String(parsed.username || parsed.userName).trim();
          }
        }
      }
    }
  } catch {}

  if (rawUserId === 'op_1' || rawUserId === 'default_operator') {
    rawUserId = '';
  }
  if (rawUsername === 'Operator' || rawUsername === 'default_operator') {
    rawUsername = '';
  }

  const identity = resolveUserIdentity(rawUsername, rawUserId);
  if (identity.username) {
    const finalUserId = identity.userId || rawUserId || (identity.username.toUpperCase() === 'ADMIN' ? '001' : '');
    const finalDisplay = finalUserId ? `${identity.username} (ID: ${finalUserId})` : identity.username;
    return {
      userId: finalUserId,
      username: identity.username,
      displayLabel: finalDisplay,
    };
  }

  // Fallback only if truly Admin role
  if (userCtx.userRole === 'ADMIN' || userCtx.userLevel === 'ADMIN') {
    return {
      userId: '001',
      username: 'ADMIN',
      displayLabel: 'ADMIN (ID: 001)',
    };
  }

  const fallbackName = rawUsername || rawUserId || 'Unknown User';
  return {
    userId: rawUserId,
    username: fallbackName,
    displayLabel: rawUserId ? `${fallbackName} (ID: ${rawUserId})` : fallbackName,
  };
}
