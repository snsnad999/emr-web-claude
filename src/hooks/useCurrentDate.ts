import { useEffect, useState } from 'react';
import { format } from 'date-fns';

function localToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Returns today's date as local YYYY-MM-DD.
 * Re-renders automatically when the local day rolls over (midnight).
 */
export function useCurrentDate(): string {
  const [date, setDate] = useState<string>(localToday);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
      );
      const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());
      timer = setTimeout(() => {
        setDate(localToday());
        schedule();
      }, delay);
    };

    schedule();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const next = localToday();
        setDate((prev) => (prev === next ? prev : next));
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return date;
}
