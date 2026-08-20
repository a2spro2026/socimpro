import { useEffect, useMemo, useState, useCallback } from 'react';
import { Save, RefreshCw, Eye, Pencil, Printer, Trash2, FileText, X } from 'lucide-react';
import api from '../../lib/api';
import { formatMontant } from './bonExecutionUtils';
import { formatSoldePlain, soldeTone, SoldeCell } from './clientAmountUtils';
import { openPaymentPrintable } from './etatPaiementUtils';
import ScrollAreaWithArrows from '../../components/ScrollAreaWithArrows';

const REGLEMENT_OPTIONS = ['', 'Esp', 'Chq', 'Eff', 'Vir', 'Vers'];
const CHANTIER_TYPE_OPTIONS = ['', 'Public', 'Privé'];

const emptyForm = {
    payment_date: '',
    reference: '',
    client_name: '',
    ville_chantier: '',
    chantier_type: '',
    montant_total: '',
    montant_paye: '',
    reglement: '',
    numero: '',
    banque: '',
    nom_tire: '',
    montant: '',
    solde: '',
};

function Field({ label, children, compact = false }) {
    return (
        <div>
            <label className={`field-label ${compact ? 'field-label-compact' : ''}`}>
                {label}
            </label>
            {children}
        </div>
    );
}

const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1.5 text-xs text-center outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all min-w-0';
const inputCompact = `${inputClass} py-1 text-[11px]`;
const readOnlyClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2 py-1.5 text-xs text-center cursor-not-allowed min-w-0';
const readOnlyCompact = `${readOnlyClass} py-1 text-[11px]`;

function formatPlain(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
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

function ViewPaymentModal({ payment, onClose, onPrint }) {
    if (!payment) return null;
    const fields = [
        ['Date', payment.payment_date],
        ['Réf°', payment.reference],
        ['Client', payment.client_name],
        ['Ville Chantier', payment.ville_chantier],
        ['Type Chantier', payment.chantier_type],
        ['Règlement', payment.reglement],
        ['N°', payment.numero],
        ['Banque', payment.banque],
        ['Nom Tiré', payment.nom_tire],
        ['Montant État', formatMontant(payment.montant_total)],
        ['Montant Payé', formatMontant(payment.montant)],
        ['Solde', formatMontant(payment.solde)],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700">
                    <div>
                        <p className="text-[10px] text-emerald-100 uppercase tracking-wider">État Paiement</p>
                        <h3 className="text-white font-bold">{payment.reference}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-2 text-sm max-h-[60vh] overflow-y-auto">
                    {fields.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
                            <span className="font-medium text-slate-800 dark:text-white text-right">{value || '—'}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button type="button" onClick={() => onPrint(payment)} className="btn-secondary text-xs flex-1"><Printer className="w-3.5 h-3.5" /> Imprimer</button>
                    <button type="button" onClick={() => onPrint(payment)} className="btn-primary text-xs flex-1"><FileText className="w-3.5 h-3.5" /> PDF</button>
                </div>
            </div>
        </div>
    );
}

export default function EtatPaiementPage() {
    const [meta, setMeta] = useState({ next_ref: 'EP-0001', date: '', date_raw: '' });
    const [form, setForm] = useState(emptyForm);
    const [rows, setRows] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [viewPayment, setViewPayment] = useState(null);
    const [editingPaymentId, setEditingPaymentId] = useState(null);

    const selectedRows = useMemo(
        () => rows.filter((r) => selectedIds.has(r.id)),
        [rows, selectedIds],
    );

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get('/client-payments/meta'),
            api.get('/client-orders', { params: { all: 1 } }),
        ])
            .then(([metaRes, ordersRes]) => {
                setMeta(metaRes.data);
                setRows(ordersRes.data.data ?? []);
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!meta.date_raw) return;
        setForm((f) => ({
            ...f,
            payment_date: f.payment_date || meta.date_raw,
            reference: meta.next_ref,
        }));
    }, [meta]);

    const focusedRow = useMemo(() => {
        if (!selectedRows.length) return null;
        return selectedRows[selectedRows.length - 1];
    }, [selectedRows]);

    const reglementRows = useMemo(() => {
        if (!focusedRow?.payments?.length) return [];
        return focusedRow.payments;
    }, [focusedRow]);

    const rowSolde = (row) => {
        const paye = Number(row.montant_paye) || 0;
        const total = Number(row.montant ?? row.total_ttc) || 0;
        return row.solde ?? (paye - total);
    };

    const calcAmounts = useCallback((f, rowsSelected) => {
        const totalMontant = rowsSelected.reduce((sum, r) => sum + (Number(r.montant ?? r.total_ttc) || 0), 0);
        const existingPaye = rowsSelected.reduce((sum, r) => sum + (Number(r.montant_paye) || 0), 0);
        const newPay = parseFloat(f.montant) || 0;

        let displayPaye;
        let displaySolde;
        if (newPay > 0) {
            displayPaye = newPay;
            displaySolde = newPay - totalMontant;
        } else {
            displayPaye = existingPaye;
            displaySolde = existingPaye - totalMontant;
        }

        return { totalMontant, displayPaye, displaySolde };
    }, []);

    useEffect(() => {
        if (editingPaymentId) return;

        if (!selectedRows.length) {
            setForm((f) => ({
                ...f,
                client_name: '',
                ville_chantier: '',
                chantier_type: '',
                montant_total: '',
                montant_paye: '',
                montant: '',
                solde: '',
            }));
            return;
        }

        const first = selectedRows[0];

        setForm((f) => {
            const { totalMontant, displayPaye, displaySolde } = calcAmounts(f, selectedRows);
            return {
                ...f,
                client_name: first.client_name || '',
                ville_chantier: first.city || '',
                chantier_type: first.chantier_type || '',
                montant_total: totalMontant.toFixed(2),
                montant_paye: displayPaye.toFixed(2),
                solde: displaySolde.toFixed(2),
            };
        });
    }, [selectedRows, editingPaymentId, calcAmounts]);

    const set = (key, value) => setForm((f) => {
        const next = { ...f, [key]: value };
        if (key === 'montant' && selectedRows.length) {
            const { displayPaye, displaySolde } = calcAmounts(next, selectedRows);
            next.montant_paye = displayPaye.toFixed(2);
            next.solde = displaySolde.toFixed(2);
        }
        return next;
    });

    const toggleRow = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === rows.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(rows.map((r) => r.id)));
        }
    };

    const fetchPayment = async (paymentId) => (await api.get(`/client-payments/${paymentId}`)).data;

    const loadPaymentForEdit = async (paymentId) => {
        try {
            const payment = await fetchPayment(paymentId);
            setEditingPaymentId(payment.id);
            setSelectedIds(new Set());
            setForm({
                payment_date: payment.payment_date_raw || meta.date_raw || '',
                reference: payment.reference || '',
                client_name: payment.client_name || '',
                ville_chantier: payment.ville_chantier || '',
                chantier_type: payment.chantier_type || '',
                montant_total: String(payment.montant_total ?? ''),
                montant_paye: String(payment.montant ?? ''),
                reglement: payment.reglement || '',
                numero: payment.numero || '',
                banque: payment.banque || '',
                nom_tire: payment.nom_tire || '',
                montant: String(payment.montant ?? ''),
                solde: String((Number(payment.montant) || 0) - (Number(payment.montant_total) || 0)),
            });
            setError('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            setError('Impossible de charger le paiement');
        }
    };

    const handleViewPayment = async (paymentOrId) => {
        try {
            const payment = typeof paymentOrId === 'object' ? paymentOrId : await fetchPayment(paymentOrId);
            setViewPayment(payment);
        } catch {
            window.alert('Impossible de charger ce paiement');
        }
    };

    const handleDeletePayment = async (payment) => {
        if (!window.confirm(`Supprimer le paiement « ${payment.reference} » (${formatMontant(payment.montant)}) ?`)) return;
        try {
            await api.delete(`/client-payments/${payment.id}`);
            if (editingPaymentId === payment.id) resetForm();
            if (viewPayment?.id === payment.id) setViewPayment(null);
            load();
        } catch (err) {
            window.alert(err.response?.data?.message || 'Impossible de supprimer ce paiement');
        }
    };

    const handlePrintPayment = async (paymentOrId) => {
        try {
            const payment = typeof paymentOrId === 'object' ? paymentOrId : await fetchPayment(paymentOrId);
            openPaymentPrintable(payment);
        } catch {
            window.alert('Impossible d\'imprimer ce paiement');
        }
    };

    const renderPaymentActions = (paymentId) => {
        if (!paymentId) return <span className="text-slate-300 dark:text-slate-600">—</span>;
        return (
            <div className="flex items-center justify-center gap-0.5">
                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => handleViewPayment(paymentId)} />
                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => loadPaymentForEdit(paymentId)} />
                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => handlePrintPayment(paymentId)} />
                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={async () => handleDeletePayment(await fetchPayment(paymentId))} />
                <ActionBtn title="PDF" icon={FileText} color="orange" onClick={() => handlePrintPayment(paymentId)} />
            </div>
        );
    };

    const resetForm = () => {
        setSelectedIds(new Set());
        setEditingPaymentId(null);
        setForm({
            ...emptyForm,
            payment_date: meta.date_raw || '',
            reference: meta.next_ref || '',
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (editingPaymentId) {
            setSaving(true);
            try {
                await api.put(`/client-payments/${editingPaymentId}`, {
                    payment_date: form.payment_date,
                    reglement: form.reglement || null,
                    numero: form.numero || null,
                    banque: form.banque || null,
                    nom_tire: form.nom_tire || null,
                });
                resetForm();
                load();
            } catch (err) {
                setError(err.response?.data?.message || 'Impossible de modifier le paiement');
            } finally {
                setSaving(false);
            }
            return;
        }

        if (!selectedIds.size) {
            setError('Sélectionnez au moins une ligne à régler');
            return;
        }

        const montant = parseFloat(form.montant);
        if (!montant || montant <= 0) {
            setError('Saisissez un montant de paiement valide');
            return;
        }

        setSaving(true);
        try {
            await api.post('/client-payments', {
                payment_date: form.payment_date,
                client_id: selectedRows[0]?.client_id ?? null,
                client_name: form.client_name || null,
                ville_chantier: form.ville_chantier || null,
                chantier_type: form.chantier_type || null,
                montant_total: parseFloat(form.montant_total) || 0,
                reglement: form.reglement || null,
                numero: form.numero || null,
                banque: form.banque || null,
                nom_tire: form.nom_tire || null,
                montant,
                order_ids: [...selectedIds],
            });
            resetForm();
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Impossible d\'enregistrer le paiement');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="glass-card p-4 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                {error && (
                    <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
                        {error}
                    </div>
                )}

                {editingPaymentId && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm border border-amber-100 dark:border-amber-800 flex items-center justify-between gap-3">
                        <span>Modification du paiement <strong>{form.reference}</strong> — seuls la date et les informations de règlement sont modifiables.</span>
                        <button type="button" onClick={resetForm} className="text-xs font-semibold underline shrink-0">Annuler</button>
                    </div>
                )}

                <ScrollAreaWithArrows variant="table">
                    <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-[110px_80px_minmax(105px,0.85fr)_minmax(88px,0.75fr)_96px_88px] gap-2 items-end min-w-[900px]">
                        <Field label="Date" compact>
                            <input type="date" required value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} className={inputCompact} />
                        </Field>
                        <Field label="Réf°" compact>
                            <input type="text" readOnly value={form.reference} className={readOnlyCompact} />
                        </Field>
                        <Field label="Nom Client">
                            <input type="text" readOnly value={form.client_name} placeholder="—" className={readOnlyCompact} />
                        </Field>
                        <Field label="Ville Chantier">
                            <input type="text" readOnly value={form.ville_chantier} placeholder="—" className={readOnlyCompact} />
                        </Field>
                        <Field label="Type Chantier" compact>
                            {selectedRows.length > 0 ? (
                                <input type="text" readOnly value={form.chantier_type || '—'} className={readOnlyCompact} />
                            ) : (
                                <select value={form.chantier_type} onChange={(e) => set('chantier_type', e.target.value)} className={inputCompact}>
                                    {CHANTIER_TYPE_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                                </select>
                            )}
                        </Field>
                        <Field label="Montant État" compact>
                            <input type="text" readOnly value={form.montant_total ? formatPlain(form.montant_total) : ''} className={readOnlyCompact} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-[minmax(74px,0.6fr)_minmax(64px,0.5fr)_minmax(100px,0.9fr)_minmax(110px,1fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(96px,0.85fr)] gap-2 items-end min-w-[900px]">
                        <Field label="Règlement" compact>
                            <select value={form.reglement} onChange={(e) => set('reglement', e.target.value)} className={inputCompact}>
                                {REGLEMENT_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="N°" compact>
                            <input type="text" value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="N°" className={inputCompact} />
                        </Field>
                        <Field label="Banque">
                            <input type="text" value={form.banque} onChange={(e) => set('banque', e.target.value)} placeholder="Banque" className={inputClass} />
                        </Field>
                        <Field label="Nom Tiré">
                            <input type="text" value={form.nom_tire} onChange={(e) => set('nom_tire', e.target.value)} placeholder="Nom tiré" className={inputClass} />
                        </Field>
                        <Field label="Montant Règlement" compact>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required={!editingPaymentId}
                                readOnly={!!editingPaymentId}
                                value={form.montant}
                                onChange={(e) => set('montant', e.target.value)}
                                placeholder="0.00"
                                className={editingPaymentId ? readOnlyCompact : inputCompact}
                            />
                        </Field>
                        <Field label="Montant Payé" compact>
                            <input type="text" readOnly value={form.montant_paye !== '' ? formatPlain(form.montant_paye) : ''} className={`${readOnlyCompact} !text-emerald-600 dark:!text-emerald-400 font-semibold`} />
                        </Field>
                        <Field label="Solde" compact>
                            <input
                                type="text"
                                readOnly
                                value={form.solde !== '' ? formatSoldePlain(form.solde) : ''}
                                className={`${readOnlyCompact} font-bold ${
                                    soldeTone(form.solde) === 'red'
                                        ? '!text-red-600 dark:!text-red-400'
                                        : soldeTone(form.solde) === 'green'
                                            ? '!text-emerald-600 dark:!text-emerald-400'
                                            : ''
                                }`}
                            />
                        </Field>
                    </div>
                </div>
                </ScrollAreaWithArrows>

                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="submit" disabled={saving || (!editingPaymentId && !selectedIds.size)} className="btn-primary text-sm">
                        <Save className="w-4 h-4" />
                        {saving ? 'Enregistrement...' : editingPaymentId ? 'Mettre à jour' : 'Enregistrer paiement'}
                    </button>
                    <button type="button" onClick={resetForm} className="btn-secondary text-sm">
                        Réinitialiser
                    </button>
                    <button type="button" onClick={load} disabled={loading} className="btn-secondary text-sm">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </button>
                </div>
            </form>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60 min-w-0">
                    <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 via-brand-navy to-indigo-800 border-b border-white/10">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">État d'exécution</h3>
                    </div>

                    <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                        <table className="w-full text-sm table-fixed">
                            <thead className="sticky top-0 z-10">                                <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                    <th className="px-2 py-3 w-9 text-center">
                                        <input
                                            type="checkbox"
                                            checked={rows.length > 0 && selectedIds.size === rows.length}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded border-slate-300 text-brand-navy focus:ring-brand-navy/30"
                                        />
                                    </th>
                                    {[
                                        { h: 'Date', w: 'w-[88px]' },
                                        { h: 'Réf°', w: 'w-[72px]' },
                                        { h: 'Nom Client', w: 'w-auto' },
                                        { h: 'Montant', w: 'w-[108px]' },
                                        { h: 'Montant Payé', w: 'w-[108px]' },
                                        { h: 'Solde', w: 'w-[96px]' },
                                    ].map(({ h, w }) => (
                                        <th key={h} className={`px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center ${w}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-2 py-3" />
                                            {[...Array(6)].map((__, j) => (
                                                <td key={j} className="px-2 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[72px]" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : rows.length ? (
                                    rows.map((row) => {
                                        const solde = rowSolde(row);
                                        const paye = Number(row.montant_paye) || 0;

                                        return (
                                            <tr
                                                key={row.id}
                                                className={`transition-colors ${selectedIds.has(row.id) ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}
                                            >
                                                <td className="px-2 py-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(row.id)}
                                                        onChange={() => toggleRow(row.id)}
                                                        className="w-4 h-4 rounded border-slate-300 text-brand-navy focus:ring-brand-navy/30"
                                                    />
                                                </td>
                                                <td className="px-2 py-2.5 text-center text-slate-600 dark:text-slate-300 text-xs">{row.order_date}</td>
                                                <td className="px-2 py-2.5 text-center font-mono text-[11px] font-semibold text-brand-navy dark:text-violet-400">{row.quote_reference || row.reference}</td>
                                                <td className="px-2 py-2.5 text-center font-medium text-slate-800 dark:text-white truncate">{row.client_name || '—'}</td>
                                                <td className="px-2 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-violet-400 text-xs">{formatMontant(row.montant ?? row.total_ttc)}</td>
                                                <td className="px-2 py-2.5 text-center font-semibold tabular-nums text-emerald-700 dark:text-emerald-300 text-xs">
                                                    {paye > 0 ? formatMontant(paye) : '—'}
                                                </td>
                                                <td className="px-2 py-2.5 text-center text-xs">
                                                    {paye > 0 ? <SoldeCell value={solde} /> : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                            Aucun bon d'exécution — validez un devis pour l'afficher ici
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </ScrollAreaWithArrows>
                </div>

                <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60 min-w-0">
                    <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 via-brand-navy to-indigo-800 border-b border-white/10">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Etat Règlement</h3>
                    </div>

                    <ScrollAreaWithArrows variant="table" deps={[reglementRows.length, loading]}>
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">                                <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                    {['Type', 'N°', 'Banque', 'Nom Tiré', 'Date Encais', 'Actions'].map((h) => (
                                        <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    [...Array(2)].map((_, i) => (
                                        <tr key={i}>
                                            {[...Array(6)].map((__, j) => (
                                                <td key={j} className="px-3 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[72px]" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : reglementRows.length ? (
                                    reglementRows.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                            <td className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-200 font-semibold text-xs">{p.reglement || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 text-xs">{p.numero || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 text-xs truncate max-w-[100px]">{p.banque || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 text-xs truncate max-w-[120px]">{p.nom_tire || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">{p.payment_date || '—'}</td>
                                            <td className="px-1 py-2">
                                                <div className="flex items-center justify-center gap-0.5 flex-nowrap">
                                                    {renderPaymentActions(p.payment_id)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                                            {selectedRows.length ? 'Aucun règlement pour cette ligne' : 'Sélectionnez une ligne pour voir les règlements'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </ScrollAreaWithArrows>
                </div>
            </div>

            {viewPayment && (
                <ViewPaymentModal
                    payment={viewPayment}
                    onClose={() => setViewPayment(null)}
                    onPrint={handlePrintPayment}
                />
            )}
        </div>
    );
}
