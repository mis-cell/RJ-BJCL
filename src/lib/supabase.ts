/**
 * Bally Jute Database Client (Local PostgreSQL)
 * Replaces Supabase cloud client with 100% local database connectivity.
 * All queries are executed directly on your local PostgreSQL database (bjcl_db).
 */

import { localPostgresClient, LocalPostgresClient } from './localPostgresClient';

// Export local client as default and named export to preserve 100% component compatibility
export const supabase = localPostgresClient;

export const getSupabase = (): LocalPostgresClient => {
  return localPostgresClient;
};

export default supabase;