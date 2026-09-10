import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Printer } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function fmtQty(value) {
    const n = Number(value);
    if (!n) return '—';
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

function monthCell(cell, flow) {
    if (!cell) return '—';
    if (flow === 'achats') return fmtQty(cell.achat);
    if (flow === 'ventes') return fmtQty(cell.vente);
    const a = Number(cell.achat) || 0;
    const v = Number(cell.vente) || 0;
    if (!a && !v) return '—';
    return `A:${fmtQty(a)} / V:${fmtQty(v)}`;
}

function openPrintable(rows, meta, filters) {
    const months = meta.months || MONTH_LABELS;
    const flow = filters.flow;
    const headMonths = months.map((m) => `<th>${m}</th>`).join('');
    const body = rows.map((row) => {
        const monthTds = Array.from({ length: 12 }, (_, i) => {
            const cell = row.months?.[i + 1] || row.months?.[String(i + 1)];
            return `<td>${monthCell(cell, flow)}</td>`;
        }).join('');
        return `<tr>
            <td>${row.ref || '—'}</td>
            <td>${row.designation || '—'}</td>
            <td>${row.type_depot_label || '—'}</td>
            <td>${fmtQty(row.stock_initial)}</td>
            ${monthTds}
            <td><strong>${fmtQty(row.stock_actuel)}</strong></td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mouvement Stock</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;font-size:11px}
h1{font-size:16px;margin:0 0 8px}
.meta{margin-bottom:12px;color:#444}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:4px 6px;text-align:center}
th{background:#f3f4f6}
@media print{button{display:none}}
</style></head><body>
<h1>STE SOCIMPRO — Mouvement Stock ${meta.year || ''}</h1>
<div class="meta">Dépôt : ${filters.type_depot} · Flux : ${filters.flow}${filters.month ? ` · Mois : ${months[filters.month - 1]}` : ''}</div>
<table>
<thead><tr><th>Réf</th><th>Désignation</th><th>Type Dépôt</th><th>Stock initial</th>${headMonths}<th>Stock actuel</th></tr></thead>
<tbody>${body || '<tr><td colspan="16">Aucune ligne</td></tr>'}</tbody>
</table>
<script>window.onload=()=>window.print()</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.write(html);
        w.document.close();
    }
}

export default function StockMouvementPage() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState('');
    const [typeDepot, setTypeDepot] = useState('all');
    const [flow, setFlow] = useState('tous');
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ months: MONTH_LABELS, year: currentYear });
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/stock/mouvements', {
            params: {
                year,
                type_depot: typeDepot,
                flow,
                month: month || undefined,
            },
        })
            .then((r) => {
                setRows(r.data.data ?? []);
                setMeta(r.data.meta ?? { months: MONTH_LABELS, year });
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [year, typeDepot, flow, month]);

    useEffect(() => { load(); }, [load]);

    const years = useMemo(() => {
        const list = [];
        for (let y = currentYear; y >= currentYear - 5; y -= 1) list.push(y);
        return list;
    }, [currentYear]);

    const months = meta.months || MONTH_LABELS;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-2.5">
                <div className="min-w-[7rem]">
                    <label className="field-label field-label-compact">Année</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs">
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="min-w-[7rem]">
                    <label className="field-label field-label-compact">Mois</label>
                    <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs">
                        <option value="">Tous</option>
                        {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div className="min-w-[8rem]">
                    <label className="field-label field-label-compact">Type dépôt</label>
                    <select value={typeDepot} onChange={(e) => setTypeDepot(e.target.value)} className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs">
                        <option value="all">Tous</option>
                        <option value="fini">Fini</option>
                        <option value="divers">Divers</option>
                    </select>
                </div>
                <div className="min-w-[8rem]">
                    <label className="field-label field-label-compact">Achats / Vente</label>
                    <select value={flow} onChange={(e) => setFlow(e.target.value)} className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs">
                        <option value="tous">Tous</option>
                        <option value="achats">Achats</option>
                        <option value="ventes">Ventes</option>
                    </select>
                </div>

                <button
                    type="button"
                    onClick={() => openPrintable(rows, meta, { type_depot: typeDepot, flow, month: month ? Number(month) : null })}
                    className="btn-secondary text-sm"
                >
                    <Printer className="w-4 h-4" /> Imprimer
                </button>
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>
            </div>

            <div className="glass-card overflow-hidden shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-700 via-slate-800 to-brand-navy border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Mouvement Stock {year}</h3>
                </div>
                <ScrollAreaWithArrows maxHeight="min(65vh, 620px)" deps={[rows.length, loading, flow]}>
                    <table className="w-full text-sm min-w-[1400px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                {['Réf', 'Désignation', 'Type Dépôt', 'Stock initial', ...months, 'Stock actuel'].map((h) => (
                                    <th key={h} className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(16)].map((__, j) => (
                                            <td key={j} className="px-2 py-3 text-center">
                                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[48px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row, i) => (
                                    <tr key={`${row.type_depot}-${row.ref}-${row.designation}-${i}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                        <td className="px-2 py-2 text-center font-mono text-xs font-semibold text-brand-navy dark:text-sky-400">{row.ref || '—'}</td>
                                        <td className="px-2 py-2 text-center font-medium text-slate-800 dark:text-white whitespace-nowrap">{row.designation || '—'}</td>
                                        <td className="px-2 py-2 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                row.type_depot === 'fini'
                                                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                            }`}
                                            >
                                                {row.type_depot_label}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-center tabular-nums font-semibold">{fmtQty(row.stock_initial)}</td>
                                        {Array.from({ length: 12 }, (_, mi) => {
                                            const cell = row.months?.[mi + 1] || row.months?.[String(mi + 1)];
                                            const highlight = month && Number(month) === mi + 1;
                                            return (
                                                <td
                                                    key={mi}
                                                    className={`px-1.5 py-2 text-center tabular-nums text-[11px] ${highlight ? 'bg-sky-50 dark:bg-sky-900/20 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
                                                >
                                                    {monthCell(cell, flow)}
                                                </td>
                                            );
                                        })}
                                        <td className="px-2 py-2 text-center tabular-nums font-bold text-emerald-700 dark:text-emerald-300">{fmtQty(row.stock_actuel)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={16} className="px-4 py-12 text-center text-slate-400">
                                        Aucun mouvement pour ces filtres
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
