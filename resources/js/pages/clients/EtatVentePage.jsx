import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Search, Wallet, Package } from 'lucide-react';
import api from '../../lib/api';
import ScrollAreaWithArrows from '../../components/ScrollAreaWithArrows';

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

export default function EtatVentePage() {
    const navigate = useNavigate();
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [product, setProduct] = useState('');
    const [rows, setRows] = useState([]);
    const [totaux, setTotaux] = useState({ quantity: 0, cout_achat: 0, prix_vente: 0, marge: 0 });
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        const params = { month };
        if (product.trim()) params.product = product.trim();
        api.get('/etat-vente', { params })
            .then((r) => {
                setRows(r.data.data ?? []);
                setTotaux(r.data.totaux ?? { quantity: 0, cout_achat: 0, prix_vente: 0, marge: 0 });
            })
            .catch(() => {
                setRows([]);
                setTotaux({ quantity: 0, cout_achat: 0, prix_vente: 0, marge: 0 });
            })
            .finally(() => setLoading(false));
    }, [month, product]);

    useEffect(() => { load(); }, [load]);

    const headers = ['Date', 'Réf', 'Désignation', 'Qté', "Coût d'achat", 'Prix Vente', 'Marge'];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200 dark:border-emerald-800">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                            <Package className="w-4 h-4" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Qté</p>
                            <p className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                {Number(totaux.quantity || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200 dark:border-amber-800">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Marge totale</p>
                            <p className={`text-base font-bold tabular-nums ${(totaux.marge || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}`}>
                                {formatMontant(totaux.marge)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        placeholder="Produit (réf / désignation)"
                        className="pl-8 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs w-56 outline-none focus:ring-2 focus:ring-brand-navy/30"
                    />
                </div>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-700 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">État Vente</h3>
                </div>
                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700">
                                {headers.map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>{[...Array(7)].map((__, j) => (
                                        <td key={j} className="px-4 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[70px]" /></td>
                                    ))}</tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row, idx) => (
                                    <tr key={`${row.reference}-${row.article_ref}-${idx}`} className="hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.date}</td>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-orange-400">{row.article_ref || row.reference}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.designation}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
                                            {Number(row.quantity || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                                        </td>
                                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-600 dark:text-slate-300">{formatMontant(row.cout_achat)}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums font-semibold text-brand-navy dark:text-orange-400">{formatMontant(row.prix_vente)}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${
                                                (row.marge || 0) >= 0
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                                {formatMontant(row.marge)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Aucune vente pour ces critères</td></tr>
                            )}
                        </tbody>
                        {!loading && rows.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-600 font-bold">
                                    <td colSpan={3} className="px-4 py-2.5 text-center text-xs uppercase text-slate-500">Totaux</td>
                                    <td className="px-4 py-2.5 text-center tabular-nums text-emerald-700">{Number(totaux.quantity || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}</td>
                                    <td className="px-4 py-2.5 text-center tabular-nums">{formatMontant(totaux.cout_achat)}</td>
                                    <td className="px-4 py-2.5 text-center tabular-nums text-brand-navy dark:text-orange-400">{formatMontant(totaux.prix_vente)}</td>
                                    <td className="px-4 py-2.5 text-center tabular-nums text-emerald-700">{formatMontant(totaux.marge)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
