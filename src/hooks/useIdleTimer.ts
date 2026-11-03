import { useState, useEffect, useRef } from 'react';

export function useIdleTimer(timeoutMs = 15 * 60 * 1000, onIdle: () => void) {
  const [isIdle, setIsIdle] = useState(false);
  const onIdleRef = useRef(onIdle);

  // Keep onIdleRef up-to-date without restarting timer on parent re-renders
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const lastActivityRef = useRef<number>(Date.now());
  const isIdleRef = useRef<boolean>(false);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    isIdleRef.current = false;

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
      }
    };

    const checkIdle = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= timeoutMs) {
        if (!isIdleRef.current) {
          isIdleRef.current = true;
          setIsIdle(true);
          if (onIdleRef.current) {
            onIdleRef.current();
          }
        }
      }
    };

    // User activity listeners
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'wheel',
      'pointerdown',
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    // Check periodically every 2 seconds
    const intervalId = setInterval(checkIdle, 2000);

    // Immediate check on tab focus or visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkIdle();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkIdle);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, recordActivity);
      });
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkIdle);
    };
  }, [timeoutMs]);

  return isIdle;
}

