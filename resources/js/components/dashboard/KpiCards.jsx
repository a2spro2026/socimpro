import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ShoppingCart, ShoppingBag, Receipt, Wallet, AlertTriangle, X, Package,
} from 'lucide-react';
import api from '../../lib/api';
import ScrollAreaWithArrows from '../ScrollAreaWithArrows';

const cards = [
    {
        key: 'total_achats',
        label: 'Valeur Achats',
        icon: ShoppingCart,
        format: 'currency',
        gradient: 'from-blue-700 via-brand-navy to-slate-900',
        glow: 'rgba(30, 58, 95, 0.4)',
        chart: 'area',
    },
    {
        key: 'total_ventes',
        label: 'Valeur Ventes',
        icon: ShoppingBag,
        format: 'currency',
        gradient: 'from-amber-500 via-orange-500 to-orange-700',
        glow: 'rgba(249, 115, 22, 0.4)',
        chart: 'area',
    },
    {
        key: 'total_charges',
        label: 'Valeur Charges',
        icon: Receipt,
        format: 'currency',
        gradient: 'from-rose-500 via-red-500 to-rose-800',
        glow: 'rgba(244, 63, 94, 0.35)',
        chart: 'bars',
    },
    {
        key: 'valeur_caisse',
        label: 'Valeur Caisse',
        icon: Wallet,
        format: 'currency',
        gradient: 'from-emerald-500 via-teal-600 to-green-800',
        glow: 'rgba(16, 185, 129, 0.4)',
        empty: true,
        chart: 'area',
    },
];

function formatValue(value, format) {
    const num = Number(value) || 0;
    if (format === 'number') return num.toLocaleString('fr-FR');
    return `${Math.round(num).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function AnimatedValue({ value, format }) {
    const [display, setDisplay] = useState(0);
    const target = Number(value) || 0;

    useEffect(() => {
        if (target === 0) {
            setDisplay(0);
            return;
        }
        const duration = 800;
        const start = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(target * eased);
            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }, [target]);

    return <>{formatValue(display, format)}</>;
}

function buildSparkPath(values, width = 72, height = 36, pad = 2) {
    const nums = values.map((v) => Number(v) || 0);
    const max = Math.max(...nums, 1);
    const min = Math.min(...nums, 0);
    const range = Math.max(max - min, 1);
    const stepX = nums.length > 1 ? (width - pad * 2) / (nums.length - 1) : 0;

    const points = nums.map((v, i) => {
        const x = pad + i * stepX;
        const y = height - pad - ((v - min) / range) * (height - pad * 2);
        return [x, y];
    });

    const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${(points.at(-1)?.[0] ?? pad).toFixed(1)},${height - pad} L${pad},${height - pad} Z`;

    return { line, area };
}

function MiniAreaChart({ data, id }) {
    const series = (data?.length ? data : [0, 0, 0, 0, 0, 0]).slice(-6);
    const key = series.join(',');
    const { line, area } = useMemo(() => buildSparkPath(series), [key]);

    return (
        <svg viewBox="0 0 72 36" className="w-[72px] h-9 overflow-visible" aria-hidden>
            <defs>
                <linearGradient id={`kpi-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#kpi-fill-${id})`} />
            <path
                d={line}
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function MiniBarsChart({ data }) {
    const series = (data?.length ? data : [0, 0, 0, 0, 0, 0]).slice(-6);
    const max = Math.max(...series.map((v) => Number(v) || 0), 1);

    return (
        <div className="flex items-end gap-[3px] h-9 w-[72px]" aria-hidden>
            {series.map((v, i) => {
                const h = Math.max(4, ((Number(v) || 0) / max) * 100);
                return (
                    <span
                        key={i}
                        className="flex-1 rounded-sm bg-white/35 group-hover:bg-white/55 transition-colors"
                        style={{ height: `${h}%` }}
                    />
                );
            })}
        </div>
    );
}

function MiniRingChart({ faible, rupture }) {
    const total = Math.max(faible + rupture, 1);
    const r = 14;
    const c = 2 * Math.PI * r;
    const ruptureLen = (rupture / total) * c;
    const faibleLen = (faible / total) * c;

    return (
        <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden>
            <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
            <circle
                cx="20"
                cy="20"
                r={r}
                fill="none"
                stroke="rgba(254,240,138,0.95)"
                strokeWidth="5"
                strokeDasharray={`${faibleLen} ${c - faibleLen}`}
                strokeDashoffset={c * 0.25}
                strokeLinecap="round"
            />
            <circle
                cx="20"
                cy="20"
                r={r}
                fill="none"
                stroke="rgba(254,202,202,0.95)"
                strokeWidth="5"
                strokeDasharray={`${ruptureLen} ${c - ruptureLen}`}
                strokeDashoffset={c * 0.25 - faibleLen}
                strokeLinecap="round"
            />
        </svg>
    );
}

function KpiCard({ card, value, series, index }) {
    const Icon = card.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
            whileHover={{ y: -3, scale: 1.02 }}
            className={`kpi-card-compact group relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} shadow-md hover:shadow-lg transition-all duration-300`}
            style={{ '--kpi-glow': card.glow }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

            <div className="relative p-3.5 flex items-stretch gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                            <Icon className="w-4 h-4 text-white" strokeWidth={2} />
                        </div>
                    </div>

                    <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wide leading-tight mb-1 line-clamp-2 min-h-[2rem]">
                        {card.label}
                    </p>

                    <p className="text-lg font-bold text-white tracking-tight leading-none">
                        {card.empty ? '—' : <AnimatedValue value={value} format={card.format} />}
                    </p>
                </div>

                <div className="shrink-0 flex flex-col justify-end items-end pb-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    {card.chart === 'bars' ? (
                        <MiniBarsChart data={series} />
                    ) : (
                        <MiniAreaChart data={series} id={card.key} />
                    )}
                    <span className="text-[8px] font-semibold uppercase tracking-wider text-white/55 mt-1">
                        6 mois
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function AlertStockCard({ count, onClick, index, alerts }) {
    const faible = (alerts || []).filter((a) => a.level === 'faible').length;
    const rupture = (alerts || []).filter((a) => a.level === 'rupture').length;

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="kpi-card-compact group relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500 via-amber-500 to-red-600 shadow-md hover:shadow-lg transition-all duration-300 text-left w-full"
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="relative p-3.5 flex items-stretch gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                            <AlertTriangle className="w-4 h-4 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-white/25 text-white">
                            Voir
                        </span>
                    </div>
                    <p className="text-[10px] font-semibold text-white/90 uppercase tracking-wide leading-tight mb-1 min-h-[2rem]">
                        Alert Stock
                    </p>
                    <p className="text-lg font-bold text-white tracking-tight leading-none">
                        {count} alerte{count > 1 ? 's' : ''}
                    </p>
                </div>
                <div className="shrink-0 flex flex-col justify-end items-center pb-0.5">
                    <MiniRingChart faible={faible || (count > 0 && rupture === 0 ? count : faible)} rupture={rupture} />
                </div>
            </div>
        </motion.button>
    );
}

function StockAlertsModal({ open, onClose, alerts, loading }) {
    if (!open) return null;

    const rows = alerts || [];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/20">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm uppercase tracking-wide">Alert Stock</h3>
                                <p className="text-white/80 text-xs mt-0.5">
                                    Stock faible (jaune) · Rupture (rouge)
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15"
                            aria-label="Fermer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <ScrollAreaWithArrows variant="table" className="flex-1 min-h-0" deps={[rows.length, loading]}>
                        <table className="w-full text-sm min-w-[640px]">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                <tr>
                                    {['Réf', 'Produit', 'Stock', 'Seuil', 'Unité', 'État'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-left"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            {[...Array(6)].map((__, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse max-w-[90px]" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                            Aucune alerte stock pour le moment
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => {
                                        const isRupture = row.level === 'rupture';
                                        return (
                                            <tr
                                                key={row.id}
                                                className={
                                                    isRupture
                                                        ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100'
                                                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100'
                                                }
                                            >
                                                <td className="px-4 py-2.5 font-mono text-xs font-semibold">{row.reference || '—'}</td>
                                                <td className="px-4 py-2.5 font-medium">{row.name}</td>
                                                <td className="px-4 py-2.5 tabular-nums font-bold">{row.quantity}</td>
                                                <td className="px-4 py-2.5 tabular-nums">{row.min_stock}</td>
                                                <td className="px-4 py-2.5">{row.unit || '—'}</td>
                                                <td className="px-4 py-2.5">
                                                    <span
                                                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                                            isRupture
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-amber-400 text-amber-950'
                                                        }`}
                                                    >
                                                        {row.level_label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </ScrollAreaWithArrows>

                    <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-slate-800/60">
                        <div className="flex items-center gap-3 text-[11px]">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Stock faible
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Rupture
                            </span>
                        </div>
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">
                            Fermer
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function SectionTitle() {
    return (
        <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold tracking-[0.25em] text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap">
                Cartes Analytiques
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-brand-orange/60 via-brand-navy/30 to-transparent" />
        </div>
    );
}

export default function KpiCards({ kpis, stockAlerts, loading }) {
    const [showAlerts, setShowAlerts] = useState(false);
    const alertCount = stockAlerts?.length ?? (Number(kpis?.stock_faible) || 0);
    const sparklines = kpis?.sparklines || {};

    if (loading) {
        return (
            <div>
                <SectionTitle />
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                    {[...cards, { key: 'alert' }].map((card) => (
                        <div key={card.key} className="kpi-card-skeleton rounded-xl h-[100px]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <SectionTitle />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {cards.map((card, i) => (
                    <KpiCard
                        key={card.key}
                        card={card}
                        value={kpis?.[card.key] ?? kpis?.[card.fallbackKey]}
                        series={sparklines[card.key] || [0, 0, 0, 0, 0, 0]}
                        index={i}
                    />
                ))}
                <AlertStockCard
                    count={alertCount}
                    alerts={stockAlerts}
                    index={cards.length}
                    onClick={() => setShowAlerts(true)}
                />
            </div>

            <StockAlertsModal
                open={showAlerts}
                onClose={() => setShowAlerts(false)}
                alerts={stockAlerts}
                loading={false}
            />
        </div>
    );
}

export function useDashboardKpis() {
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard')
            .then((r) => setKpis(r.data.kpis))
            .catch(() => setKpis({}))
            .finally(() => setLoading(false));
    }, []);

    return { kpis, loading };
}
