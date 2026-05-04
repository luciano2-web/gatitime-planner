import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { OfflineBadge } from "@/components/OfflineBadge";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <OfflineBadge />
      <Sidebar />
      <main className="flex-1 overflow-y-auto md:pl-0 pl-0">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
