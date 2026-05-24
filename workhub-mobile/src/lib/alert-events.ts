const listeners = new Set<() => void>();

export function subscribeToAlertChanges(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyAlertStateChanged() {
  listeners.forEach((listener) => listener());
}
