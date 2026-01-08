"use client"

import useSWR from 'swr'
import { AdminPageWrapper } from '@/components/AdminPageWrapper'
import { Card } from '@/components/ui/Card'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function MovimentacoesPage() {
  const { data, isLoading } = useSWR('/api/inventory/movements', fetcher)

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Movimentações de Estoque</h1>
        <Card>
          {isLoading ? (
            <p className="text-gray-400">Carregando...</p>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-gray-400">
                  <tr>
                    <th className="py-2">Data</th>
                    <th className="py-2">Produto</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Qtd</th>
                    <th className="py-2">Custo</th>
                    <th className="py-2">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.map((m: any) => (
                    <tr key={m.id} className="text-gray-100">
                      <td className="py-2">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="py-2">{m.product?.name}</td>
                      <td className="py-2">{m.movementType}</td>
                      <td className="py-2">{Number(m.quantity)}</td>
                      <td className="py-2">{m.unitCost ? `R$ ${Number(m.unitCost).toFixed(2)}` : '-'}</td>
                      <td className="py-2">{m.appointmentId ? 'Agendamento' : m.budgetId ? 'Orçamento' : m.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">Nenhuma movimentação registrada.</p>
          )}
        </Card>
      </div>
    </AdminPageWrapper>
  )
}
