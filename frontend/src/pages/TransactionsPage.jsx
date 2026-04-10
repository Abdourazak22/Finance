import { useState, useEffect, useCallback } from 'react'
import { transactionAPI, categorieAPI } from '../api/services'
import { PlusCircle, Trash, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
// import { Toaster } from 'react-hot-toast'

const FORM_EMPTY = {
  type: 'entree', description: '', montant: '',
  categorie: '', date: new Date().toISOString().split('T')[0], statut: 'confirme'
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(FORM_EMPTY)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)

  // -- Filtres --
  const [filtreType, setFiltreType] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreMois, setFiltreMois] = useState('')
  const [filtreAnnee, setFiltreAnnee] = useState('')

  const load = useCallback(async () => {
    try {
      const params = { ordering: '-date' }
      if (filtreType)   params.type   = filtreType
      if (filtreStatut) params.statut = filtreStatut
      if (filtreMois)   params.mois   = filtreMois
      if (filtreAnnee)  params.annee  = filtreAnnee

      const [t, c] = await Promise.all([
        transactionAPI.list(params),
        categorieAPI.list(),
      ])
      setTransactions(Array.isArray(t.data) ? t.data : (t.data.results || []))
      setCategories(c.data)
    } catch (e) { console.error(e) }
  }, [filtreType, filtreStatut, filtreMois, filtreAnnee])

  useEffect(() => { load() }, [load, refresh])

  // ── Ouvrir modal ajout ou modification ──
  const openModal = (t = null) => {
    if (t) {
      setForm({
        type: t.type,
        description: t.description,
        montant: t.montant,
        categorie: t.categorie || '',
        date: t.date,
        statut: t.statut,
      })
      setEditId(t.id)
      
    } else {
      setForm(FORM_EMPTY)
      setEditId(null)
    }
    document.getElementById('modal_transaction').showModal()
  }

  // ── Sauvegarder (ajout ou modification) ──
  const handleSave = async () => {
    if (!form.description || !form.montant || !form.date) {
      alert('Description, montant et date sont obligatoires')
      return
    }
    setLoading(true)
    try {
      const payload = {
        type: form.type,
        description: form.description,
        montant: Number(form.montant),
        categorie: form.categorie || null,
        date: form.date,
        statut: form.statut,
      }
      if (editId) {
        await transactionAPI.update(editId, payload)
      } else {
        await transactionAPI.create(payload)
      }
      document.getElementById('modal_transaction').close()
      setForm(FORM_EMPTY)
      setEditId(null)
      setRefresh(r => r + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Supprimer ──
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette transaction ?')) return
    await transactionAPI.delete(id)
    setRefresh(r => r + 1)
  }

  // ── Réinitialiser les filtres ──
  const resetFiltres = () => {
    setFiltreType('')
    setFiltreStatut('')
    setFiltreMois('')
    setFiltreAnnee('')
  }

  const categoriesFiltrees = categories.filter(c => c.type === form.type)

  const badgeStatut = (s) => {
    if (s === 'confirme') return 'badge-success'
    if (s === 'en_attente') return 'badge-warning'
    return 'badge-error'
  }

  const labelStatut = (s) => {
    if (s === 'confirme') return 'Confirmé'
    if (s === 'en_attente') return 'En attente'
    return 'Annulée'
  }

  const moisOptions = [
    { v: '1', l: 'Janvier' }, { v: '2', l: 'Février' }, { v: '3', l: 'Mars' },
    { v: '4', l: 'Avril' }, { v: '5', l: 'Mai' }, { v: '6', l: 'Juin' },
    { v: '7', l: 'Juillet' }, { v: '8', l: 'Août' }, { v: '9', l: 'Septembre' },
    { v: '10', l: 'Octobre' }, { v: '11', l: 'Novembre' }, { v: '12', l: 'Décembre' },
  ]

  const anneeOptions = ['2024', '2025', '2026', '2027']

  const filtersActifs = filtreType || filtreStatut || filtreMois || filtreAnnee

  return (
    <div className="flex flex-col gap-6">

      {/* ── Titre + bouton ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Transactions</h1>
          <p className="text-base-content/50 text-sm mt-1">
            {transactions.length} transaction(s)
            {filtersActifs ? ' (filtrées)' : ' au total'}
          </p>
        </div>
        <button className="btn btn-warning" onClick={() => openModal()}>
          <PlusCircle className="w-4 h-4" />
          Ajouter transaction
        </button>
      </div>

      {/* ── Filtres ── */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <div className="flex flex-wrap gap-3 items-end">

            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/50 uppercase">Type</label>
              <select className="select select-sm w-36" value={filtreType}
                onChange={e => setFiltreType(e.target.value)}>
                <option value="">Tous</option>
                <option value="entree">Entrées</option>
                <option value="sortie">Sorties</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/50 uppercase">Statut</label>
              <select className="select select-sm w-40" value={filtreStatut}
                onChange={e => setFiltreStatut(e.target.value)}>
                <option value="">Tous</option>
                <option value="confirme">Confirmé</option>
                <option value="en_attente">En attente</option>
                <option value="annulé">Annulée</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/50 uppercase">Mois</label>
              <select className="select select-sm w-36" value={filtreMois}
                onChange={e => setFiltreMois(e.target.value)}>
                <option value="">Tous</option>
                {moisOptions.map(m => (
                  <option key={m.v} value={m.v}>{m.l}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-base-content/50 uppercase">Année</label>
              <select className="select select-sm w-28" value={filtreAnnee}
                onChange={e => setFiltreAnnee(e.target.value)}>
                <option value="">Toutes</option>
                {anneeOptions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {filtersActifs && (
              <button className="btn btn-sm btn-ghost" onClick={resetFiltres}>
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="card bg-base-100 border border-base-300">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Catégorie</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-base-content/40 py-10">
                    Aucune transaction trouvée
                  </td>
                </tr>
              )}
              {transactions.map((t, index) => (
                <tr key={t.id}>
                  <th>{index + 1}</th>
                  <td className="font-medium">{t.description}</td>
                  <td className="text-base-content/60">
                    {t.categorie_detail?.nom || '—'}
                  </td>
                  <td>
                    <span className={`font-bold flex items-center gap-1 ${
                      t.type === 'entree' ? 'text-success' : 'text-error'
                    }`}>
                      {t.type === 'entree'
                        ? <TrendingUp className="w-4 h-4" />
                        : <TrendingDown className="w-4 h-4" />
                      }
                      {t.type === 'entree' ? '+' : '-'}
                      {Number(t.montant).toLocaleString('fr-FR')} FCFA
                    </span>
                  </td>
                  <td className="text-base-content/60 text-sm">
                    {new Date(t.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <span className={`badge badge-soft text-xs ${badgeStatut(t.statut)}`}>
                      {labelStatut(t.statut)}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => openModal(t)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-error btn-soft"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ajout / modification ── */}
      <dialog id="modal_transaction" className="modal backdrop-blur">
        <div className="modal-box border border-base-300">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg mb-4">
            {editId ? 'Modifier la transaction' : 'Ajouter une transaction'}
          </h3>

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
              <input type="number" className="input w-full"
                placeholder="Ex: 850000"
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

            <button className="btn btn-warning w-full mt-2"
              onClick={handleSave} disabled={loading}>
              {loading
                ? <span className="loading loading-spinner loading-sm" />
                : editId ? 'Mettre à jour' : 'Enregistrer la transaction'
              }
            </button>

          </div>
        </div>
      </dialog>

    </div>
  )
}
