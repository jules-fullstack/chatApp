import { type ReactNode } from "react";

export default function Container({
  children,
  size,
}: {
  children: ReactNode;
  size: "sm" | "lg";
}) {
  const sizeTypes = {
    sm: "w-125",
    lg: "w-310",
  };
  return (
    <section
      className={`${sizeTypes[size]} h-[95%] ml-4 bg-white shadow-sm rounded-md flex flex-col relative`}
    >
      {children}
    </section>
  );
}
