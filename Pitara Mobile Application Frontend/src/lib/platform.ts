export const isNative = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      // Capacitor sets a global "Capacitor" object
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore – Capacitor may not be available at build time
      window.Capacitor?.getPlatform &&
      window.Capacitor.getPlatform() !== 'web'
    );
  } catch {
    return false;
  }
}; 