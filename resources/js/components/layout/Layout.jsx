import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardSection from '../dashboard/DashboardSection';

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { pathname } = useLocation();
    const isDashboard = pathname === '/';
    const isDevisForm = /^\/clients\/devis\/(nouveau|\d+)/.test(pathname);

    return (
        <div className="min-h-screen h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
            <Sidebar />
            {mobileOpen && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
                    <Sidebar mobile onClose={() => setMobileOpen(false)} />
                </>
            )}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <Header onMenuClick={() => setMobileOpen(true)} />

                {isDashboard && (
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
                        <DashboardSection />
                    </div>
                )}

                {isDashboard ? (
                    <main className="hidden" aria-hidden="true">
                        <Outlet />
                    </main>
                ) : (
                    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
                        <Outlet />
                    </main>
                )}

                {!isDevisForm && (
                    <footer className="mt-auto shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                        © {new Date().getFullYear()} STE SOCIMPRO — Gestion commerciale | v1.0.0
                    </footer>
                )}
            </div>
        </div>
    );
}
