"use client"

import { useState } from 'react'
import useSWR from 'swr'
import { AdminPageWrapper } from '@/components/AdminPageWrapper'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function WhatsAppFilaPage() {
  const { data, mutate, isLoading } = useSWR('/api/whatsapp/queue', fetcher)
  const [form, setForm] = useState({ phone: '', templateKey: 'APPOINTMENT_24H_REMINDER', payload: '{}' })
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!form.phone || !form.templateKey) {
      alert('Telefone e template são obrigatórios')
      return
    }
    setSending(true)
    try {
      const parsedPayload = form.payload ? JSON.parse(form.payload) : {}
      const res = await fetch('/api/whatsapp/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, templateKey: form.templateKey, payload: parsedPayload })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao enfileirar')
      alert('Mensagem enfileirada')
      mutate()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Fila de WhatsApp</h1>

        <Card title="Nova mensagem">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Telefone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="Template" value={form.templateKey} onChange={e => setForm({ ...form, templateKey: e.target.value })} />
            <Input label="Payload (JSON)" value={form.payload} onChange={e => setForm({ ...form, payload: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSend} disabled={sending}>{sending ? 'Enviando...' : 'Enfileirar'}</Button>
          </div>
        </Card>

        <Card title="Mensagens">
          {isLoading ? (
            <p className="text-gray-400">Carregando...</p>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-gray-400">
                  <tr>
                    <th className="py-2">Criada</th>
                    <th className="py-2">Telefone</th>
                    <th className="py-2">Template</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.map((m: any) => (
                    <tr key={m.id} className="text-gray-100">
                      <td className="py-2">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="py-2">{m.phone}</td>
                      <td className="py-2">{m.templateKey}</td>
                      <td className="py-2">{m.status}</td>
                      <td className="py-2">{m.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">Nenhuma mensagem na fila.</p>
          )}
        </Card>
      </div>
    </AdminPageWrapper>
  )
}
