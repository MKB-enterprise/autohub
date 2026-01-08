"use client"

import useSWR from 'swr'
import { AdminPageWrapper } from '@/components/AdminPageWrapper'
import { Card } from '@/components/ui/Card'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function FinanceiroPage() {
  const { data: accounts } = useSWR('/api/finance/accounts', fetcher)
  const { data: txs, isLoading } = useSWR('/api/finance/transactions', fetcher)

  const revenue = txs?.filter((t: any) => t.type === 'REVENUE').reduce((s: number, t: any) => s + Number(t.amount), 0) || 0
  const expense = txs?.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + Number(t.amount), 0) || 0
  const profit = revenue - expense

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Financeiro</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Receitas">
            <p className="text-3xl font-bold text-green-400">R$ {revenue.toFixed(2)}</p>
          </Card>
          <Card title="Despesas">
            <p className="text-3xl font-bold text-red-400">R$ {expense.toFixed(2)}</p>
          </Card>
          <Card title="Resultado">
            <p className={`text-3xl font-bold ${profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>R$ {profit.toFixed(2)}</p>
          </Card>
        </div>

        <Card title="Lançamentos">
          {isLoading ? (
            <p className="text-gray-400">Carregando...</p>
          ) : txs && txs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-gray-400">
                  <tr>
                    <th className="py-2">Data</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Conta</th>
                    <th className="py-2">Valor</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {txs.map((t: any) => (
                    <tr key={t.id} className="text-gray-100">
                      <td className="py-2">{new Date(t.occurredAt).toLocaleDateString()}</td>
                      <td className="py-2">{t.type}</td>
                      <td className="py-2">{t.account?.name || '-'}</td>
                      <td className="py-2">R$ {Number(t.amount).toFixed(2)}</td>
                      <td className="py-2">{t.status}</td>
                      <td className="py-2">{t.appointmentId ? 'Agendamento' : t.budgetId ? 'Orçamento' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">Nenhum lançamento.</p>
          )}
        </Card>

        <Card title="Contas (plano de contas)">
          {accounts?.length ? (
            <ul className="space-y-2 text-gray-100">
              {accounts.map((a: any) => (
                <li key={a.id} className="flex justify-between bg-gray-800/50 p-3 rounded-lg">
                  <span>{a.name}</span>
                  <span className="text-gray-400">{a.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">Nenhuma conta cadastrada.</p>
          )}
        </Card>
      </div>
    </AdminPageWrapper>
  )
}
