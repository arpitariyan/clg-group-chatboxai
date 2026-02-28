'use client';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-20" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}