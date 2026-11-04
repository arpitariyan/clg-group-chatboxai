'use client';
export function PerformanceProvider({ children }) { return <>{children}</>; }
export function usePerformance() { return { isLowEnd: false, isMobile: false, prefersReducedMotion: false }; }
