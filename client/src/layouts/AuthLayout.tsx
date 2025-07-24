import { type ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="relative bg-sky-400 w-100 h-auto rounded-xl p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
