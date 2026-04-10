import { useState, useEffect, useCallback } from 'react'
import { transactionAPI, detteAPI, categorieAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { TrendingUp, TrendingDown, Wallet, Landmark, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, PlusCircle } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend } from 'recharts'

const FORM_EMPTY = {
  type: 'entree', description: '', montant: '',
  categorie: '', date: new Date().toISOString().split('T')[0], statut: 'confirme'
}


const getSixDerniersMois = () => {
  const mois = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    mois.push({
      mois: d.getMonth() + 1,
      annee: d.getFullYear(),
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    })
  }
  return mois
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [resume, setResume] = useState(null)
  const [detteStats, setDetteStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_EMPTY)
  const [saving, setSaving] = useState(false)
  const [refresh, setRefresh] = useState(0)

  // -- Données graphiques --
  const [donneesMois, setDonneesMois] = useState([])
  const [donneesJour, setDonneesJour] = useState([])

  const load = useCallback(async () => {
    const now = new Date()
    try {
      // Chargements principaux
      const [r, d, t, c] = await Promise.all([
        transactionAPI.resume({ mois: now.getMonth() + 1, annee: now.getFullYear() }),
        detteAPI.stats(),
        transactionAPI.list({ ordering: '-date' }),
        categorieAPI.list(),
      ])
      setResume(r.data)
      setDetteStats(d.data)
      const liste = Array.isArray(t.data) ? t.data : (t.data.results || [])
      setTransactions(liste.slice(0, 5))
      setCategories(c.data)

      // ── Graphique 1 : 6 derniers mois ──
      const sixMois = getSixDerniersMois()
      const donneesMoisData = await Promise.all(
        sixMois.map(async (m) => {
          try {
            const res = await transactionAPI.resume({ mois: m.mois, annee: m.annee })
            return {
              label: m.label,
              Revenus: Number(res.data.total_entrees || 0),
              Dépenses: Number(res.data.total_sorties || 0),
            }
          } catch {
            return { label: m.label, Revenus: 0, Dépenses: 0 }
          }
        })
      )
      setDonneesMois(donneesMoisData)

      // -- Graphique 2 : flux journalier 30 jours --
      try {
        const flux = await transactionAPI.fluxJournalier({ jours: 30 })
        const entreeMap = {}
        const sortieMap = {}
        ;(flux.data.entrees || []).forEach(e => {
          entreeMap[e.jour] = Number(e.total || 0)
        })
        ;(flux.data.sorties || []).forEach(s => {
          sortieMap[s.jour] = Number(s.total || 0)
        })
        const allJours = [...new Set([
          ...Object.keys(entreeMap),
          ...Object.keys(sortieMap)
        ])].sort()
        const donneesJourData = allJours.map(j => ({
          label: new Date(j).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          Entrées: entreeMap[j] || 0,
          Sorties: sortieMap[j] || 0,
        }))
        setDonneesJour(donneesJourData)
      } catch (e) {
        console.error('flux_journalier:', e)
      }

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refresh])

  const handleAdd = async () => {
    if (!form.description || !form.montant || !form.date) {
      alert('Description, montant et date sont obligatoires')
      return
    }
    setSaving(true)
    try {
      await transactionAPI.create({
        type: form.type,
        description: form.description,
        montant: Number(form.montant),
        categorie: form.categorie || null,
        date: form.date,
        statut: form.statut,
      })
      document.getElementById('modal_dash_transaction').close()
      setForm(FORM_EMPTY)
      setRefresh(r => r + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const categoriesFiltrees = categories.filter(c => c.type === form.type)
  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
  const now = new Date()
  const moisNom = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const fmtTooltip = (value) => [Number(value).toLocaleString('fr-FR') + ' FCFA']

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="loading loading-spinner loading-lg text-warning" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      {/* ── Titre + bouton ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Bonjour, {user?.prenom || user?.nom}</h1>
          <p className="text-base-content/50 text-sm mt-1">Résumé de {moisNom}</p>
        </div>
        <button
          className="btn btn-warning"
          onClick={() => document.getElementById('modal_dash_transaction').showModal()}
        >
          <PlusCircle className="w-4 h-4" />
          Ajouter transaction
        </button>
      </div>

      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-5 gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/50 uppercase tracking-wide">Solde</span>
              <Wallet className="w-4 h-4 text-warning" />
            </div>
            <div className={`text-xl font-black ${(resume?.solde || 0) >= 0 ? 'text-success' : 'text-error'}`}>
              {fmt(resume?.solde)}
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-5 gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/50 uppercase tracking-wide">Revenus</span>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div className="text-xl font-black text-success">+{fmt(resume?.total_entrees)}</div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-5 gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/50 uppercase tracking-wide">Dépenses</span>
              <TrendingDown className="w-4 h-4 text-error"/>
            </div>
            <div className="text-xl font-black text-error">-{fmt(resume?.total_sorties)}</div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-5 gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/50 uppercase tracking-wide">Dettes</span>
              <Landmark className="w-4 h-4 text-info" />
            </div>
            <div className="text-xl font-black text-info">{fmt(detteStats?.total_dettes)}</div>
            {detteStats?.echeances_proches > 0 && (
              <div className="flex items-center gap-1 text-xs text-warning">
                <AlertTriangle className="w-3 h-3" />
                {detteStats.echeances_proches} échéance(s) proche(s)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Graphiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Courbe 6 derniers mois */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="font-bold text-lg mb-2">Revenus vs Dépenses — 6 mois</h2>
            {donneesMois.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-base-content/40">
                Pas de données
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={donneesMois}>
                  <defs>
                    <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000) + 'k'} />
                  <Tooltip formatter={fmtTooltip} />
                  <Legend/>
                  <Area type="monotone" dataKey="Revenus" stroke="#22c55e" fill="url(#colorRevenus)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" fill="url(#colorDepenses)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Barres flux journalier */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="font-bold text-lg mb-2">Flux journalier — 30 jours</h2>
            {donneesJour.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-base-content/40">
                Pas de données
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={donneesJour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000) + 'k'} />
                  <Tooltip formatter={fmtTooltip} />
                  <Legend />
                  <Bar dataKey="Entrées" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Sorties" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── 5 Dernières transactions ── */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">5 dernières transactions</h2>
            <span className="badge badge-soft badge-warning">
              {resume?.nb_transactions || 0} ce mois
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Catégorie</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-base-content/40 py-6">
                      Aucune transaction
                    </td>
                  </tr>
                )}
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.description}</td>
                    <td className="text-base-content/60">{t.categorie_detail?.nom || '—'}</td>
                    <td className="text-base-content/60 text-sm">
                      {new Date(t.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <span className={`font-bold flex items-center gap-1 ${t.type === 'entree' ? 'text-success' : 'text-error'}`}>
                        {t.type === 'entree' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {t.type === 'entree' ? '+' : '-'}{Number(t.montant).toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-soft text-xs ${
                        t.statut === 'confirme' ? 'badge-success' :
                        t.statut === 'en_attente' ? 'badge-warning' : 'badge-error'
                      }`}>
                        {t.statut === 'confirme' ? 'Confirmé' : t.statut === 'en_attente' ? 'En attente' : 'Annulée'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal ajout transaction ── */}
      <dialog id="modal_dash_transaction" className="modal backdrop-blur">
        <div className="modal-box border border-base-300">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg mb-4">Ajouter une transaction</h3>
          <div className="flex flex-col gap-3">

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Type</label>
              <select className="select w-full" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, categorie: '' })}>
                <option value="entree">Entrée (Revenu)</option>
                <option value="sortie">Sortie (Dépense)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Description *</label>
              <input type="text" className="input w-full"
                placeholder="Ex: Vente client Alpha SARL"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Montant (FCFA) *</label>
              <input type="number" className="input w-full" placeholder="Ex: 850000"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Catégorie</label>
              <select className="select w-full" value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                <option value="">-- Choisir une catégorie --</option>
                {categoriesFiltrees.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Date *</label>
              <input type="date" className="input w-full"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Statut</label>
              <select className="select w-full" value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                <option value="confirme">Confirmé</option>
                <option value="en_attente">En attente</option>
                <option value="annulé">Annulée</option>
              </select>
            </div>

            <button className="btn btn-warning w-full mt-2" onClick={handleAdd} disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-sm" /> : 'Enregistrer la transaction'}
            </button>
          </div>
        </div>
      </dialog>

    </div>
  )
}
