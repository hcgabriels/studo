import { useEffect, useState } from "react";

/**
 * Retorna `value` debounced em `delay` ms.
 * Cancela updates intermediários — útil pra search/filtros.
 */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
