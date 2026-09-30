import { useEffect, useState } from "react";

/** Animates a number from 0 up to `target` over `duration` ms with an
 * ease-out curve — the small bit of "life" that makes a stat tile feel like
 * it's reporting something live rather than just printing a static number. */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }

    const start = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        timeoutId = setTimeout(tick, 16);
      }
    }

    tick();
    return () => clearTimeout(timeoutId);
  }, [target, duration]);

  return value;
}
