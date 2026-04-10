import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import DettesPage from './pages/DettesPage'
import BudgetsPage from './pages/BudgetsPage'
import RapportPage from './pages/RapportPage'
import ProfilPage from './pages/ProfilPage'
import FacturePage from './pages/FacturePage'

function AppContent() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [authPage, setAuthPage] = useState('login')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner loading-lg text-warning" />
        <p className="text-base-content/50">Chargement...</p>
      </div>
    </div>
  )

  if (!user) {
    return authPage === 'login'
      ? <LoginPage onSwitch={() => setAuthPage('register')} />
      : <RegisterPage onSwitch={() => setAuthPage('login')} />
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <DashboardPage />
      case 'transactions': return <TransactionsPage />
      case 'dettes':       return <DettesPage />
      case 'budgets':      return <BudgetsPage />
      case 'rapport':      return <RapportPage/>
      case 'profil':       return <ProfilPage />
      case 'factures':     return <FacturePage />

      default:             return <DashboardPage />
    }
  }

  return (
    <Layout page={page} setPage={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
