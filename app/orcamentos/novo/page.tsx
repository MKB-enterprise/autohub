"use client"

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { AdminPageWrapper } from '@/components/AdminPageWrapper'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const fetcher = (url: string) => fetch(url).then(res => res.json())

type BudgetItem = { name: string; quantity: string; unitPrice: string; serviceId?: string }

export default function NovoOrcamentoPage() {
  const router = useRouter()
  const { data: customers } = useSWR('/api/customers', fetcher)
  const { data: services } = useSWR('/api/services?activeOnly=true', fetcher)
  const [customerId, setCustomerId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<BudgetItem[]>([{ name: '', quantity: '1', unitPrice: '' }])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!customerId || items.some(i => !i.name || !i.quantity || !i.unitPrice)) {
      alert('Selecione cliente e preencha os itens')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          expiresAt: expiresAt || null,
          notes,
          items: items.map(i => ({
            name: i.name,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            serviceId: i.serviceId || null,
          }))
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      alert('Orçamento criado')
      router.push('/orcamentos')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const setItem = (index: number, patch: Partial<BudgetItem>) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Novo orçamento</h1>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Cliente</label>
              <select className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Selecione</option>
                {customers?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>
            <Input label="Validade" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-white font-semibold">Itens</h3>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-800/50 p-3 rounded-lg">
                <Input label="Nome" value={item.name} onChange={e => setItem(idx, { name: e.target.value })} />
                <Input label="Qtd" type="number" value={item.quantity} onChange={e => setItem(idx, { quantity: e.target.value })} />
                <Input label="Preço" type="number" value={item.unitPrice} onChange={e => setItem(idx, { unitPrice: e.target.value })} />
                <div>
                  <label className="text-sm text-gray-300">Serviço (opcional)</label>
                  <select className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2" value={item.serviceId || ''} onChange={e => setItem(idx, { serviceId: e.target.value })}>
                    <option value="">-</option>
                    {services?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setItems(prev => [...prev, { name: '', quantity: '1', unitPrice: '' }])}>Adicionar item</Button>
          </div>

          <div className="mt-6">
            <label className="text-sm text-gray-300">Observações</label>
            <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 mt-1" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => router.push('/orcamentos')}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </Card>
      </div>
    </AdminPageWrapper>
  )
}
