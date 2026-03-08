'use client';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-200/30 dark:bg-violet-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-900/15 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}