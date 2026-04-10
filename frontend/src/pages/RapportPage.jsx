import { useState, useEffect, useCallback } from 'react'
import { transactionAPI, budgetAPI } from '../api/services'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { FileText, Mail, Sparkles, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const MOIS_NOMS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

const COULEURS_PIE = ['#f59e0b','#3b82f6','#22c55e','#ef4444','#8b5cf6','#06b6d4','#ec4899']

const getSixDerniersMois = (mois, annee) => {
  const result = []
  for (let i = 5; i >= 0; i--) {
    let m = mois - i
    let a = annee
    if (m <= 0) { m += 12; a -= 1 }
    result.push({
      mois: m, annee: a,
      label: new Date(a, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    })
  }
  return result
}

export default function RapportPage() {
  const now = new Date()
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)

  const [resume, setResume]           = useState(null)
  const [resumePrecedent, setResumePrecedent] = useState(null)
  const [donneesMois, setDonneesMois] = useState([])
  const [depensesParCat, setDepensesParCat] = useState([])
  const [transactions, setTransactions] = useState([])
  const [analyseIA, setAnalyseIA]     = useState(null)

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')
  const fmtTooltip = (v) => [fmt(v) + ' FCFA']

  const load = useCallback(async () => {
    setLoading(true)
    setAnalyseIA(null)
    try {
      // Mois précédent
      let moisPrec = mois - 1, anneePrec = annee
      if (moisPrec <= 0) { moisPrec = 12; anneePrec -= 1 }

      const [r, rPrec, t] = await Promise.all([
        transactionAPI.resume({ mois, annee }),
        transactionAPI.resume({ mois: moisPrec, annee: anneePrec }),
        transactionAPI.list({ ordering: '-date', mois, annee }),
      ])
      setResume(r.data)
      setResumePrecedent(rPrec.data)
      const liste = Array.isArray(t.data) ? t.data : (t.data.results || [])
      setTransactions(liste)

      // Courbe 6 mois
      const sixMois = getSixDerniersMois(mois, annee)
      const courbe = await Promise.all(
        sixMois.map(async (m) => {
          try {
            const res = await transactionAPI.resume({ mois: m.mois, annee: m.annee })
            return {
              label: m.label,
              Revenus: Number(res.data.total_entrees || 0),
              Dépenses: Number(res.data.total_sorties || 0),
            }
          } catch { return { label: m.label, Revenus: 0, Dépenses: 0 } }
        })
      )
      setDonneesMois(courbe)

      // Dépenses par catégorie
      const sortiesListe = liste.filter(t => t.type === 'sortie')
      const parCat = {}
      sortiesListe.forEach(t => {
        const nom = t.categorie_detail?.nom || 'Autre'
        parCat[nom] = (parCat[nom] || 0) + Number(t.montant)
      })
      const totalSorties = Object.values(parCat).reduce((a, b) => a + b, 0)
      setDepensesParCat(
        Object.entries(parCat)
          .map(([nom, val]) => ({
            nom,
            valeur: val,
            pct: totalSorties ? Math.round((val / totalSorties) * 100) : 0
          }))
          .sort((a, b) => b.valeur - a.valeur)
      )

      // ── Analyse IA ──
      const entrees = Number(r.data.total_entrees || 0)
      const sorties = Number(r.data.total_sorties || 0)
      const solde = entrees - sorties
      const entreesPrec = Number(rPrec.data.total_entrees || 0)
      const sortiesPrec = Number(rPrec.data.total_sorties || 0)
      const marge = entrees > 0 ? Math.round((solde / entrees) * 100) : 0

      // Point d'attention = catégorie avec le plus de dépenses
      const topCat = Object.entries(parCat).sort((a, b) => b[1] - a[1])[0]

      // Prévision = tendance simple
      const tendanceEntrees = entreesPrec > 0 ? ((entrees - entreesPrec) / entreesPrec) : 0
      const previsionEntrees = Math.round(entrees * (1 + tendanceEntrees * 0.5))
      const previsionSolde = Math.round(previsionEntrees - sorties * 1.02)

      setAnalyseIA({
        solde,
        marge,
        topCat: topCat ? topCat[0] : null,
        topCatPct: topCat && totalSorties ? Math.round((topCat[1] / totalSorties) * 100) : 0,
        previsionSolde,
        moisSuivant: MOIS_NOMS[mois % 12],
        tendance: tendanceEntrees > 0 ? 'hausse' : tendanceEntrees < 0 ? 'baisse' : 'stable',
      })

    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [mois, annee])

  useEffect(() => { load() }, [load])

  const varPct = (val, ref) => {
    if (!ref || ref === 0) return null
    const p = Math.round(((val - ref) / ref) * 100)
    return p
  }

  const revVar = varPct(resume?.total_entrees, resumePrecedent?.total_entrees)
  const depVar = varPct(resume?.total_sorties, resumePrecedent?.total_sorties)

  return (
    <div className="flex flex-col gap-6">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black">
            Rapport Mensuel — {MOIS_NOMS[mois - 1]} {annee}
          </h1>
          <p className="text-base-content/50 text-sm mt-1">
            Généré automatiquement · Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Sélecteur mois/année */}
          <select className="select select-sm w-36"
            value={mois} onChange={e => setMois(Number(e.target.value))}>
            {MOIS_NOMS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="select select-sm w-24"
            value={annee} onChange={e => setAnnee(Number(e.target.value))}>
            {['2024','2025','2026','2027'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button className="btn btn-sm btn-warning" onClick={() => window.print()}>
            <FileText className="w-4 h-4" /> Exporter PDF
          </button>
          <button className="btn btn-sm btn-outline">
            <Mail className="w-4 h-4" /> Envoyer par mail
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <span className="loading loading-spinner loading-lg text-warning" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5 gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-base-content/50 uppercase">Solde</span>
                  <Wallet className="w-4 h-4 text-warning" />
                </div>
                <div className={`text-xl font-black ${(resume?.solde || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                  {fmt(resume?.solde)} FCFA
                </div>
              </div>
            </div>
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5 gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-base-content/50 uppercase">Revenus</span>
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div className="text-xl font-black text-success">+{fmt(resume?.total_entrees)} FCFA</div>
                {revVar !== null && (
                  <span className={`text-xs ${revVar >= 0 ? 'text-success' : 'text-error'}`}>
                    {revVar >= 0 ? '▲' : '▼'} {Math.abs(revVar)}% vs mois dernier
                  </span>
                )}
              </div>
            </div>
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5 gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-base-content/50 uppercase">Dépenses</span>
                  <TrendingDown className="w-4 h-4 text-error" />
                </div>
                <div className="text-xl font-black text-error">-{fmt(resume?.total_sorties)} FCFA</div>
                {depVar !== null && (
                  <span className={`text-xs ${depVar <= 0 ? 'text-success' : 'text-error'}`}>
                    {depVar >= 0 ? '▲' : '▼'} {Math.abs(depVar)}% vs mois dernier
                  </span>
                )}
              </div>
            </div>
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5 gap-1">
                <span className="text-xs text-base-content/50 uppercase">Transactions</span>
                <div className="text-xl font-black">{resume?.nb_transactions || 0}</div>
                <span className="text-xs text-base-content/40">ce mois</span>
              </div>
            </div>
          </div>

          {/* ── Graphiques ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Courbe 6 mois */}
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="font-bold mb-2">Revenus vs Dépenses (6 derniers mois)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={donneesMois}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v/1000)+'k'} />
                    <Tooltip formatter={fmtTooltip} />
                    <Legend />
                    <Area type="monotone" dataKey="Revenus" stroke="#22c55e" fill="url(#gRev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" fill="url(#gDep)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Camembert catégories */}
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="font-bold mb-2">Dépenses par catégorie</h2>
                {depensesParCat.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-base-content/40">
                    Pas de dépenses ce mois
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie
                          data={depensesParCat}
                          dataKey="valeur"
                          nameKey="nom"
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85}
                        >
                          {depensesParCat.map((_, i) => (
                            <Cell key={i} fill={COULEURS_PIE[i % COULEURS_PIE.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [fmt(v) + ' FCFA']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 flex-1">
                      {depensesParCat.slice(0, 5).map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COULEURS_PIE[i % COULEURS_PIE.length] }} />
                          <span className="truncate flex-1">{c.nom}</span>
                          <span className="font-bold text-xs">{c.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Bilan IA ── */}
          {analyseIA && (
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-warning" />
                  <h2 className="font-bold text-lg">Bilan synthétique — Analyse FinTrack IA</h2>
                  <span className="badge badge-warning badge-soft ml-auto">IA</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* Résultat net */}
                  <div className="bg-base-200 rounded-xl p-4">
                    <div className="text-xs text-base-content/50 uppercase mb-2">Résultat net</div>
                    <div className={`text-2xl font-black ${analyseIA.solde >= 0 ? 'text-success' : 'text-error'}`}>
                      {analyseIA.solde >= 0 ? '+' : ''}{fmt(analyseIA.solde)}<br/>
                      <span className="text-sm font-normal">FCFA</span>
                    </div>
                    <div className="text-xs text-base-content/50 mt-2">
                      {analyseIA.solde >= 0
                        ? `Solide. Marge de ${analyseIA.marge}%.`
                        : `Déficit. Réduisez les dépenses.`
                      }
                    </div>
                  </div>

                  {/* Point d'attention */}
                  <div className="bg-base-200 rounded-xl p-4">
                    <div className="text-xs text-base-content/50 uppercase mb-2">Point d'attention</div>
                    {analyseIA.topCat ? (
                      <>
                        <div className="text-warning font-bold text-base">
                          {analyseIA.topCat} représente {analyseIA.topCatPct}% des dépenses
                        </div>
                        <div className="text-xs text-base-content/50 mt-2">
                          {analyseIA.topCatPct > 40
                            ? 'Concentration élevée. Envisagez de réduire.'
                            : 'Dans les normes habituelles.'}
                        </div>
                      </>
                    ) : (
                      <div className="text-base-content/40 text-sm">Aucune dépense ce mois</div>
                    )}
                  </div>

                  {/* Prévision mois suivant */}
                  <div className="bg-base-200 rounded-xl p-4">
                    <div className="text-xs text-base-content/50 uppercase mb-2">
                      Prévision {analyseIA.moisSuivant}
                    </div>
                    <div className={`text-2xl font-black ${analyseIA.previsionSolde >= 0 ? 'text-success' : 'text-error'}`}>
                      {analyseIA.previsionSolde >= 0 ? '+' : ''}{fmt(analyseIA.previsionSolde)}<br/>
                      <span className="text-sm font-normal">FCFA</span>
                    </div>
                    <div className="text-xs text-base-content/50 mt-2">
                      Basé sur les tendances {analyseIA.tendance === 'hausse' ? 'en hausse' : analyseIA.tendance === 'baisse' ? 'en baisse' : 'stables'}.
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ── Tableau transactions du mois ── */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="font-bold text-lg mb-2">
                Transactions de {MOIS_NOMS[mois - 1]} {annee}
                <span className="text-base-content/40 text-sm font-normal ml-2">
                  ({transactions.length} au total)
                </span>
              </h2>
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
                          Aucune transaction ce mois
                        </td>
                      </tr>
                    )}
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td className="font-medium">{t.description}</td>
                        <td className="text-base-content/60">{t.categorie_detail?.nom || '—'}</td>
                        <td className="text-sm text-base-content/60">
                          {new Date(t.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td>
                          <span className={`font-bold ${t.type === 'entree' ? 'text-success' : 'text-error'}`}>
                            {t.type === 'entree' ? '+' : '-'}{fmt(t.montant)} FCFA
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-soft text-xs ${
                            t.statut === 'confirme' ? 'badge-success' :
                            t.statut === 'en_attente' ? 'badge-warning' : 'badge-error'
                          }`}>
                            {t.statut === 'confirme' ? 'Confirmé' :
                             t.statut === 'en_attente' ? 'En attente' : 'Annulée'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
