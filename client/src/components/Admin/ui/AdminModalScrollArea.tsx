import { ScrollArea } from "@mantine/core";
import type { ReactNode } from "react";
export default function AdminModalScrollArea({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <ScrollArea className="h-64 border rounded-lg p-2">{children}</ScrollArea>
    </div>
  );
}
