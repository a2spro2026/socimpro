import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChantiersPage from './pages/ChantiersPage';
import BonAchatsPage from './pages/BonAchatsPage';
import BonVentesPage from './pages/BonVentesPage';
import ReglementFournisseurPage from './pages/ReglementFournisseurPage';
import ReglementClientPage from './pages/ReglementClientPage';
import StockMatierePremierePage from './pages/StockMatierePremierePage';
import BonProductionPage from './pages/BonProductionPage';
import StockProduitFiniPage from './pages/StockProduitFiniPage';
import GenericListPage from './pages/GenericListPage';
import ModulePage from './pages/ModulePage';
import FicheFournisseurPage from './pages/FicheFournisseurPage';
import FicheClientPage from './pages/FicheClientPage';
import BonExecutionListPage from './pages/clients/BonExecutionListPage';
import ClientBalancePage from './pages/clients/ClientBalancePage';
import DevisListPage from './pages/devis/DevisListPage';
import DevisFormPage from './pages/devis/DevisFormPage';
import TransactionsPage from './pages/TransactionsPage';
import ChargesPage from './pages/ChargesPage';
import FactureAchatsPage from './pages/FactureAchatsPage';
import FactureVentesPage from './pages/FactureVentesPage';
import SupplierBalancePage from './pages/SupplierBalancePage';
import UtilisateursPage from './pages/UtilisateursPage';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="w-10 h-10 border-4 border-brand-navy border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

const employeeCols = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'name', label: 'Nom', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'position', label: 'Poste' },
    { key: 'monthly_salary', label: 'Salaire', render: (r) => `${r.monthly_salary}` },
    { key: 'status', label: 'Statut' },
];

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />

                {/* Fournisseur */}
                <Route path="fournisseurs/fiches" element={<FicheFournisseurPage />} />
                <Route path="fournisseurs/bons-achats" element={<BonAchatsPage />} />
                <Route path="fournisseurs/bons-commande" element={<Navigate to="/fournisseurs/bons-achats" replace />} />
                <Route path="fournisseurs/balance" element={<SupplierBalancePage />} />
                <Route path="fournisseurs/releve-compte" element={<ModulePage />} />

                {/* Client */}
                <Route path="clients/fiches" element={<FicheClientPage />} />
                <Route path="clients/bons-de-vente" element={<BonVentesPage />} />
                <Route path="clients/devis/nouveau" element={<DevisFormPage />} />
                <Route path="clients/devis/:id" element={<DevisFormPage />} />
                <Route path="clients/devis" element={<DevisListPage />} />
                <Route path="clients/bons-vente" element={<BonExecutionListPage />} />
                <Route path="clients/reglements-vente" element={<ReglementClientPage />} />
                <Route path="clients/reglements" element={<ReglementClientPage />} />
                <Route path="clients/factures-ventes" element={<Navigate to="/facturation/factures-ventes" replace />} />
                <Route path="clients/reglements-factures" element={<ModulePage />} />
                <Route path="clients/balance" element={<ClientBalancePage />} />
                <Route path="clients/releve-compte" element={<ModulePage />} />

                {/* Facturation */}
                <Route path="facturation/factures-achats" element={<FactureAchatsPage />} />
                <Route path="facturation/depot-a" element={<Navigate to="/facturation/factures-achats" replace />} />
                <Route path="facturation/depot-b" element={<Navigate to="/facturation/factures-achats" replace />} />
                <Route path="facturation/reglement" element={<ReglementFournisseurPage />} />
                <Route path="facturation/factures-ventes" element={<FactureVentesPage />} />
                <Route path="facturation/reglements" element={<ReglementClientPage />} />
                <Route path="facturation/balance" element={<ModulePage />} />
                <Route path="fournisseurs/reglements-achats" element={<ReglementFournisseurPage />} />

                {/* Stock */}
                <Route path="stock/produits" element={<Navigate to="/stock/matiere-premiere" replace />} />
                <Route path="stock/mouvements" element={<ModulePage />} />
                <Route path="stock/bon-production" element={<BonProductionPage />} />
                <Route path="stock/etat-production" element={<Navigate to="/stock/produit-fini" replace />} />
                <Route path="stock/matiere-premiere" element={<StockMatierePremierePage />} />
                <Route path="stock/produit-fini" element={<StockProduitFiniPage />} />
                <Route path="stock/fiscal" element={<Navigate to="/stock/matiere-premiere" replace />} />

                {/* Chantiers */}
                <Route path="chantiers/carte" element={<ChantiersPage />} />
                <Route path="chantiers/bons-commande" element={<Navigate to="/fournisseurs/bons-achats" replace />} />
                <Route path="chantiers/suivi-depenses" element={<ModulePage />} />

                {/* Personnel */}
                <Route path="personnel/fiches" element={<GenericListPage title="Fiche Personnel" subtitle="Gestion des employés" endpoint="/employees" columns={employeeCols} />} />
                <Route path="personnel/etat-paiement" element={<ModulePage />} />

                {/* Suivi Monétaire */}
                <Route path="monetaire/transactions" element={<TransactionsPage />} />
                <Route path="monetaire/charges" element={<ChargesPage />} />
                <Route path="monetaire/salaires" element={<ModulePage />} />
                <Route path="monetaire/tresorerie" element={<ModulePage />} />

                {/* Configuration */}
                <Route path="configuration/utilisateurs" element={<UtilisateursPage />} />

                {/* Redirections anciennes routes */}
                <Route path="chantiers" element={<Navigate to="/chantiers/carte" replace />} />
                <Route path="achats" element={<Navigate to="/fournisseurs/bons-achats" replace />} />
                <Route path="stock" element={<Navigate to="/stock/matiere-premiere" replace />} />
                <Route path="fournisseurs" element={<Navigate to="/fournisseurs/fiches" replace />} />
                <Route path="clients" element={<Navigate to="/clients/fiches" replace />} />
                <Route path="personnel" element={<Navigate to="/personnel/fiches" replace />} />
                <Route path="paiements" element={<Navigate to="/monetaire/tresorerie" replace />} />
                <Route path="parametres" element={<Navigate to="/configuration/utilisateurs" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter basename="/app">
                    <AppRoutes />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}
