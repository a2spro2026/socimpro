import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut } from 'lucide-react';
import { navigation } from '../../config/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarBrand } from '../Logo';
import { getPageTitle } from '../../lib/pageMeta';
import { useNavigate } from 'react-router-dom';

const sectionColors = {
    fournisseurs: 'from-amber-500/20 to-orange-600/10',
    clients: 'from-blue-500/20 to-cyan-600/10',
    facturation: 'from-indigo-500/20 to-blue-700/10',
    stock: 'from-emerald-500/20 to-teal-600/10',
    chantiers: 'from-yellow-500/20 to-amber-600/10',
    personnel: 'from-violet-500/20 to-purple-600/10',
    monetaire: 'from-rose-500/20 to-pink-600/10',
    configuration: 'from-slate-400/20 to-slate-600/10',
};

function NavIcon({ icon: Icon, active, size = 'md' }) {
    const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <span
            className={`sidebar-icon-wrap flex items-center justify-center rounded-lg shrink-0 ${sizeClass} ${
                active
                    ? 'bg-white/25 shadow-inner'
                    : 'bg-white/5'
            }`}
        >
            <Icon className={`${iconSize} ${active ? 'text-white' : 'text-blue-200'}`} strokeWidth={2} />
        </span>
    );
}

function isItemActive(item, pathname) {
    if (item.disabled) return false;
    if (item.to && (pathname === item.to || pathname.startsWith(item.to + '/'))) return true;
    return (item.children || []).some((child) => isItemActive(child, pathname));
}

function NestedNavGroup({ child, onClose, index }) {
    const location = useLocation();
    const disabled = !!child.disabled;
    const nestedActive = !disabled && (child.children || []).some((c) => isItemActive(c, location.pathname));
    const [open, setOpen] = useState(nestedActive);
    const Icon = child.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
            className={disabled ? 'opacity-40 grayscale pointer-events-none' : ''}
        >
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={`sidebar-child-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                    disabled
                        ? 'text-slate-400 cursor-not-allowed'
                        : nestedActive || open
                            ? 'text-white'
                            : 'text-blue-200/90 hover:bg-white/5 hover:text-white'
                }`}
            >
                {Icon && (
                    <Icon
                        className={`sidebar-child-icon w-4 h-4 shrink-0 ${
                            nestedActive ? 'text-brand-orange' : 'opacity-70'
                        }`}
                        strokeWidth={1.75}
                    />
                )}
                <span className="flex-1 text-left truncate">{child.label}</span>
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center justify-center w-4 h-4"
                >
                    <ChevronDown className="w-3 h-3 opacity-80" />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {!disabled && open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="ml-3 pl-2 border-l border-white/15 space-y-0.5 py-0.5">
                            {child.children.map((sub, i) => (
                                <NavChildItem key={sub.to || sub.label} child={sub} onClose={onClose} index={i} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function NavChildItem({ child, onClose, index }) {
    const disabled = !!child.disabled;

    if (child.children?.length) {
        return <NestedNavGroup child={child} onClose={onClose} index={index} />;
    }

    if (disabled) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                title="Indisponible"
                className="opacity-40 grayscale pointer-events-none"
            >
                <div className="sidebar-child-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 cursor-not-allowed">
                    <child.icon className="sidebar-child-icon w-4 h-4 shrink-0 opacity-60" strokeWidth={1.75} />
                    <span className="truncate">{child.label}</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
        >
            <NavLink
                to={child.to}
                onClick={onClose}
                className={({ isActive }) =>
                    `sidebar-child-item group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                        isActive
                            ? 'sidebar-child-active text-white'
                            : 'text-blue-200/90 hover:bg-white/5 hover:text-white hover:pl-3'
                    }`
                }
            >
                {({ isActive }) => (
                    <>
                        {isActive && (
                            <motion.span
                                layoutId="sidebar-child-indicator"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-brand-orange sidebar-active-indicator"
                            />
                        )}
                        <child.icon
                            className={`sidebar-child-icon w-4 h-4 shrink-0 ${
                                isActive ? 'text-brand-orange' : 'opacity-70 group-hover:opacity-100'
                            }`}
                            strokeWidth={1.75}
                        />
                        <span className="truncate">{child.label}</span>
                        {isActive && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0"
                            />
                        )}
                    </>
                )}
            </NavLink>
        </motion.div>
    );
}

function DashboardLink({ item, onClose }) {
    return (
        <NavLink
            to={item.to}
            end
            onClick={onClose}
            className={({ isActive }) =>
                `sidebar-nav-item relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                        ? 'sidebar-nav-active text-white'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <motion.span
                            layoutId="sidebar-main-indicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-white/80 sidebar-active-indicator"
                        />
                    )}
                    <NavIcon icon={item.icon} active={isActive} />
                    <span>{item.label}</span>
                </>
            )}
        </NavLink>
    );
}

function NavGroup({ group, onClose, index }) {
    const location = useLocation();
    const disabled = !!group.disabled;
    const isChildActive = !disabled && (group.children || []).some((c) => isItemActive(c, location.pathname));
    const [open, setOpen] = useState(isChildActive);
    const accent = sectionColors[group.id] || 'from-white/10 to-white/5';

    if (group.to) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={disabled ? 'opacity-40 grayscale pointer-events-none' : ''}
            >
                <NavLink
                    to={group.to}
                    end
                    onClick={onClose}
                    className={({ isActive }) =>
                        `sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                            isActive
                                ? 'sidebar-nav-active text-white'
                                : 'text-blue-100 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <motion.span
                                    layoutId="sidebar-main-indicator"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-white/80 sidebar-active-indicator"
                                />
                            )}
                            <NavIcon icon={group.icon} active={isActive} />
                            <span>{group.label}</span>
                        </>
                    )}
                </NavLink>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`mb-1 ${disabled ? 'opacity-40 grayscale' : ''}`}
            title={disabled ? 'Section indisponible' : undefined}
        >
            <motion.button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                whileHover={disabled ? undefined : { x: 2 }}
                whileTap={disabled ? undefined : { scale: 0.98 }}
                disabled={disabled}
                className={`sidebar-nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    disabled
                        ? 'text-slate-400 cursor-not-allowed bg-white/5'
                        : isChildActive || open
                            ? `sidebar-section-open text-white bg-gradient-to-r ${accent}`
                            : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
            >
                <NavIcon icon={group.icon} active={!disabled && (isChildActive || open)} />
                <span className="flex-1 text-left truncate">{group.label}</span>
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center justify-center w-6 h-6 rounded-md bg-white/5"
                >
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </motion.span>
            </motion.button>

            <AnimatePresence initial={false}>
                {!disabled && open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="mt-1.5 ml-4 pl-3 border-l-2 sidebar-tree-line space-y-0.5 py-1">
                            {group.children.map((child, i) => (
                                <NavChildItem key={child.to || child.label} child={child} onClose={onClose} index={i} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function Sidebar({ mobile, onClose }) {
    const { can, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const pageTitle = getPageTitle(pathname);
    const visibleNav = navigation.filter((item) => can(item.perm));
    const dashboardItem = visibleNav.find((item) => item.id === 'dashboard');
    const menuGroups = visibleNav.filter((item) => item.id !== 'dashboard');

    const handleLogout = async () => {
        await logout();
        onClose?.();
        navigate('/login');
    };

    return (
        <aside
            className={`sidebar-panel ${
                mobile ? 'fixed inset-y-0 left-0 z-50 w-72' : 'hidden lg:flex lg:w-72 lg:sticky lg:top-0'
            } flex-col h-screen text-white shrink-0`}
        >
            {/* Décor fond */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-brand-orange/10 blur-3xl" />
                <div className="absolute bottom-32 -left-10 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            {/* Logo + Tableau de bord — fixés en haut */}
            <div className="relative shrink-0 z-10 border-b border-white/10 bg-slate-900/40 backdrop-blur-md">
                <div className="p-4 pb-3">
                    <SidebarBrand pageTitle={pageTitle} />
                </div>
                {dashboardItem && (
                    <div className="px-3 pb-3">
                        <DashboardLink item={dashboardItem} onClose={onClose} />
                    </div>
                )}
            </div>

            {/* Menus déroulants — zone scrollable */}
            <nav className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3">
                <div className="space-y-1">
                    {menuGroups.map((group, i) => (
                        <NavGroup key={group.id} group={group} onClose={onClose} index={i} />
                    ))}
                </div>
            </nav>

            {/* Déconnexion — fixé en bas */}
            <div className="relative shrink-0 p-4 border-t border-white/10 bg-slate-900/40 backdrop-blur-md z-10">
                <motion.button
                    type="button"
                    onClick={handleLogout}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className="sidebar-nav-item w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-200 hover:text-white hover:bg-red-500/20 border border-red-500/20 hover:border-red-400/40 transition-all duration-300"
                >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/15 shrink-0">
                        <LogOut className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <span className="flex-1 text-left">Se déconnecter</span>
                </motion.button>
            </div>
        </aside>
    );
}
