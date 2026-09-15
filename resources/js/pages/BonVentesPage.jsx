import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, PlusCircle, XCircle, Eye, Pencil, Trash2, Printer, FileText, X, Package, Wallet,
} from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';
import { parseDelayInput, formatDelaySave } from './devis/devisUtils';
import {
    findDuplicateArticleRef,
    DUPLICATE_REF_MESSAGE,
    usedArticleRefs,
    normalizeArticleRef,
} from '../lib/uniqueLineRefs';

const UNIT_OPTIONS = ['', 'Kg', 'U', 'Sac', 'ML', 'M²', 'M³', 'Tn', 'M'];
const REGLEMENT_OPTIONS = ['', 'Esp', 'Chq', 'Eff', 'Vir', 'Vers'];

const emptyHeader = {
    client_id: '',
    order_date: '',
    city: '',
    address: '',
    reglement: '',
    echeance: '',
    chauffeur: '',
    matricule: '',
};

const emptyLine = () => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stock_key: '',
    product_id: '',
    article_ref: '',
    description: '',
    unit: '',
    quantity: '1',
    unit_price: '',
    stock_qty: null,
});

function stockOptionKey(p) {
    return normalizeArticleRef(p.ref);
}

function depotLabel(depots) {
    if (!depots?.length) return '';
    return depots.map((d) => (d === 'fini' ? 'Fini' : 'Divers')).join('+');
}

function Field({ label, children, className = '' }) {
    return (
        <div className={`min-w-0 ${className}`}>
            <label className="field-label field-label-compact">{label}</label>
            {children}
        </div>
    );
}

const inputClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1.5 py-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';
const readOnlyClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-1.5 py-1 text-[11px] text-center cursor-not-allowed';
const tableInput =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1.5 py-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy';

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function formatMontantDisplay(value) {
    return formatMontant(value);
}

function lineSubtotal(line) {
    const qty = parseFloat(String(line.quantity).replace(',', '.')) || 0;
    const price = parseFloat(String(line.unit_price).replace(',', '.')) || 0;
    return (qty * price).toFixed(2);
}

function orderTotalQuantity(order) {
    if (order.items?.length) {
        return order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    }
    return Number(order.quantity) || 0;
}

function buildBonHtml(row) {
    const itemsRows = (row.items?.length ? row.items : [{
        article_ref: row.article_ref,
        description: row.designation,
        unit: row.unit,
        quantity: row.quantity,
        unit_price: row.unit_price,
        total: row.subtotal,
    }]).map((i) => `<tr>
<td>${esc(i.article_ref || '—')}</td>
<td>${esc(i.description || '—')}</td>
<td>${esc(i.unit || '—')}</td>
<td>${esc(i.quantity ?? '—')}</td>
<td>${esc(formatMontant(i.unit_price))}</td>
<td><strong>${esc(formatMontant(i.total))}</strong></td>
</tr>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon ${esc(row.reference)}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#1e3a5f;font-size:22px}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:center}
th{background:#f8fafc;font-weight:700}.badge{background:#fff7ed;color:#ea580c;padding:4px 10px;border-radius:999px;font-weight:700}
</style></head><body>
<h1>STE SOCIMPRO — Bon de Vente <span class="badge">${esc(row.reference)}</span></h1>
<table>
<tr><th>Date</th><td>${esc(row.order_date || '—')}</td><th>Client</th><td>${esc(row.client || '—')}</td></tr>
<tr><th>Ville</th><td>${esc(row.city || '—')}</td><th>Adresse Livraison</th><td>${esc(row.address || '—')}</td></tr>
<tr><th>Type Régl / Échéance</th><td>${esc(row.reglement || '—')} / ${esc(row.echeance || '—')}</td><th>Chauffeur</th><td>${esc(row.chauffeur || '—')}</td></tr>
<tr><th>Matricule</th><td colspan="3">${esc(row.matricule || '—')}</td></tr>
</table>
<table>
<thead><tr><th>Réf</th><th>Désignation</th><th>U</th><th>Qté</th><th>P/U</th><th>S/Total</th></tr></thead>
<tbody>${itemsRows}</tbody>
</table>
<p style="text-align:right;font-weight:700;margin-top:12px">Total : ${esc(formatMontant(row.subtotal ?? row.montant))}</p>
</body></html>`;
}

function openPrintable(row) {
    if (!row) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(buildBonHtml(row));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
}

function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
    const colors = {
        blue: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400',
        amber: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
        red: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400',
        slate: 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        orange: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
}

function ViewModal({ row, onClose }) {
    if (!row) return null;
    const header = [
        ['Date', row.order_date], ['N° B-V', row.reference], ['Client', row.client],
        ['Ville', row.city], ['Adresse Livraison', row.address],
        ['Type Régl', row.reglement], ['Échéance', row.echeance], ['Chauffeur', row.chauffeur], ['Matricule', row.matricule],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy to-blue-800">
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase tracking-wider">Bon de Vente</p>
                        <h3 className="text-white font-bold">{row.reference}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-2 text-sm max-h-[65vh] overflow-y-auto">
                    {header.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 shrink-0">{label}</span>
                            <span className="font-medium text-slate-800 dark:text-white text-right">{value || '—'}</span>
                        </div>
                    ))}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-navy dark:text-orange-400 pt-2">Articles</p>
                    {(row.items?.length ? row.items : []).map((i, idx) => (
                        <div key={i.id || idx} className="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs">
                            <div className="font-semibold">{i.article_ref || '—'} — {i.description}</div>
                            <div className="text-slate-500 mt-0.5">{i.quantity} {i.unit || ''} × {formatMontant(i.unit_price)} = <strong>{formatMontant(i.total)}</strong></div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button type="button" onClick={() => openPrintable(row)} className="btn-secondary text-xs flex-1"><Printer className="w-3.5 h-3.5" /> Imprimer</button>
                    <button type="button" onClick={() => openPrintable(row)} className="btn-primary text-xs flex-1"><FileText className="w-3.5 h-3.5" /> PDF</button>
                </div>
            </div>
        </div>
    );
}

function FormPanel({
    open, form, lines, currentRef, saving, error, clients, stockProducts,
    onChange, updateLine, handleSelectProduct, addLine, removeLine, onClose, onSubmit, editingId,
}) {
    if (!open) return null;
    const totalBon = lines.reduce((sum, l) => sum + (parseFloat(lineSubtotal(l)) || 0), 0).toFixed(2);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[98vw] max-w-[1600px] border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[96vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 shrink-0">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? `Modifier ${currentRef || ''}` : 'Nouveau Bon de Vente'}
                    </h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">{error}</div>
                        )}

                        {!stockProducts.length && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs border border-amber-100 dark:border-amber-800">
                                Aucun produit en stock Divers ou Produit Fini — créez d&apos;abord un bon d&apos;achat (Depot Divers) ou un bon de sortie.
                            </div>
                        )}

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <div className="flex flex-nowrap items-end gap-1.5 overflow-x-auto">
                                <Field label="Date" className="w-[8.25rem] shrink-0">
                                    <input type="date" required value={form.order_date} onChange={(e) => onChange('order_date', e.target.value)} className={inputClass} />
                                </Field>
                                <Field label="N° B-V" className="w-[5.25rem] shrink-0">
                                    <input type="text" readOnly value={currentRef} className={readOnlyClass} />
                                </Field>
                                <Field label="Nom Client" className="flex-[1.8] min-w-[12rem]">
                                    <select required value={form.client_id} onChange={(e) => onChange('client_id', e.target.value)} className={`${inputClass} text-left min-h-[32px]`}>
                                        <option value="">—</option>
                                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Ville" className="w-[6rem] shrink-0">
                                    <input type="text" value={form.city} onChange={(e) => onChange('city', e.target.value)} placeholder="Ville" className={inputClass} />
                                </Field>
                                <Field label="Adresse Livraison" className="flex-1 min-w-[8rem]">
                                    <input type="text" value={form.address} onChange={(e) => onChange('address', e.target.value)} placeholder="Adresse livraison" className={`${inputClass} text-left`} />
                                </Field>
                                <Field label="Type Régl" className="w-[4.25rem] shrink-0">
                                    <select value={form.reglement} onChange={(e) => onChange('reglement', e.target.value)} className={inputClass}>
                                        {REGLEMENT_OPTIONS.map((v) => <option key={v || 'r'} value={v}>{v || '—'}</option>)}
                                    </select>
                                </Field>
                                <Field label="Échéance" className="w-[4.5rem] shrink-0">
                                    <div className="relative flex items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={form.echeance}
                                            onChange={(e) => onChange('echeance', e.target.value)}
                                            placeholder="0"
                                            className={`${inputClass} pr-6`}
                                        />
                                        <span className="absolute right-1 text-[9px] font-bold text-slate-400 pointer-events-none">Jrs</span>
                                    </div>
                                </Field>
                                <Field label="Chauffeur" className="w-[6rem] shrink-0">
                                    <input type="text" value={form.chauffeur} onChange={(e) => onChange('chauffeur', e.target.value)} placeholder="Chauffeur" className={inputClass} />
                                </Field>
                                <Field label="Matricule" className="w-[5.5rem] shrink-0">
                                    <input type="text" value={form.matricule} onChange={(e) => onChange('matricule', e.target.value)} placeholder="Matricule" className={inputClass} />
                                </Field>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-4 py-2 bg-gradient-to-r from-brand-navy via-blue-800 to-blue-900 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wide">Tableau de saisie</h3>
                                <span className="text-[10px] text-blue-200 font-semibold tabular-nums">Total : {totalBon}</span>
                            </div>
                            <ScrollAreaWithArrows variant="table">
                                <table className="w-full text-sm min-w-[860px]">
                                    <thead className="sticky top-0 z-10">                                        <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                            {['Réf', 'Désignation', 'U', 'Qté', 'P/U', 'S/Total', ''].map((h) => (
                                                <th key={h || 'act'} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {lines.map((line) => (
                                            <tr key={line.key} className="hover:bg-orange-50/30 dark:hover:bg-slate-800/30">
                                                <td className="px-2 py-1.5 w-[100px] max-w-[110px]">
                                                    <select
                                                        required
                                                        value={line.stock_key}
                                                        onChange={(e) => handleSelectProduct(line.key, e.target.value)}
                                                        className={tableInput}
                                                        title={
                                                            line.article_ref
                                                                ? `${line.article_ref}${line.description ? ` — ${line.description}` : ''}`
                                                                : 'Choisir une réf en stock Divers / Fini'
                                                        }
                                                    >
                                                        <option value="">—</option>
                                                        {stockProducts.map((p) => {
                                                            const key = stockOptionKey(p);
                                                            const taken = usedArticleRefs(lines, line.key);
                                                            const disabled = Boolean(key && taken.has(key));
                                                            return (
                                                                <option
                                                                    key={key}
                                                                    value={key}
                                                                    disabled={disabled}
                                                                    title={`${p.ref} — ${p.designation} · ${depotLabel(p.depots)} · stock ${Number(p.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}`}
                                                                >
                                                                    {p.ref}{disabled ? ' ✓' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5 min-w-[280px] w-[45%]">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={line.description}
                                                        placeholder="Désignation"
                                                        className={`${readOnlyClass} text-left`}
                                                        title={line.description || undefined}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-[72px]">
                                                    <input type="text" readOnly value={line.unit || '—'} className={readOnlyClass} />
                                                </td>
                                                <td className="px-2 py-1.5 w-[80px]">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        max={line.stock_qty != null ? line.stock_qty : undefined}
                                                        required
                                                        value={line.quantity}
                                                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                                                        className={tableInput}
                                                        title={line.stock_qty != null ? `Stock max : ${line.stock_qty}` : undefined}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-[95px]">
                                                    <input type="number" step="0.01" min="0" value={line.unit_price} onChange={(e) => updateLine(line.key, { unit_price: e.target.value })} placeholder="0.00" className={tableInput} />
                                                </td>
                                                <td className="px-2 py-1.5 w-[95px]">
                                                    <input type="text" readOnly value={lineSubtotal(line)} className={readOnlyClass} />
                                                </td>
                                                <td className="px-2 py-1.5 w-[44px] text-center">
                                                    <button
                                                        type="button"
                                                        title="Supprimer la ligne"
                                                        onClick={() => removeLine(line.key)}
                                                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollAreaWithArrows>
                            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    type="button"
                                    onClick={addLine}
                                    title="Ajouter article"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide text-brand-navy dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Ajouter article
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                        <button type="submit" disabled={saving || !stockProducts.length} className="btn-primary text-xs px-4">
                            {saving ? 'Validation...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BonVentesPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyHeader);
    const [lines, setLines] = useState([emptyLine()]);
    const [rows, setRows] = useState([]);
    const [clients, setClients] = useState([]);
    const [stockProducts, setStockProducts] = useState([]);
    const [meta, setMeta] = useState({ next_ref: '—', date: '—' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [viewRow, setViewRow] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const totalQteBons = useMemo(
        () => rows.reduce((sum, row) => sum + orderTotalQuantity(row), 0),
        [rows],
    );

    const totalMontantBons = useMemo(
        () => rows.reduce((sum, row) => sum + (Number(row.subtotal ?? row.montant) || 0), 0),
        [rows],
    );

    const loadStock = useCallback(async (exceptSalesOrderId = null) => {
        const params = exceptSalesOrderId ? { except_sales_order_id: exceptSalesOrderId } : {};
        try {
            const stockRes = await api.get('/stock/vendable', { params });
            const products = (stockRes.data.data ?? [])
                .map((p) => ({
                    ref: p.ref,
                    designation: p.designation || '',
                    unit: p.unit && p.unit !== '—' ? p.unit : '',
                    quantity: Number(p.quantity) || 0,
                    depots: Array.isArray(p.depots) ? p.depots : [],
                }))
                .filter((p) => p.ref && p.ref !== '—' && p.quantity > 0)
                .sort((a, b) => String(a.ref).localeCompare(String(b.ref), 'fr', { sensitivity: 'base' }));
            setStockProducts(products);
            return products;
        } catch {
            setStockProducts([]);
            return [];
        }
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get('/sales-orders', { params: { all: 1 } }),
            api.get('/clients', { params: { all: 1 } }),
            loadStock(),
        ])
            .then(([ordersRes, clientsRes]) => {
                setRows(ordersRes.data.data ?? []);
                setMeta(ordersRes.data.meta ?? { next_ref: '—', date: '—' });
                setClients(clientsRes.data.data ?? []);
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [loadStock]);

    useEffect(() => {
        load();
    }, [load]);

    const stockByKey = useMemo(() => {
        const map = new Map();
        stockProducts.forEach((p) => map.set(stockOptionKey(p), p));
        return map;
    }, [stockProducts]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const updateLine = (key, patch) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const handleSelectProduct = (lineKey, stockKey) => {
        const product = stockByKey.get(stockKey);
        if (!product) {
            updateLine(lineKey, {
                stock_key: '', product_id: '', article_ref: '', description: '', unit: '', stock_qty: null,
            });
            return;
        }
        if (usedArticleRefs(lines, lineKey).has(stockOptionKey(product))) {
            setError(DUPLICATE_REF_MESSAGE);
            return;
        }
        setError('');
        updateLine(lineKey, {
            stock_key: stockOptionKey(product),
            product_id: '',
            article_ref: product.ref || '',
            description: product.designation || '',
            unit: product.unit || '',
            stock_qty: product.quantity,
            quantity: '1',
        });
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);

    const removeLine = (key) => {
        setLines((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((l) => l.key !== key)));
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setError('');
        setForm(emptyHeader);
        setLines([emptyLine()]);
    };

    const openAjouter = () => {
        setForm({ ...emptyHeader, order_date: new Date().toISOString().slice(0, 10) });
        setLines([emptyLine()]);
        setEditingId(null);
        setError('');
        loadStock();
        setModalOpen(true);
    };

    const openEdit = async (row) => {
        setEditingId(row.id);
        setError('');
        const products = await loadStock(row.id);
        const byKey = new Map(products.map((p) => [normalizeArticleRef(p.ref), p]));
        setForm({
            client_id: row.client_id || '',
            order_date: row.order_date_raw || '',
            city: row.city || '',
            address: row.address || '',
            reglement: row.reglement || '',
            echeance: parseDelayInput(row.echeance || ''),
            chauffeur: row.chauffeur || '',
            matricule: row.matricule || '',
        });
        if (row.items?.length) {
            setLines(row.items.map((i) => {
                const stockKey = normalizeArticleRef(i.article_ref);
                const stock = byKey.get(stockKey);
                return {
                    key: `edit-${i.id}`,
                    stock_key: stock ? stockKey : (stockKey || ''),
                    product_id: i.product_id || '',
                    article_ref: stock?.ref || i.article_ref || '',
                    description: stock?.designation || i.description || '',
                    unit: stock?.unit || i.unit || '',
                    quantity: i.quantity != null ? String(i.quantity) : '1',
                    unit_price: i.unit_price != null ? String(i.unit_price) : '',
                    stock_qty: stock?.quantity ?? null,
                };
            }));
        } else {
            const stockKey = normalizeArticleRef(row.article_ref);
            const stock = byKey.get(stockKey);
            setLines([{
                ...emptyLine(),
                stock_key: stock ? stockKey : (stockKey || ''),
                article_ref: stock?.ref || row.article_ref || '',
                description: stock?.designation || row.designation || '',
                unit: stock?.unit || row.unit || '',
                quantity: row.quantity != null ? String(row.quantity) : '1',
                unit_price: row.unit_price != null ? String(row.unit_price) : '',
                stock_qty: stock?.quantity ?? null,
            }]);
        }
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer le bon « ${row.reference} » ?`)) return;
        try {
            await api.delete(`/sales-orders/${row.id}`);
            if (editingId === row.id) closeModal();
            if (selectedId === row.id) setSelectedId(null);
            load();
        } catch {
            setError('Impossible de supprimer ce bon de vente');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validLines = lines.filter((l) => l.stock_key && l.article_ref && l.description?.trim());
        if (!validLines.length) {
            setError('Sélectionnez au moins un produit en stock (Divers ou Fini)');
            return;
        }
        if (!form.client_id) {
            setError('Sélectionnez un client');
            return;
        }
        if (findDuplicateArticleRef(validLines)) {
            setError(DUPLICATE_REF_MESSAGE);
            return;
        }
        for (const l of validLines) {
            const stock = stockByKey.get(normalizeArticleRef(l.article_ref));
            if (!stock) {
                setError(`Produit « ${l.article_ref} » introuvable en stock (Divers ou Fini)`);
                return;
            }
            const qty = parseFloat(String(l.quantity).replace(',', '.')) || 0;
            if (qty > Number(stock.quantity) + 0.0001) {
                setError(`Quantité de « ${l.article_ref} » supérieure au stock (${stock.quantity})`);
                return;
            }
        }

        setSaving(true);
        const payload = {
            client_id: form.client_id,
            order_date: form.order_date || new Date().toISOString().slice(0, 10),
            city: form.city || null,
            address: form.address || null,
            reglement: form.reglement || null,
            echeance: formatDelaySave(form.echeance),
            chauffeur: form.chauffeur || null,
            matricule: form.matricule || null,
            status: 'valide',
            items: validLines.map((l) => ({
                product_id: null,
                article_ref: l.article_ref,
                description: l.description,
                unit: l.unit || null,
                quantity: parseFloat(String(l.quantity).replace(',', '.')) || 1,
                unit_price: parseFloat(String(l.unit_price).replace(',', '.')) || 0,
            })),
        };

        try {
            if (editingId) {
                await api.put(`/sales-orders/${editingId}`, payload);
            } else {
                await api.post('/sales-orders', payload);
            }
            closeModal();
            load();
        } catch (err) {
            const errors = err.response?.data?.errors || {};
            const firstError = Object.values(errors).flat()[0];
            setError(firstError || err.response?.data?.message || 'Erreur lors de la validation');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        const row = selectedId ? rows.find((r) => r.id === selectedId) : null;
        if (row) {
            openPrintable(row);
            return;
        }
        if (rows.length === 1) {
            openPrintable(rows[0]);
            return;
        }
        window.alert('Sélectionnez un bon dans le tableau pour l\'imprimer.');
    };

    const currentRef = editingId
        ? rows.find((r) => r.id === editingId)?.reference ?? meta.next_ref
        : meta.next_ref;

    return (
        <div className="space-y-4">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />
            <FormPanel
                open={modalOpen}
                form={form}
                lines={lines}
                currentRef={currentRef}
                saving={saving}
                error={error}
                clients={clients}
                stockProducts={stockProducts}
                onChange={onChange}
                updateLine={updateLine}
                handleSelectProduct={handleSelectProduct}
                addLine={addLine}
                removeLine={removeLine}
                onClose={closeModal}
                onSubmit={handleSubmit}
                editingId={editingId}
            />

            <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={openAjouter} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                </button>
                <button type="button" onClick={handlePrint} className="btn-secondary text-sm">
                    <Printer className="w-4 h-4" /> Imprimer
                </button>
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200 dark:border-emerald-800">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                            <Package className="w-4 h-4" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Qté</p>
                            <p className="text-base font-bold tabular-nums leading-tight text-emerald-700 dark:text-emerald-300">
                                {totalQteBons.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200 dark:border-amber-800">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Montant</p>
                            <p className="text-base font-bold tabular-nums leading-tight text-brand-navy dark:text-orange-300">
                                {formatMontantDisplay(totalMontantBons)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-700 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tableau des Bons de Vente</h3>
                </div>
                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[1100px]">
                        <thead className="sticky top-0 z-10">                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                {['Date', 'N° B-V', 'Client', 'Ville', 'Adresse Livraison', 'Qté totale', 'Total', 'Échéance', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>{[...Array(9)].map((__, j) => (
                                        <td key={j} className="px-4 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" /></td>
                                    ))}</tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => setSelectedId(row.id)}
                                        className={`cursor-pointer hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition-colors ${selectedId === row.id ? 'bg-amber-50/70 dark:bg-amber-900/20' : ''}`}
                                    >
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.order_date}</td>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-orange-400">{row.reference}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.client || '—'}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.city || '—'}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.address || '—'}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                            {orderTotalQuantity(row).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-orange-400">{formatMontantDisplay(row.subtotal ?? row.montant)}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                {row.echeance || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => openEdit(row)} />
                                                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => openPrintable(row)} />
                                                <ActionBtn title="PDF" icon={FileText} color="orange" onClick={() => openPrintable(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Aucun bon de vente — cliquez sur Ajouter</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
