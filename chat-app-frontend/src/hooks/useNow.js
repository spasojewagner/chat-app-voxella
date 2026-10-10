import { useEffect, useState } from "react";

/** Re-renders every `interval` ms so relative times ("5 min ago") stay current. */
export function useNow(interval = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}
