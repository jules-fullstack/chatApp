import type { ReactNode } from "react";

export default function Button({ children }: { children: ReactNode }) {
  return (
    <button className="bg-white p-2 rounded cursor-pointer">{children}</button>
  );
}
