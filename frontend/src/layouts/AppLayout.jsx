import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <a
        href="#konten"
        className="sr-only rounded-lg bg-white px-3 py-2 focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Lewati ke konten
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-56">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main id="konten" className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
