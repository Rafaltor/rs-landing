type MiiStudioHandlers = {
  open: () => void;
  close: () => void;
};

const handlers: { open: (() => void) | null; close: (() => void) | null } = {
  open: null,
  close: null,
};

export function registerMiiStudioHandlers(next: MiiStudioHandlers): () => void {
  handlers.open = next.open;
  handlers.close = next.close;
  return () => {
    if (handlers.open === next.open) handlers.open = null;
    if (handlers.close === next.close) handlers.close = null;
  };
}

export function openMiiStudio(): void {
  handlers.open?.();
}

export function closeMiiStudio(): void {
  handlers.close?.();
}
