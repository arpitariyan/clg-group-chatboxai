'use client';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-[#0f0f11] text-[#f2f2f4] antialiased selection:bg-white selection:text-black">
      {children}
    </div>
  );
}
