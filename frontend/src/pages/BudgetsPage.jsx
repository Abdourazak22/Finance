import { useState, useEffect } from 'react'
import { budgetAPI, categorieAPI } from '../api/services'
import { PlusCircle, Trash, Pencil, PiggyBank, AlertTriangle } from 'lucide-react'

const now = new Date()
const EMPTY = {
  categorie: '', montant: '', periode: 'mensuel',
  mois: now.getMonth() + 1, annee: now.getFullYear()
}

export default function BudgetsPage() {
  const [suivi, setSuivi] = useState([])
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())

  const load = async () => {
    try {
      const [b, s, c] = await Promise.all([
        budgetAPI.list(),
        budgetAPI.suivi({ mois, annee }),
        categorieAPI.sorties(),
      ])
      setBudgets(b.data)
      setSuivi(s.data)
      setCategories(c.data)
    } catch (e) { console.error(e) }
  }

 /* useEffect(() => { load() }, [mois, annee])*/

 useEffect(() => {
  // Catégories chargées une seule fois
  categorieAPI.sorties()
    .then(res => setCategories(res.data))
    .catch(e => console.error(e))
}, [])  // ← tableau vide = une seule fois

useEffect(() => {
  // Budgets et suivi rechargés quand mois/année changent
  const loadBudgets = async () => {
    try {
      const [b, s] = await Promise.all([
        budgetAPI.list(),
        budgetAPI.suivi({ mois, annee }),
      ])
      setBudgets(b.data)
      setSuivi(s.data)
    } catch (e) { console.error(e) }
  }
  loadBudgets()
}, [mois, annee])

  const openModal = (budget = null) => {
    if (budget) {
      setForm({
        categorie: budget.categorie,
        montant: budget.montant,
        periode: budget.periode,
        mois: budget.mois || now.getMonth() + 1,
        annee: budget.annee || now.getFullYear(),
      })
      setEditId(budget.id)
    } else {
      setForm(EMPTY)
      setEditId(null)
    }
    document.getElementById('modal_budget').showModal()
  }

  const handleSave = async () => {
    if (!form.categorie || !form.montant) {
      alert('Catégorie et montant obligatoires')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        montant: Number(form.montant),
        mois: Number(form.mois),
        annee: Number(form.annee),
        categorie: Number(form.categorie),
      }
      if (editId) await budgetAPI.update(editId, payload)
      else await budgetAPI.create(payload)
      load()
      document.getElementById('modal_budget').close()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce budget ?')) return
    await budgetAPI.delete(id)
    load()
  }

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'

  const moisNom = new Date(annee, mois - 1).toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric'
  })

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Budgets</h1>
          <p className="text-base-content/50 text-sm mt-1">Plafonds de dépenses par catégorie</p>
        </div>
        <button className="btn btn-warning" onClick={() => openModal()}>
          <PlusCircle className="w-4 h-4" />
          Nouveau budget
        </button>
      </div>

      {/* Sélecteur mois/année */}
      <div className="flex items-center gap-3">
        <select className="select select-sm" value={mois}
          onChange={(e) => setMois(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleDateString('fr-FR', { month: 'long' })}
            </option>
          ))}
        </select>
        <input type="number" className="input input-sm w-24"
          value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
        <span className="text-base-content/50 text-sm">— {moisNom}</span>
      </div>

      {/* Suivi budgets du mois */}
      {suivi.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suivi.map((s) => (
            <div key={s.budget_id} className={`card bg-base-100 border ${
              s.depasse ? 'border-error' : 'border-base-300'
            }`}>
              <div className="card-body p-5 gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-warning" />
                    <span className="font-semibold">{s.categorie}</span>
                  </div>
                  {s.depasse && (
                    <div className="badge badge-error badge-soft gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Dépassé !
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-sm text-base-content/60">
                  <span>Dépensé : <strong className="text-base-content">{fmt(s.depense)}</strong></span>
                  <span>Plafond : <strong className="text-base-content">{fmt(s.montant_max)}</strong></span>
                </div>

                <div>
                  <progress
                    className={`progress w-full ${s.depasse ? 'progress-error' : 'progress-warning'}`}
                    value={Math.min(s.pourcentage, 100)}
                    max={100}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={s.depasse ? 'text-error font-bold' : 'text-base-content/50'}>
                      {s.pourcentage}% utilisé
                    </span>
                    <span className={s.restant < 0 ? 'text-error' : 'text-success'}>
                      {s.restant < 0 ? 'Dépassement' : 'Restant'} : {fmt(Math.abs(s.restant))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suivi.length === 0 && (
        <div className="alert alert-soft alert-warning">
          Aucun budget défini pour {moisNom}. Créez un budget pour commencer le suivi.
        </div>
      )}

      {/* Liste tous les budgets */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="font-bold mb-2">Tous les budgets</h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Plafond</th>
                  <th>Période</th>
                  <th>Mois</th>
                  <th>Année</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-base-content/40 py-6">
                      Aucun budget créé
                    </td>
                  </tr>
                )}
                {budgets.map((b) => (
                  <tr key={b.id}>
                    <td className="font-medium">{b.categorie_nom}</td>
                    <td className="font-semibold">{fmt(b.montant)}</td>
                    <td>
                      <span className="badge badge-soft badge-info text-xs">{b.periode}</span>
                    </td>
                    <td>{b.mois || '—'}</td>
                    <td>{b.annee || '—'}</td>
                    <td className="flex gap-2">
                      <button className="btn btn-sm btn-ghost" onClick={() => openModal(b)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="btn btn-sm btn-error btn-soft" onClick={() => handleDelete(b.id)}>
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <dialog id="modal_budget" className="modal backdrop-blur">
        <div className="modal-box border border-base-300">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg mb-4">
            {editId ? 'Modifier le budget' : 'Nouveau budget'}
          </h3>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="label text-sm">Catégorie (sortie) *</label>
              <select className="select w-full" value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                <option value="">-- Choisir --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Plafond (FCFA) *</label>
              <input type="number" className="input w-full"
                placeholder="Ex: 500000"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Période</label>
              <select className="select w-full" value={form.periode}
                onChange={(e) => setForm({ ...form, periode: e.target.value })}>
                <option value="mensuel">Mensuel</option>
                <option value="trimestriel">Trimestriel</option>
                <option value="annuel">Annuel</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Mois</label>
                <input type="number" className="input w-full" min={1} max={12}
                  value={form.mois}
                  onChange={(e) => setForm({ ...form, mois: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Année</label>
                <input type="number" className="input w-full"
                  value={form.annee}
                  onChange={(e) => setForm({ ...form, annee: e.target.value })} />
              </div>
            </div>

            <button className="btn btn-warning w-full" onClick={handleSave} disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
