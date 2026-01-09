'use client';

/**
 * Página: Sistema de Diluição e Estoque
 * /estoque/diluicao
 */

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Beaker, Package, AlertTriangle, TrendingDown, Plus } from 'lucide-react';
import { useTenant } from '@/lib/TenantContext';

const baseFetcher = async (url: string, businessId?: string) => {
  const headers: HeadersInit = businessId ? { 'x-business-id': businessId } : {}
  const res = await fetch(url, { headers });
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Erro na requisição')
  return json
};

export default function DiluicaoPage() {
  const [view, setView] = useState<'products' | 'recipes' | 'batches' | 'templates'>('products');

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
          <Beaker className="w-8 h-8 text-blue-500" />
          Sistema de Diluição e Consumo
        </h1>
        <p className="text-gray-400 mt-1">
          Gerencie produtos concentrados, receitas de diluição e consumo por serviço
        </p>
      </div>

      {/* Navegação de Abas */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-lg mb-6">
        <div className="flex border-b border-gray-800">
          <TabButton
            active={view === 'products'}
            onClick={() => setView('products')}
            icon={<Package className="w-4 h-4" />}
            label="Produtos"
          />
          <TabButton
            active={view === 'recipes'}
            onClick={() => setView('recipes')}
            icon={<Beaker className="w-4 h-4" />}
            label="Receitas de Diluição"
          />
          <TabButton
            active={view === 'batches'}
            onClick={() => setView('batches')}
            icon={<TrendingDown className="w-4 h-4" />}
            label="Lotes Preparados"
          />
          <TabButton
            active={view === 'templates'}
            onClick={() => setView('templates')}
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Templates de Consumo"
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mt-6">
        {view === 'products' && <ProductsView />}
        {view === 'recipes' && <RecipesView />}
        {view === 'batches' && <BatchesView />}
        {view === 'templates' && <TemplatesView />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-3 font-medium transition-colors
        ${active
          ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function ProductsView() {
  const { tenant } = useTenant();
  const { data, mutate, isLoading, error } = useSWR(
    tenant?.id ? ['/api/products-dilution', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  );
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [showStockModal, setShowStockModal] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    brand: '',
    categoryId: '',
    isConcentrated: true,
    baseUnit: 'ml',
    packageSizeMl: '',
    costTotal: '',
    stockMinMl: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState({ quantity: '' });

  const handleCreate = async () => {
    if (!form.name || !form.packageSizeMl || !form.costTotal) {
      alert('Nome, tamanho da embalagem e custo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        brand: form.brand || undefined,
        categoryId: form.categoryId || undefined,
        isConcentrated: form.isConcentrated,
        baseUnit: form.baseUnit,
        packageSizeMl: Number(form.packageSizeMl),
        costTotal: Number(form.costTotal),
        stockMinMl: form.stockMinMl ? Number(form.stockMinMl) : 0,
        isActive: form.isActive,
      }

      const res = await fetch(editing ? `/api/products-dilution/${editing.id}` : '/api/products-dilution', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar produto');
      setShowModal(false);
      setEditing(null);
      setForm({
        name: '',
        sku: '',
        brand: '',
        categoryId: '',
        isConcentrated: true,
        baseUnit: 'ml',
        packageSizeMl: '',
        costTotal: '',
        stockMinMl: '',
        isActive: true,
      });
      mutate();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Produtos Concentrados</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>
      <p className="text-gray-400 mb-4">
        Cadastre produtos concentrados que serão diluídos antes do uso.
      </p>

      {error ? (
        <p className="text-red-300 text-center py-8">{String(error.message || error)}</p>
      ) : isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando...</p>
      ) : (data?.products || []).length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-2">Nome</th>
                <th className="py-2">SKU</th>
                <th className="py-2">Marca</th>
                <th className="py-2">Embalagem</th>
                <th className="py-2">Custo</th>
                <th className="py-2">Estoque Mín.</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(data?.products || []).map((p: any) => (
                <tr key={p.id} className="text-gray-100">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2">{p.sku || '-'}</td>
                  <td className="py-2">{p.brand || '-'}</td>
                  <td className="py-2">{p.packageSizeMl} ml</td>
                  <td className="py-2">R$ {Number(p.costTotal).toFixed(2)}</td>
                  <td className="py-2">{p.stockMinMl} ml</td>
                  <td className="py-2 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setForm({
                          name: p.name || '',
                          sku: p.sku || '',
                          brand: p.brand || '',
                          categoryId: p.categoryId || '',
                          isConcentrated: !!p.isConcentrated,
                          baseUnit: p.baseUnit || 'ml',
                          packageSizeMl: String(p.packageSizeMl || ''),
                          costTotal: String(p.costTotal || ''),
                          stockMinMl: String(p.stockMinMl || ''),
                          isActive: p.isActive ?? true,
                        });
                        setShowModal(true);
                      }}
                      className="text-xs bg-gray-800 text-gray-200 px-3 py-2 rounded hover:bg-gray-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setShowStockModal(p);
                        setStockForm({ quantity: '' });
                      }}
                      className="text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                    >
                      Entrada
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-300">Nenhum produto cadastrado ainda</p>
          <p className="text-sm mt-2 text-gray-400">Clique em "Novo Produto" para começar</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">{editing ? 'Editar Produto' : 'Novo Produto Concentrado'}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: APC Super Concentrado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: APC-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: Vonixx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Unidade Base
                  </label>
                  <select
                    value={form.baseUnit}
                    onChange={(e) => setForm({ ...form, baseUnit: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="ml">ml (mililitros)</option>
                    <option value="L">L (litros)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tamanho da Embalagem (ml) *
                  </label>
                  <input
                    type="number"
                    value={form.packageSizeMl}
                    onChange={(e) => setForm({ ...form, packageSizeMl: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: 1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Custo Total (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.costTotal}
                    onChange={(e) => setForm({ ...form, costTotal: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: 85.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Estoque Mínimo (ml)
                  </label>
                  <input
                    type="number"
                    value={form.stockMinMl}
                    onChange={(e) => setForm({ ...form, stockMinMl: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: 500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isConcentrated}
                    onChange={(e) => setForm({ ...form, isConcentrated: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">
                    É produto concentrado (requer diluição)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">
                    Produto ativo
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditing(null); }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : (editing ? 'Salvar alterações' : 'Criar Produto')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de entrada de estoque */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Entrada de estoque - {showStockModal.name}</h3>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quantidade (ml)</label>
            <input
              type="number"
              value={stockForm.quantity}
              onChange={(e) => setStockForm({ quantity: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              placeholder="Ex: 1000"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowStockModal(null)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Cancelar</button>
              <button
                onClick={async () => {
                  const qty = Number(stockForm.quantity || '0');
                  if (!qty || qty <= 0) { alert('Informe uma quantidade'); return; }
                  setStockSaving(true);
                  try {
                    const res = await fetch('/api/inventory/movements', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) },
                      body: JSON.stringify({
                        productId: showStockModal.id,
                        movementType: 'IN',
                        quantity: qty,
                        unitCost: Number(showStockModal.costTotal) / (Number(showStockModal.packageSizeMl) || 1),
                        note: 'Entrada manual para preparação de diluição'
                      })
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json.error || 'Erro ao registrar entrada');
                    setShowStockModal(null);
                    setStockForm({ quantity: '' });
                    mutate();
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setStockSaving(false);
                  }
                }}
                disabled={stockSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {stockSaving ? 'Salvando...' : 'Registrar entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipesView() {
  const { tenant } = useTenant();

  // Carregar produtos (concentrados) e receitas
  const { data: prodData, error: prodError } = useSWR(
    tenant?.id ? ['/api/products-dilution', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  )
  const products = (prodData?.products || []) as any[]

  const { data: recData, mutate: mutateRecipes, isLoading: recipesLoading, error: recipesError } = useSWR(
    tenant?.id ? ['/api/dilution-recipes', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  )
  const recipes = (recData?.recipes || []) as any[]

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    productId: '',
    name: '',
    ratioProduct: '1',
    ratioWater: '10',
    targetBottleMl: '1000',
    isActive: true as boolean | undefined
  })

  const parseIntSafe = (v: string) => {
    const n = parseInt(v || '0', 10)
    return isNaN(n) ? 0 : n
  }

  const calcPreview = () => {
    const rp = parseIntSafe(form.ratioProduct)
    const rw = parseIntSafe(form.ratioWater)
    const total = parseIntSafe(form.targetBottleMl)
    const sum = rp + rw
    if (sum <= 0 || total <= 0) return { concentrate: 0, water: 0, total }
    const concentrate = Math.round((rp / sum) * total)
    const water = total - concentrate
    return { concentrate, water, total }
  }

  const openNew = () => {
    setEditing(null)
    setForm({ productId: '', name: '', ratioProduct: '1', ratioWater: '10', targetBottleMl: '1000', isActive: true })
    setShowModal(true)
  }

  const openEdit = (r: any) => {
    setEditing(r)
    setForm({
      productId: r.productId,
      name: r.name,
      ratioProduct: String(r.ratioProduct),
      ratioWater: String(r.ratioWater),
      targetBottleMl: String(r.targetBottleMl || 1000),
      isActive: r.isActive
    })
    setShowModal(true)
  }

  const submit = async () => {
    if (!form.productId || !form.name) {
      alert('Selecione o produto e informe o nome')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/dilution-recipes/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) },
          body: JSON.stringify({
            name: form.name,
            ratioProduct: parseIntSafe(form.ratioProduct),
            ratioWater: parseIntSafe(form.ratioWater),
            targetBottleMl: parseIntSafe(form.targetBottleMl),
            isActive: form.isActive,
          })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao atualizar receita')
      } else {
        const res = await fetch('/api/dilution-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) },
          body: JSON.stringify({
            productId: form.productId,
            name: form.name,
            ratioProduct: parseIntSafe(form.ratioProduct),
            ratioWater: parseIntSafe(form.ratioWater),
            targetBottleMl: parseIntSafe(form.targetBottleMl),
          })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao criar receita')
      }
      setShowModal(false)
      setEditing(null)
      mutateRecipes()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    const recipe = recipes.find(r => r.id === id)
    const hasBatches = recipe?._count?.batches > 0
    
    const msg = hasBatches 
      ? `Esta receita tem ${recipe._count.batches} lote(s) preparado(s).\n\nOs dados históricos serão preservados no snapshot dos lotes.\n\nDeseja deletar mesmo assim?`
      : 'Deseja excluir esta receita?'
    
    if (!confirm(msg)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dilution-recipes/${id}`, {
        method: 'DELETE',
        headers: { ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) }
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro ao excluir receita')
      mutateRecipes()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Receitas de Diluição</h2>
        <button onClick={openNew} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700">
          <Plus className="w-4 h-4" />
          Nova Receita
        </button>
      </div>
      <p className="text-gray-400 mb-4">
        Defina proporções de diluição (ex: 1:10, 1:20) para cada produto concentrado.
      </p>

      {recipesError ? (
        <p className="text-red-300">{String(recipesError.message || recipesError)}</p>
      ) : recipesLoading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((r: any) => (
            <div key={r.id} className="border border-gray-800 rounded-lg p-4 hover:border-blue-500/60 transition-colors bg-gray-950/60">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-white">{r.name}</h3>
                  <p className="text-sm text-gray-400">{r.product?.name}</p>
                </div>
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold">
                  {r.ratioProduct}:{r.ratioWater}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Garrafa alvo:</span>
                  <span className="font-medium text-white">{r.targetBottleMl || 1000} ml</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Batches:</span>
                  <span className="font-medium text-white">{r._count?.batches || 0}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(r)} className="text-sm bg-gray-800 text-gray-200 px-3 py-2 rounded hover:bg-gray-700">Editar</button>
                <button
                  onClick={() => remove(r.id)}
                  disabled={deletingId === r.id}
                  className="text-sm bg-red-500/15 text-red-300 px-3 py-2 rounded hover:bg-red-500/25 disabled:opacity-50"
                >
                  {deletingId === r.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Beaker className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-300">Nenhuma receita cadastrada ainda</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">{editing ? 'Editar Receita' : 'Nova Receita'}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Produto Concentrado *</label>
                  <select
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    disabled={!!editing}
                  >
                    <option value="">Selecione</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: APC 1:10 uso geral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Produto (parte)</label>
                  <input
                    type="number"
                    value={form.ratioProduct}
                    onChange={(e) => setForm({ ...form, ratioProduct: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Água (parte)</label>
                  <input
                    type="number"
                    value={form.ratioWater}
                    onChange={(e) => setForm({ ...form, ratioWater: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Garrafa alvo (ml)</label>
                  <input
                    type="number"
                    value={form.targetBottleMl}
                    onChange={(e) => setForm({ ...form, targetBottleMl: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive ?? true}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">Ativa</label>
                </div>
              </div>

              {/* Prévia */}
              <div className="bg-gray-800/60 border border-gray-700 rounded p-3 text-sm text-gray-200">
                {(() => { const c = calcPreview(); return (
                  <div className="flex flex-wrap gap-4">
                    <span><span className="text-gray-400">Prévia:</span> {form.ratioProduct}:{form.ratioWater} → </span>
                    <span><span className="text-gray-400">Concentrado:</span> <b>{c.concentrate} ml</b></span>
                    <span><span className="text-gray-400">Água:</span> <b>{c.water} ml</b></span>
                    <span><span className="text-gray-400">Total:</span> <b>{c.total} ml</b></span>
                  </div>
                )})()}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setEditing(null) }} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Cancelar</button>
              <button onClick={submit} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving ? 'Salvando...' : (editing ? 'Salvar alterações' : 'Criar Receita')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeCard() {
  return (
    <div className="border border-gray-800 rounded-lg p-4 hover:border-blue-500/60 transition-colors bg-gray-950/60">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-white">APC - Limpeza Pesada</h3>
          <p className="text-sm text-gray-400">APC Super Concentrado</p>
        </div>
        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold">
          1:10
        </span>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Concentrado:</span>
          <span className="font-medium text-white">91 ml</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Água:</span>
          <span className="font-medium text-white">909 ml</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Total:</span>
          <span className="font-semibold text-white">1000 ml</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="flex-1 text-sm bg-purple-500/15 text-purple-300 px-3 py-2 rounded hover:bg-purple-500/25">
          Preparar Lote
        </button>
        <button className="text-sm bg-gray-800 text-gray-200 px-3 py-2 rounded hover:bg-gray-700">
          Editar
        </button>
      </div>
    </div>
  );
}

function BatchesView() {
  const { tenant } = useTenant();

  const { data: recData } = useSWR(
    tenant?.id ? ['/api/dilution-recipes', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  )
  const recipes = (recData?.recipes || []) as any[]

  const { data: batchesData, mutate, isLoading, error } = useSWR(
    tenant?.id ? ['/api/dilution-batches', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  )
  const batches = (batchesData?.batches || []) as any[]

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    recipeId: '',
    numberOfBottles: '1',
    targetBottleMl: '',
    notes: ''
  })

  const submit = async () => {
    if (!form.recipeId) {
      alert('Selecione a receita')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/dilution-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) },
        body: JSON.stringify({
          recipeId: form.recipeId,
          numberOfBottles: Number(form.numberOfBottles) || 1,
          targetBottleMl: form.targetBottleMl ? Number(form.targetBottleMl) : undefined,
          notes: form.notes || undefined,
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro ao preparar lote')
      setShowModal(false)
      setForm({ recipeId: '', numberOfBottles: '1', targetBottleMl: '', notes: '' })
      mutate()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Lotes Preparados</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Beaker className="w-4 h-4" />
          Preparar lote
        </button>
      </div>
      <p className="text-gray-400 mb-4">
        Histórico de soluções diluídas preparadas e baixas de estoque.
      </p>

      {error ? (
        <p className="text-red-300">{String(error.message || error)}</p>
      ) : isLoading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : batches.length > 0 ? (
        <div className="space-y-3">
          {batches.map((b) => {
            const recipe = b.recipe
            const hasSnapshot = b.recipeNameSnapshot !== null && b.recipeNameSnapshot !== undefined
            
            // Detectar divergência entre snapshot e receita atual
            const divergence = {
              hasChanged: false,
              changes: [] as string[]
            }
            
            if (hasSnapshot && recipe) {
              if (b.recipeNameSnapshot !== recipe.name) {
                divergence.changes.push(`Nome: "${b.recipeNameSnapshot}" → "${recipe.name}"`)
              }
              if (b.ratioProductSnapshot !== recipe.ratioProduct) {
                divergence.changes.push(`Proporção: ${b.ratioProductSnapshot}:1 → ${recipe.ratioProduct}:1`)
              }
              if (b.ratioWaterSnapshot !== recipe.ratioWater) {
                divergence.changes.push(`Água: 1:${b.ratioWaterSnapshot} → 1:${recipe.ratioWater}`)
              }
              if (b.targetBottleMlSnapshot !== recipe.targetBottleMl) {
                divergence.changes.push(`Volume: ${b.targetBottleMlSnapshot}ml → ${recipe.targetBottleMl}ml`)
              }
              divergence.hasChanged = divergence.changes.length > 0
            }
            
            return (
              <div key={b.id} className={`border rounded-lg p-4 ${divergence.hasChanged ? 'border-amber-700 bg-amber-950/40' : 'border-gray-800 bg-gray-950/60'}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-300">{b.recipe?.name}</span>
                      {divergence.hasChanged && (
                        <span className="text-xs bg-amber-900 text-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          ⚠️ Receita alterada
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(b.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-200 flex gap-4 flex-wrap">
                  <span><span className="text-gray-400">Total:</span> {b.preparedTotalMl} ml</span>
                  <span><span className="text-gray-400">Concentrado:</span> {b.usedConcentrateMl} ml</span>
                  <span><span className="text-gray-400">Água:</span> {b.usedWaterMl} ml</span>
                </div>
                {divergence.hasChanged && (
                  <div className="mt-3 p-3 bg-amber-900/30 border border-amber-800 rounded text-xs text-amber-200">
                    <p className="font-semibold mb-1">Alterações na receita desde o preparo:</p>
                    <ul className="space-y-0.5 text-amber-100">
                      {divergence.changes.map((change, i) => <li key={i}>• {change}</li>)}
                    </ul>
                    <p className="text-amber-300 mt-2 text-xs">Este lote foi preparado com os parâmetros originais. As alterações acima foram feitas depois.</p>
                  </div>
                )}
                {b.notes && <p className="text-xs text-gray-400 mt-1">{b.notes}</p>}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Beaker className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-300">Nenhum lote preparado ainda</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Preparar lote</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Receita *</label>
                <select
                  value={form.recipeId}
                  onChange={(e) => setForm({ ...form, recipeId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                >
                  <option value="">Selecione</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.ratioProduct}:{r.ratioWater})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Número de garrafas</label>
                  <input
                    type="number"
                    value={form.numberOfBottles}
                    onChange={(e) => setForm({ ...form, numberOfBottles: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Capacidade por garrafa (ml)</label>
                  <input
                    type="number"
                    value={form.targetBottleMl}
                    onChange={(e) => setForm({ ...form, targetBottleMl: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Se vazio, usa padrão da receita"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Cancelar</button>
              <button onClick={submit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Salvando...' : 'Preparar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesView() {
  const { tenant } = useTenant();

  // Carregar dados necessários
  const { data: servicesData } = useSWR(
    tenant?.id ? ['/api/services', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  )
  const services = (servicesData || []) as any[]

  const { data: recipesData } = useSWR(
    tenant?.id ? ['/api/dilution-recipes', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  )
  const recipes = (recipesData?.recipes || []) as any[]

  const { data: templatesData, mutate, isLoading, error } = useSWR(
    tenant?.id ? ['/api/service-product-templates', tenant.id] : null,
    ([url, businessId]) => baseFetcher(url, businessId)
  )
  const templates = (templatesData?.templates || []) as any[]

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const vehicleTypes = ['SEDAN', 'SUV', 'PERUA', 'HATCH', 'PICKUP', 'VAN', 'MOTO', 'OUTRO']

  const [form, setForm] = useState({
    serviceId: '',
    vehicleType: '',
    recipeId: '',
    quantityMl: ''
  })

  const openNew = () => {
    setEditing(null)
    setForm({ serviceId: '', vehicleType: '', recipeId: '', quantityMl: '' })
    setShowModal(true)
  }

  const openEdit = (t: any) => {
    setEditing(t)
    setForm({
      serviceId: t.serviceId,
      vehicleType: t.vehicleType,
      recipeId: t.recipeId,
      quantityMl: String(t.quantityMl)
    })
    setShowModal(true)
  }

  const submit = async () => {
    if (!form.serviceId || !form.vehicleType || !form.recipeId || !form.quantityMl) {
      alert('Todos os campos são obrigatórios')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/service-product-templates/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) },
          body: JSON.stringify({
            vehicleType: form.vehicleType,
            quantityMl: Number(form.quantityMl),
          })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao atualizar template')
      } else {
        const res = await fetch('/api/service-product-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) },
          body: JSON.stringify({
            serviceId: form.serviceId,
            vehicleType: form.vehicleType,
            recipeId: form.recipeId,
            quantityMl: Number(form.quantityMl),
          })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao criar template')
      }
      setShowModal(false)
      setEditing(null)
      mutate()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Deseja remover este template?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/service-product-templates/${id}`, {
        method: 'DELETE',
        headers: { ...(tenant?.id ? { 'x-business-id': tenant.id } : {}) }
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro ao remover template')
      mutate()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getServiceName = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.name || '?'
  }

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Templates de Consumo</h2>
        <button 
          onClick={openNew}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>
      <p className="text-gray-400 mb-4">
        Defina o consumo padrão de produtos por serviço e tipo de veículo. Quando um serviço for realizado, o sistema deduzirá automaticamente a quantidade.
      </p>

      {error ? (
        <p className="text-red-300">{String(error.message || error)}</p>
      ) : isLoading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : templates.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-200">
            <thead className="bg-gray-800 border-b border-gray-700 text-gray-200">
              <tr>
                <th className="text-left p-3">Serviço</th>
                <th className="text-left p-3">Veículo</th>
                <th className="text-left p-3">Produto</th>
                <th className="text-left p-3">Receita</th>
                <th className="text-left p-3">Quantidade</th>
                <th className="text-left p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t: any) => (
                <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/60">
                  <td className="p-3">{t.service?.name || '?'}</td>
                  <td className="p-3">
                    <span className="bg-blue-500/15 text-blue-200 px-2 py-1 rounded text-xs">
                      {t.vehicleType}
                    </span>
                  </td>
                  <td className="p-3">{t.recipe?.product?.name || '?'}</td>
                  <td className="p-3">
                    <span className="text-purple-300 font-medium">
                      {t.recipe?.ratioProduct}:{t.recipe?.ratioWater}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-white">{t.quantityMl} ml</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-xs bg-gray-700 text-gray-200 px-3 py-1.5 rounded hover:bg-gray-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(t.id)}
                      disabled={deletingId === t.id}
                      className="text-xs bg-red-500/15 text-red-300 px-3 py-1.5 rounded hover:bg-red-500/25 disabled:opacity-50"
                    >
                      {deletingId === t.id ? 'Removendo...' : 'Remover'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p className="text-gray-300">Nenhum template configurado ainda</p>
          <p className="text-sm mt-2 text-gray-400">Clique em "Novo Template" para definir consumos padrão</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editing ? 'Editar Template' : 'Novo Template de Consumo'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Serviço *</label>
                  <select
                    value={form.serviceId}
                    onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    disabled={!!editing}
                  >
                    <option value="">Selecione um serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Veículo *</label>
                  <select
                    value={form.vehicleType}
                    onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="">Selecione um tipo</option>
                    {vehicleTypes.map((vt) => (
                      <option key={vt} value={vt}>{vt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Receita de Diluição *</label>
                  <select
                    value={form.recipeId}
                    onChange={(e) => setForm({ ...form, recipeId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    disabled={!!editing}
                  >
                    <option value="">Selecione uma receita</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.product?.name}) - {r.ratioProduct}:{r.ratioWater}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Quantidade (ml) *</label>
                  <input
                    type="number"
                    value={form.quantityMl}
                    onChange={(e) => setForm({ ...form, quantityMl: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Ex: 500"
                  />
                </div>
              </div>

              <div className="bg-gray-800/60 border border-gray-700 rounded p-3 text-sm text-gray-300">
                <p>
                  <strong>Como funciona:</strong> Quando um {form.serviceId ? getServiceName(form.serviceId) : 'serviço'} for realizado em um {form.vehicleType || 'veículo'}, 
                  o sistema deduzirá automaticamente {form.quantityMl || '?'} ml da diluição "{recipes.find(r => r.id === form.recipeId)?.name || '?'}" do estoque.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditing(null) }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : (editing ? 'Salvar alterações' : 'Criar Template')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
