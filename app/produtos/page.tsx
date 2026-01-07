"use client"

import useSWR from 'swr'
import { useState } from 'react'
import { AdminPageWrapper } from '@/components/AdminPageWrapper'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ProdutosPage() {
  const { data, mutate, isLoading } = useSWR('/api/products', fetcher)
  const [form, setForm] = useState({ name: '', sku: '', unit: 'un', cost: '', currentStock: '', minStock: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!form.name || !form.cost) {
      alert('Nome e custo são obrigatórios')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || undefined,
          unit: form.unit,
          cost: Number(form.cost),
          currentStock: form.currentStock ? Number(form.currentStock) : 0,
          minStock: form.minStock ? Number(form.minStock) : 0
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao criar')
      alert('Produto criado')
      setForm({ name: '', sku: '', unit: 'un', cost: '', currentStock: '', minStock: '' })
      mutate()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Produtos e Estoque</h1>
          <span className="text-sm text-gray-400">{data?.length || 0} itens</span>
        </div>

        <Card title="Novo produto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input label="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            <Input label="Unidade" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            <Input label="Custo" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} required />
            <Input label="Estoque inicial" type="number" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: e.target.value })} />
            <Input label="Estoque mínimo" type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>

        <Card title="Itens em estoque">
          {isLoading ? (
            <p className="text-gray-400">Carregando...</p>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-gray-400">
                  <tr>
                    <th className="py-2">Nome</th>
                    <th className="py-2">SKU</th>
                    <th className="py-2">Unidade</th>
                    <th className="py-2">Custo</th>
                    <th className="py-2">Estoque</th>
                    <th className="py-2">Mínimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.map((p: any) => (
                    <tr key={p.id} className={p.currentStock < p.minStock ? 'text-amber-300' : 'text-gray-100'}>
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2">{p.sku || '-'}</td>
                      <td className="py-2">{p.unit}</td>
                      <td className="py-2">R$ {Number(p.cost).toFixed(2)}</td>
                      <td className="py-2">{p.currentStock}</td>
                      <td className="py-2">{p.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">Nenhum produto cadastrado.</p>
          )}
        </Card>
      </div>
    </AdminPageWrapper>
  )
}
