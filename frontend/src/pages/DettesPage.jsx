import { useState, useEffect, useCallback } from 'react'
import { detteAPI } from '../api/services'
import { PlusCircle, Trash, Pencil, Landmark, AlertTriangle, CheckCircle } from 'lucide-react'

const EMPTY = {
  type: 'dette', tiers: '', montant_total: '',
  montant_rembourse: '0', echeance: '', statut: 'en_cours', description: ''
}

export default function DettesPage() {
  const [dettes, setDettes]   = useState([])
  const [stats, setStats]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [filtre, setFiltre]   = useState('tous')
  const [refresh, setRefresh] = useState(0)

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([detteAPI.list(), detteAPI.stats()])
      setDettes(d.data)
      setStats(s.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load, refresh])

  const openModal = (dette = null) => {
    if (dette) {
      setForm({
        type: dette.type, tiers: dette.tiers,
        montant_total: dette.montant_total,
        montant_rembourse: dette.montant_rembourse,
        echeance: dette.echeance || '',
        statut: dette.statut, description: dette.description || ''
      })
      setEditId(dette.id)
    } else {
      setForm(EMPTY)
      setEditId(null)
    }
    document.getElementById('modal_dette').showModal()
  }

  const handleSave = async () => {
    if (!form.tiers || !form.montant_total) {
      alert('Tiers et montant obligatoires')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        montant_total:     Number(form.montant_total),
        montant_rembourse: Number(form.montant_rembourse),
        echeance: form.echeance || null,
      }
      if (editId) await detteAPI.update(editId, payload)
      else await detteAPI.create(payload)
      document.getElementById('modal_dette').close()
      setRefresh(r => r + 1)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette dette ?')) return
    await detteAPI.delete(id)
    setRefresh(r => r + 1)
  }

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'

  const dettesFiltrées = dettes.filter(d => {
    if (filtre === 'tous') return true
    return d.type === filtre
  })

  const badgeStatut = (s) => {
    if (s === 'en_cours')  return 'badge-info'
    if (s === 'partiel')   return 'badge-warning'
    if (s === 'en_retard') return 'badge-error'
    return 'badge-success'
  }

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Dettes & Créances</h1>
          <p className="text-base-content/50 text-sm mt-1">Suivi de vos obligations financières</p>
        </div>
        <button className="btn btn-warning" onClick={() => openModal()}>
          <PlusCircle className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <div className="flex items-center gap-2 text-base-content/50 text-xs uppercase">
                <AlertTriangle className="w-4 h-4 text-error" /> Je dois
              </div>
              <div className="text-xl font-black text-error">{fmt(stats.total_dettes)}</div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <div className="flex items-center gap-2 text-base-content/50 text-xs uppercase">
                <CheckCircle className="w-4 h-4 text-success" /> On me doit
              </div>
              <div className="text-xl font-black text-success">{fmt(stats.total_creances)}</div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <div className="flex items-center gap-2 text-base-content/50 text-xs uppercase">
                <Landmark className="w-4 h-4 text-warning" /> Échéances proches
              </div>
              <div className="text-xl font-black text-warning">{stats.echeances_proches || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        {['tous', 'dette', 'creance'].map(f => (
          <button key={f}
            className={`btn btn-sm ${filtre === f ? 'btn-warning' : 'btn-ghost'}`}
            onClick={() => setFiltre(f)}>
            {f === 'tous' ? 'Tous' : f === 'dette' ? 'Je dois' : 'On me doit'}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="card bg-base-100 border border-base-300">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Tiers</th>
                <th>Type</th>
                <th>Total</th>
                <th>Remboursé</th>
                <th>Restant</th>
                <th>Progression</th>
                <th>Échéance</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dettesFiltrées.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-base-content/40 py-8">
                    Aucune dette trouvée
                  </td>
                </tr>
              )}
              {dettesFiltrées.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.tiers}</td>
                  <td>
                    {/* ✅ Texte court — "Doit" au lieu de "Je dois" */}
                    <span className={`badge badge-soft badge-sm whitespace-nowrap ${
                      d.type === 'dette' ? 'badge-error' : 'badge-success'
                    }`}>
                      {d.type === 'dette' ? '↑ Doit' : '↓ Dû'}
                    </span>
                  </td>
                  <td className="font-semibold">{fmt(d.montant_total)}</td>
                  <td className="text-success">{fmt(d.montant_rembourse)}</td>
                  <td className="text-error font-semibold">{fmt(d.montant_restant)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <progress
                        className="progress progress-success w-16"
                        value={d.pourcentage_rembourse}
                        max={100}
                      />
                      <span className="text-xs whitespace-nowrap">{d.pourcentage_rembourse}%</span>
                    </div>
                  </td>
                  <td className="text-sm text-base-content/60 whitespace-nowrap">
                    {d.echeance ? new Date(d.echeance).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td>
                    {/* ✅ Texte court pour le statut */}
                    <span className={`badge badge-soft badge-sm whitespace-nowrap ${badgeStatut(d.statut)}`}>
                      {d.statut === 'en_cours'  ? 'En cours'  :
                       d.statut === 'partiel'   ? 'Partiel'   :
                       d.statut === 'en_retard' ? 'En retard' : d.statut}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-xs btn-ghost" onClick={() => openModal(d)}>
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button className="btn btn-xs btn-error btn-soft" onClick={() => handleDelete(d.id)}>
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <dialog id="modal_dette" className="modal backdrop-blur">
        <div className="modal-box border border-base-300">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg mb-4">
            {editId ? 'Modifier la dette' : 'Ajouter une dette'}
          </h3>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Type</label>
                <select className="select w-full" value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="dette">Je dois</option>
                  <option value="creance">On me doit</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Statut</label>
                <select className="select w-full" value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                  <option value="en_cours">En cours</option>
                  <option value="partiel">Partiellement remboursé</option>
                  <option value="en_retard">En retard</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Tiers (créancier / débiteur) *</label>
              <input type="text" className="input w-full" placeholder="Ex: Banque SGBF"
                value={form.tiers}
                onChange={(e) => setForm({ ...form, tiers: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Montant total (FCFA) *</label>
                <input type="number" className="input w-full"
                  value={form.montant_total}
                  onChange={(e) => setForm({ ...form, montant_total: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Montant remboursé (FCFA)</label>
                <input type="number" className="input w-full"
                  value={form.montant_rembourse}
                  onChange={(e) => setForm({ ...form, montant_rembourse: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Échéance</label>
              <input type="date" className="input w-full"
                value={form.echeance}
                onChange={(e) => setForm({ ...form, echeance: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Description</label>
              <textarea className="textarea w-full" rows={2}
                placeholder="Notes optionnelles..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <button className="btn btn-warning w-full" onClick={handleSave} disabled={loading}>
              {loading
                ? <span className="loading loading-spinner loading-sm" />
                : 'Enregistrer'
              }
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
