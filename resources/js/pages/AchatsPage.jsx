import { useEffect, useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const formatMontant = (n) => {
    const v = Math.round(Number(n) || 0);
    return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
};

export default function AchatsPage() {
    const [orders, setOrders] = useState({ data: [] });

    useEffect(() => {
        api.get('/purchase-orders').then((r) => setOrders(r.data));
    }, []);

    const validate = async (id) => {
        await api.post(`/purchase-orders/${id}/validate`);
        api.get('/purchase-orders').then((r) => setOrders(r.data));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des achats</h1>
                    <p className="text-slate-500 text-sm">Bons d'achat et historique fournisseurs</p>
                </div>
                <button className="btn-primary"><Plus className="w-4 h-4" /> Nouveau bon d'achat</button>
            </div>

            <div className="glass-card overflow-hidden shadow-card">
                <ScrollAreaWithArrows maxHeight="min(55vh, 520px)" deps={[orders.data?.length]}>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase text-slate-500">
                        <tr>
                            <th className="px-5 py-3 text-left">N° Bon</th>
                            <th className="px-5 py-3 text-left">Date</th>
                            <th className="px-5 py-3 text-left">Fournisseur</th>
                            <th className="px-5 py-3 text-left">Chantier</th>
                            <th className="px-5 py-3 text-right">Total TTC</th>
                            <th className="px-5 py-3 text-center">Statut</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {orders.data?.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="px-5 py-3 font-mono font-medium">{o.reference}</td>
                                <td className="px-5 py-3">{o.order_date}</td>
                                <td className="px-5 py-3">{o.supplier?.name}</td>
                                <td className="px-5 py-3">{o.chantier?.name || '—'}</td>
                                <td className="px-5 py-3 text-right font-semibold">{formatMontant(o.total_ttc)}</td>
                                <td className="px-5 py-3 text-center">
                                    <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">{o.status}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    {o.status === 'en_attente' && (
                                        <button onClick={() => validate(o.id)} className="text-emerald-600 hover:text-emerald-700" title="Valider">
                                            <CheckCircle className="w-5 h-5 inline" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
