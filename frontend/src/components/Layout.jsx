import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ArrowLeftRight, Landmark,
  PiggyBank, LogOut, User, ChevronRight, FileText, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'dettes',       label: 'Dettes',       icon: Landmark },
  { id: 'budgets',      label: 'Budgets',      icon: PiggyBank },
  { id: 'rapport',      label: 'Rapports',     icon: FileText },
  { id: 'factures',     label: 'Factures',     icon: FileText },
  { id: 'profil',       label: 'Profil',       icon: User },
]

export default function Layout({ page, setPage, children }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-base-200">

      {/* ── Sidebar desktop (cachée sur mobile) ── */}
      <aside className="hidden md:flex w-64 min-h-screen bg-base-100 border-r border-base-300 flex-col">
        <div className="p-6 border-b border-base-300">
          <div className="text-2xl font-black text-warning tracking-tight">CheickFin</div>
          <p className="text-xs text-base-content/40 mt-1">Gestion financière</p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left
                ${page === id
                  ? 'bg-warning text-warning-content'
                  : 'hover:bg-base-200 text-base-content/70 hover:text-base-content'
                }`}
            >
              <Icon className="w-5 h-5" />
              {label}
              {page === id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-base-300 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2">
            <div className="avatar placeholder">
              <div className="bg-warning/20 text-warning rounded-full w-9">
                <span className="text-sm font-bold">
                  {user?.nom?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.nom}</p>
              <p className="text-xs text-base-content/40 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm w-full justify-start gap-2 text-error"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-base-100 border-b border-base-300">
          <div className="text-xl font-black text-warning">CheickFin</div>
          <div className="flex items-center gap-2">
            <div className="bg-warning/20 text-warning rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-sm font-bold">
                {user?.nom?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="btn btn-ghost btn-sm btn-square">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Menu mobile déroulant */}
        {menuOpen && (
          <div className="md:hidden bg-base-100 border-b border-base-300 p-4 flex flex-col gap-1 z-50">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setPage(id); setMenuOpen(false) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left
                  ${page === id
                    ? 'bg-warning text-warning-content'
                    : 'hover:bg-base-200 text-base-content/70'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm w-full justify-start gap-2 text-error mt-2"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        )}

        {/* Contenu */}
        <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
          {children}
        </main>

        {/* ── Barre de navigation mobile en bas ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 z-40">
          <div className="flex justify-around items-center py-2">
            {navItems.slice(0, 5).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all
                  ${page === id ? 'text-warning' : 'text-base-content/50'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </div>
  )
}
