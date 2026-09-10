import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PlusCircle, XCircle, Eye, Pencil, Trash2, X } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';
import { findDuplicateArticleRef, DUPLICATE_REF_MESSAGE } from '../lib/uniqueLineRefs';

const UNIT_OPTIONS = ['', 'Kg', 'U', 'Sac', 'ML', 'M²', 'M³', 'Tn', 'M'];

const emptyLine = () => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    article_ref: '',
    description: '',
    unit: '',
    quantity: '1',
});

function Field({ label, children, className = '' }) {
    return (
        <div className={`min-w-0 ${className}`}>
            <label className="field-label field-label-compact">{label}</label>
            {children}
        </div>
    );
}

const inputClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';
const readOnlyClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2 py-1.5 text-xs text-center cursor-not-allowed';
const tableInput =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1.5 py-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy';

function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
    const colors = {
        blue: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400',
        amber: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
        red: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
}

function orderTotalQty(row) {
    if (row.items?.length) {
        return row.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    }
    return Number(row.quantity) || 0;
}

function productsSummary(row) {
    const items = row.items?.length
        ? row.items
        : [{ article_ref: row.article_ref, description: row.designation }];
    if (!items.length) return '—';
    if (items.length === 1) return items[0].description || items[0].article_ref || '—';
    return `${items[0].description || items[0].article_ref || '—'} (+${items.length - 1})`;
}

function ViewModal({ row, onClose }) {
    if (!row) return null;
    const items = row.items?.length
        ? row.items
        : [{ article_ref: row.article_ref, description: row.designation, unit: row.unit, quantity: row.quantity }];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-700">
                    <div>
                        <p className="text-[10px] text-violet-100 uppercase tracking-wider">Bon Sortie</p>
                        <h3 className="text-white font-bold">{row.reference}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">Date</span>
                            <span className="font-medium">{row.sortie_date || '—'}</span>
                        </div>
                        <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">N° BS</span>
                            <span className="font-medium">{row.reference || '—'}</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/80">
                                    {['Réf', 'Désignation', 'U', 'Qte'].map((h) => (
                                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500 text-center">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {items.map((item, i) => (
                                    <tr key={item.id ?? i}>
                                        <td className="px-3 py-2 text-center font-mono text-xs">{item.article_ref || '—'}</td>
                                        <td className="px-3 py-2 text-center">{item.description || '—'}</td>
                                        <td className="px-3 py-2 text-center">{item.unit || '—'}</td>
                                        <td className="px-3 py-2 text-center tabular-nums font-semibold">
                                            {Number(item.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex justify-end px-5 py-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                </div>
            </div>
        </div>
    );
}

function FormPanel({
    open, formDate, lines, currentRef, saving, error, editingId,
    onChangeDate, updateLine, addLine, removeLine, onClose, onSubmit,
}) {
    if (!open) return null;
    const totalQty = lines.reduce((sum, l) => sum + (parseFloat(String(l.quantity).replace(',', '.')) || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[96vw] max-w-4xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[96vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-800 shrink-0">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? `Modifier ${currentRef || ''}` : 'Nouveau Bon Sortie'}
                    </h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <div className="flex flex-wrap items-end gap-3">
                                <Field label="Date" className="w-[10rem]">
                                    <input type="date" required value={formDate} onChange={(e) => onChangeDate(e.target.value)} className={inputClass} />
                                </Field>
                                <Field label="N° BS" className="w-[8rem]">
                                    <input type="text" readOnly value={currentRef} className={readOnlyClass} />
                                </Field>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-4 py-2 bg-gradient-to-r from-violet-700 to-indigo-800">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wide">Produits</h3>
                            </div>
                            <ScrollAreaWithArrows>
                                <table className="w-full text-sm min-w-[720px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                            {['Réf', 'Désignation', 'U', 'Qte', ''].map((h) => (
                                                <th key={h || 'act'} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {lines.map((line) => (
                                            <tr key={line.key}>
                                                <td className="px-2 py-1.5 w-[120px]">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={line.article_ref}
                                                        onChange={(e) => updateLine(line.key, { article_ref: e.target.value })}
                                                        placeholder="Réf"
                                                        className={tableInput}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 min-w-[180px]">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={line.description}
                                                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                                                        placeholder="Désignation"
                                                        className={`${tableInput} text-left`}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-[72px]">
                                                    <select value={line.unit} onChange={(e) => updateLine(line.key, { unit: e.target.value })} className={tableInput}>
                                                        {UNIT_OPTIONS.map((v) => <option key={v || 'u'} value={v}>{v || '—'}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5 w-[90px]">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        required
                                                        value={line.quantity}
                                                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                                                        className={tableInput}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-[44px] text-center">
                                                    <button type="button" onClick={() => removeLine(line.key)} className="p-1 rounded-md text-slate-400 hover:text-red-500">
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
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Ajouter réf
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <span className="text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300 whitespace-nowrap">
                            Total Qté : {totalQty.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                        </span>
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-4">
                            {saving ? 'Validation...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BonSortiePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ next_ref: '—', date_raw: '' });
    const [loading, setLoading] = useState(true);
    const [formDate, setFormDate] = useState('');
    const [lines, setLines] = useState([emptyLine()]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewRow, setViewRow] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        api.get('/sortie-orders')
            .then((ordersRes) => {
                setRows(ordersRes.data.data ?? []);
                setMeta(ordersRes.data.meta ?? { next_ref: '—', date_raw: '' });
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    const addLine = () => setLines((prev) => [...prev, emptyLine()]);
    const removeLine = (key) => setLines((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((l) => l.key !== key)));

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setError('');
        setFormDate('');
        setLines([emptyLine()]);
    };

    const openAjouter = () => {
        setFormDate(meta.date_raw || new Date().toISOString().slice(0, 10));
        setLines([emptyLine()]);
        setEditingId(null);
        setError('');
        load();
        setModalOpen(true);
    };

    const openEdit = (row) => {
        const sourceItems = row.items?.length
            ? row.items
            : [{ article_ref: row.article_ref, description: row.designation, unit: row.unit, quantity: row.quantity }];
        setFormDate(row.sortie_date_raw || '');
        setLines(sourceItems.map((item, i) => ({
            key: `edit-${item.id ?? i}`,
            article_ref: item.article_ref || '',
            description: item.description || '',
            unit: item.unit || '',
            quantity: item.quantity != null ? String(item.quantity) : '1',
        })));
        setEditingId(row.id);
        setError('');
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer le bon « ${row.reference} » ?`)) return;
        try {
            await api.delete(`/sortie-orders/${row.id}`);
            if (editingId === row.id) closeModal();
            load();
        } catch {
            setError('Impossible de supprimer ce bon de sortie');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validLines = lines.filter((l) => l.article_ref?.trim() && l.description?.trim());
        if (!validLines.length) {
            setError('Ajoutez au moins un produit avec réf et désignation');
            return;
        }
        if (findDuplicateArticleRef(validLines)) {
            setError(DUPLICATE_REF_MESSAGE);
            return;
        }
        setSaving(true);
        const payload = {
            sortie_date: formDate || new Date().toISOString().slice(0, 10),
            items: validLines.map((l) => ({
                article_ref: l.article_ref.trim(),
                description: l.description.trim(),
                unit: l.unit || null,
                quantity: parseFloat(String(l.quantity).replace(',', '.')) || 0,
            })),
        };
        try {
            if (editingId) await api.put(`/sortie-orders/${editingId}`, payload);
            else await api.post('/sortie-orders', payload);
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

    const currentRef = editingId
        ? rows.find((r) => r.id === editingId)?.reference ?? meta.next_ref
        : meta.next_ref;

    return (
        <div className="space-y-4">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />
            <FormPanel
                open={modalOpen}
                formDate={formDate}
                lines={lines}
                currentRef={currentRef}
                saving={saving}
                error={error}
                editingId={editingId}
                onChangeDate={setFormDate}
                updateLine={updateLine}
                addLine={addLine}
                removeLine={removeLine}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={openAjouter} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                </button>
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>
            </div>

            <div className="glass-card overflow-hidden shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-800 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tableau des Bons de Sortie</h3>
                </div>
                <ScrollAreaWithArrows maxHeight="min(60vh, 560px)" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[780px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                {['Date', 'N° BS', 'Produits', 'Lignes', 'Qte totale', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>{[...Array(6)].map((__, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" /></td>
                                    ))}</tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-violet-50/40 dark:hover:bg-slate-800/40">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.sortie_date}</td>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-violet-400">{row.reference}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{productsSummary(row)}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums">{row.items_count ?? row.items?.length ?? 1}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                                            {orderTotalQty(row).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => openEdit(row)} />
                                                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Aucun bon de sortie — cliquez sur Ajouter</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
