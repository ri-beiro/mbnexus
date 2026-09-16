import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "saved" | "saving" | "unsaved";

/**
 * Debounced autosave for the note editor (section 13: indicador "Salvo" /
 * "Salvando..." / "Alterações não salvas"). Every change to `value` marks
 * the status unsaved immediately and resets the debounce timer; once the
 * timer elapses with no further change, `save` runs and the status follows
 * its outcome — back to unsaved on failure, never falsely "saved".
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, delayMs = 800): { status: AutosaveStatus } {
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStatus("unsaved");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setStatus("saving");
      save(value)
        .then(() => setStatus("saved"))
        .catch(() => setStatus("unsaved"));
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return { status };
}
