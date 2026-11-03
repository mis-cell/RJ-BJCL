import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Shared singleton state to prevent duplicate HTTP requests across multiple mounted components
let globalIsOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
let lastPingTime = 0;
let isPinging = false;
let globalIntervalId: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(online: boolean) => void>();

async function performHeartbeat() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateOnlineState(false);
    return;
  }

  const now = Date.now();
  // Throttle: don't ping more than once every 15 seconds globally
  if (isPinging || (now - lastPingTime < 15000 && lastPingTime > 0)) {
    return;
  }

  isPinging = true;
  lastPingTime = now;

  try {
    const { error } = await supabase
      .from('user_master')
      .select('user_id')
      .limit(1)
      .abortSignal(AbortSignal.timeout(5000));

    if (error && (error.code === 'FetchError' || error.message?.includes('timeout') || error.message?.includes('network'))) {
      updateOnlineState(false);
    } else {
      updateOnlineState(true);
    }
  } catch {
    updateOnlineState(false);
  } finally {
    isPinging = false;
  }
}

function updateOnlineState(online: boolean) {
  if (globalIsOnline !== online) {
    globalIsOnline = online;
    subscribers.forEach(cb => cb(online));
  }
}

function setupGlobalListeners() {
  if (typeof window === 'undefined') return;

  if (!globalIntervalId) {
    // Single shared timer every 30 seconds
    globalIntervalId = setInterval(performHeartbeat, 30000);

    window.addEventListener('online', () => {
      performHeartbeat();
    });

    window.addEventListener('offline', () => {
      updateOnlineState(false);
    });

    // Run first check
    performHeartbeat();
  }
}

export function useHeartbeat(_pingIntervalMs = 30000) {
  const [isOnline, setIsOnline] = useState<boolean>(globalIsOnline);

  useEffect(() => {
    setupGlobalListeners();

    const handler = (status: boolean) => {
      setIsOnline(status);
    };

    subscribers.add(handler);
    setIsOnline(globalIsOnline);

    return () => {
      subscribers.delete(handler);
    };
  }, []);

  return isOnline;
}

