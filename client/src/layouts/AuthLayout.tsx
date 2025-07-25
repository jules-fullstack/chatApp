import { type ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="mx-60">
      <header>
        <img
          src="/logo.png"
          alt="Website Logo"
          className="size-20 my-4 mb-40 "
        />
      </header>
      <div className="grid grid-cols-2">
        <div>
          <h1 className="text-7xl text-blue-600 font-semibold pr-60 mb-12">
            A place where conversations resonate
          </h1>
          <div className="flex items-start justify-start">
            <div className="relative w-100 h-auto rounded-xl">{children}</div>
          </div>
        </div>
        <img
          src="/preview.png"
          alt="Preview Image of Echo"
          className="shadow-2xl"
        />
      </div>
    </div>
  );
}
