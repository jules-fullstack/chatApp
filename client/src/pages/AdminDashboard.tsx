import { useState } from "react";
import AdminSidebar, { type AdminTab } from "../components/admin/AdminSidebar";
import AdminWindow from "../components/admin/AdminWindow";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  return (
    <div className="flex bg-gray-100">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <AdminWindow activeTab={activeTab} />
    </div>
  );
}
