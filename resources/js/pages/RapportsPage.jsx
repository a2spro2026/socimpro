import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import api from '../lib/api';
import { formatMontant } from './devis/devisUtils';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function RapportsPage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/reports/financial').then((r) => setData(r.data));
    }, []);

    const chartData = {
        labels: data?.chantiers?.map((c) => c.name) || [],
        datasets: [
            { label: 'Recettes', data: data?.chantiers?.map((c) => c.recettes) || [], backgroundColor: '#1E3A8A' },
            { label: 'Dépenses', data: data?.chantiers?.map((c) => c.depenses) || [], backgroundColor: '#F97316' },
            { label: 'Bénéfice', data: data?.chantiers?.map((c) => c.benefice) || [], backgroundColor: '#10B981' },
        ],
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rapports & Statistiques</h1>
                    <p className="text-slate-500 text-sm">Rentabilité et analyses financières</p>
                </div>
                <a href="/api/reports/export/chantiers?format=csv" className="btn-secondary text-sm">Export CSV</a>
            </div>

            <div className="glass-card p-5 h-80 shadow-card">
                <h3 className="font-semibold mb-4">Rentabilité par chantier</h3>
                <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>

            <div className="glass-card rounded-2xl shadow-card">
                <ScrollAreaWithArrows variant="table" deps={[data?.chantiers?.length]}>
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/95 text-xs font-bold uppercase text-slate-500 backdrop-blur-sm">
                        <tr>
                            <th className="px-5 py-3 text-left">Chantier</th>
                            <th className="px-5 py-3 text-right">Budget</th>
                            <th className="px-5 py-3 text-right">Recettes</th>
                            <th className="px-5 py-3 text-right">Dépenses</th>
                            <th className="px-5 py-3 text-right">Bénéfice</th>
                            <th className="px-5 py-3 text-right">Rentabilité</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data?.chantiers?.map((c) => (
                            <tr key={c.id}>
                                <td className="px-5 py-3 font-medium">{c.name}</td>
                                <td className="px-5 py-3 text-right">{formatMontant(c.budget)}</td>
                                <td className="px-5 py-3 text-right text-emerald-600">{formatMontant(c.recettes)}</td>
                                <td className="px-5 py-3 text-right text-red-500">{formatMontant(c.depenses)}</td>
                                <td className="px-5 py-3 text-right font-semibold">{formatMontant(c.benefice)}</td>
                                <td className="px-5 py-3 text-right"><span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">{c.rentabilite}%</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
