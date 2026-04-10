import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ArrowLeftRight, Landmark,
  PiggyBank, LogOut, User, ChevronRight, FileText
} from 'lucide-react'


const navItems = [
  { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions',    icon: ArrowLeftRight },
  { id: 'dettes',       label: 'Dettes',          icon: Landmark },
  { id: 'budgets',      label: 'Budgets',         icon: PiggyBank },
  { id: 'rapport',      label: 'Rapports',        icon: FileText},
  { id: 'factures',     label: 'Factures',        icon: FileText },
  { id: 'profil',       label: 'Mon Profil',      icon: User },
]

export default function Layout({ page, setPage, children }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-base-200">

      {/* ── Sidebar ── */}
      <aside className="w-64 min-h-screen bg-base-100 border-r border-base-300 flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-base-300">
          <div className="text-2xl font-black text-warning tracking-tight">CheickFin</div>
          <p className="text-xs text-base-content/40 mt-1">Gestion financière</p>
        </div>

        {/* Navigation */}
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

        {/* User info + logout */}
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
      <main className="flex-1 p-8 overflow-auto">
        
        {children}
      </main>
    </div>
  )
}
