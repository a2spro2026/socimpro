import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { NavbarBrand } from '../Logo';
import UserAvatar from '../UserAvatar';
import { getPageTitle } from '../../lib/pageMeta';

export default function Header({ onMenuClick }) {
    const { dark, toggle } = useTheme();
    const { user } = useAuth();
    const { pathname } = useLocation();
    const pageTitle = getPageTitle(pathname);

    return (
        <header className="sticky top-0 z-50 navbar-header border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-orange/40 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between gap-3 sm:gap-4 px-4 lg:px-6 py-2.5 sm:py-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                    </button>
                    <NavbarBrand pageTitle={pageTitle} />
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className="hidden lg:block text-sm text-slate-500 dark:text-slate-400 mr-1">
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        type="button"
                        onClick={toggle}
                        className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Changer le thème"
                    >
                        {dark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                    </button>
                    <button
                        type="button"
                        className="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                    {user && (
                        <div className="flex items-center gap-2.5 ml-1 pl-3 border-l border-slate-200 dark:border-slate-700">
                            <div className="hidden sm:block text-right leading-tight">
                                <p className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                                    {user.name || 'Mr SAIID MOHAMED'}
                                </p>
                                <p className="text-[11px] font-semibold text-brand-orange whitespace-nowrap">
                                    {user.title || 'Directeur Général'}
                                </p>
                            </div>
                            <div className="p-0.5 rounded-full hover:ring-2 hover:ring-brand-orange/30 transition-all">
                                <UserAvatar user={user} size="lg" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
