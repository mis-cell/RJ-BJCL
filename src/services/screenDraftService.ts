/**
 * Screen Draft & Navigation State Preservation Service
 * Preserves unfinished forms, selected filters, and search state
 * across page navigation so users do not lose their work.
 */

const memoryDraftStore = new Map<string, any>();

export const screenDraftService = {
  /**
   * Save a draft for a specific screen/form
   */
  saveDraft<T = any>(key: string, data: T): void {
    if (!key) return;
    try {
      memoryDraftStore.set(key, data);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`bjl_draft_${key}`, JSON.stringify(data));
      }
    } catch (_e) {
      // Memory store remains intact if sessionStorage exceeds quota
    }
  },

  /**
   * Retrieve an existing draft for a specific screen/form
   */
  getDraft<T = any>(key: string, fallback: T): T {
    if (!key) return fallback;
    if (memoryDraftStore.has(key)) {
      return memoryDraftStore.get(key) as T;
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(`bjl_draft_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          memoryDraftStore.set(key, parsed);
          return parsed as T;
        }
      }
    } catch (_e) {}
    return fallback;
  },

  /**
   * Clear draft when form is saved or cancelled
   */
  clearDraft(key: string): void {
    if (!key) return;
    memoryDraftStore.delete(key);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(`bjl_draft_${key}`);
      }
    } catch (_e) {}
  },

  /**
   * Save active filter state for a register/report view
   */
  saveFilters<T = any>(screenKey: string, filters: T): void {
    this.saveDraft(`filters_${screenKey}`, filters);
  },

  /**
   * Get active filter state for a register/report view
   */
  getFilters<T = any>(screenKey: string, fallback: T): T {
    return this.getDraft(`filters_${screenKey}`, fallback);
  }
};

export const saveScreenDraft = screenDraftService.saveDraft.bind(screenDraftService);
export const getScreenDraft = (key: string, fallback: any = null) => screenDraftService.getDraft(key, fallback);
export const hasScreenDraft = (key: string): boolean => {
  if (memoryDraftStore.has(key)) return true;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return Boolean(sessionStorage.getItem(`bjl_draft_${key}`));
  }
  return false;
};
export const clearScreenDraft = screenDraftService.clearDraft.bind(screenDraftService);
