import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, PackageOpen, PackageCheck, Boxes, X } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const META = {
    cru: {
        title: 'Etat Stock Cru',
        subtitle: 'Entrées des bons d\'achat destinés au stock cru',
        icon: PackageOpen,
        accent: 'from-teal-600 via-emerald-600 to-teal-700',
        empty: 'Aucun article en stock cru',
        showActions: true,
    },
    divers: {
        title: 'Etat Stock Divers',
        subtitle: 'Entrées des bons d\'achat destinés au stock divers',
        icon: Boxes,
        accent: 'from-amber-500 via-orange-500 to-orange-700',
        empty: 'Aucun article en stock divers',
        showActions: false,
    },
    fini: {
        title: 'Etat Stock Fini',
        subtitle: 'Stock des produits finis',
        icon: PackageCheck,
        accent: 'from-violet-600 via-indigo-600 to-slate-800',
        empty: 'Aucun article en stock fini',
        showActions: false,
    },
};

function formatQty(value) {
    return Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function flattenStockRows(orders) {
    return orders.flatMap((order) => {
        const items = order.items?.length
            ? order.items
            : [{
                id: 'header',
                article_ref: order.article_ref,
                description: order.designation,
                quantity: order.quantity,
                unit: order.unit,
                unit_price: order.unit_price,
                total: order.subtotal,
            }];

        return items.map((item, idx) => ({
            key: `${order.id}-${item.id ?? idx}`,
            date: order.order_date || '—',
            ref: order.reference || item.article_ref || '—',
            designation: item.description || order.designation || '—',
            qty: item.quantity,
            unit: item.unit || order.unit || '—',
            order,
        }));
    });
}

function ViewModal({ row, onClose }) {
    const order = row?.order;
    if (!order) return null;

    const header = [
        ['Date', order.order_date],
        ['N° B-A', order.reference],
        ['Fournisseur', order.fournisseur],
        ['N° Frns', order.bc_number],
        ['Destination', order.destination === 'divers' ? 'Divers' : 'Cru'],
        ['Ville', order.city],
        ['Type Rég', order.reglement],
        ['Échéance', order.echeance],
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-700">
                    <div>
                        <p className="text-[10px] text-emerald-100 uppercase tracking-wider">Bon d'Achat</p>
                        <h3 className="text-white font-bold">{order.reference}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-2 text-sm max-h-[65vh] overflow-y-auto">
                    {header.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 shrink-0">{label}</span>
                            <span className="font-medium text-slate-800 dark:text-white text-right">{value || '—'}</span>
                        </div>
                    ))}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-navy dark:text-orange-400 pt-2">Articles</p>
                    {(order.items?.length ? order.items : []).map((item, idx) => (
                        <div key={item.id || idx} className="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs">
                            <div className="font-semibold">{item.article_ref || '—'} — {item.description}</div>
                            <div className="text-slate-500 mt-0.5">
                                {item.quantity} {item.unit || ''} × {formatMontant(item.unit_price)} = <strong>{formatMontant(item.total)}</strong>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button type="button" onClick={onClose} className="btn-primary text-xs ml-auto">Fermer</button>
                </div>
            </div>
        </div>
    );
}

export default function EtatStockPage({ destination = 'cru' }) {
    const config = META[destination] || META.cru;
    const Icon = config.icon;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewRow, setViewRow] = useState(null);

    const load = useCallback(() => {
        if (destination !== 'cru' && destination !== 'divers') {
            setOrders([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        api.get('/purchase-orders', { params: { all: 1, doc_type: 'bon_achat', destination } })
            .then((res) => setOrders(res.data.data ?? []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [destination]);

    useEffect(() => {
        load();
    }, [load]);

    const rows = useMemo(() => flattenStockRows(orders), [orders]);
    const columns = config.showActions
        ? ['Date', 'Réf', 'Désignation', 'Qte', 'Unité', 'Action']
        : ['Date', 'Réf', 'Désignation', 'Qte', 'Unité'];

    return (
        <div className="space-y-4">
            {config.showActions && <ViewModal row={viewRow} onClose={() => setViewRow(null)} />}

            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.accent} text-white shadow-lg`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">{config.title}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{config.subtitle}</p>
                </div>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className={`px-5 py-3.5 rounded-t-2xl bg-gradient-to-r ${config.accent} border-b border-white/10`}>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">{config.title}</h3>
                </div>
                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[720px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                {columns.map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        {columns.map((__, j) => (
                                            <td key={j} className="px-4 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.key} className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.date}</td>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-emerald-400">{row.ref}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.designation}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums font-semibold">{formatQty(row.qty)}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.unit || '—'}</td>
                                        {config.showActions && (
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        title="Voir"
                                                        onClick={() => setViewRow(row)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                                        {config.empty}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
