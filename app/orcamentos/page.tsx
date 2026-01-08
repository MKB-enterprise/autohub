"use client"

import Link from 'next/link'
import useSWR from 'swr'
import { AdminPageWrapper } from '@/components/AdminPageWrapper'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function OrcamentosPage() {
  const { data, isLoading } = useSWR('/api/budgets', fetcher)

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Orçamentos</h1>
          <Link href="/orcamentos/novo"><Button>Novo orçamento</Button></Link>
        </div>

        <Card>
          {isLoading ? (
            <p className="text-gray-400">Carregando...</p>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-gray-400">
                  <tr>
                    <th className="py-2">Cliente</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Validade</th>
                    <th className="py-2">Assinado</th>
                    <th className="py-2">Link público</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.map((b: any) => (
                    <tr key={b.id} className="text-gray-100">
                      <td className="py-2">{b.customer?.name || '-'}</td>
                      <td className="py-2">{b.status}</td>
                      <td className="py-2">R$ {Number(b.total).toFixed(2)}</td>
                      <td className="py-2">{b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : '-'}</td>
                      <td className="py-2">{b.signedAt ? new Date(b.signedAt).toLocaleString() : 'Não'}</td>
                      <td className="py-2 text-blue-300 underline">
                        <Link href={`/api/budgets/public/${b.publicToken}`} target="_blank">Abrir</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">Nenhum orçamento.</p>
          )}
        </Card>
      </div>
    </AdminPageWrapper>
  )
}
