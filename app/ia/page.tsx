"use client"

import { useState } from 'react'
import { AdminPageWrapper } from '@/components/AdminPageWrapper'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function IaPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar insights')
      setResult(json)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Insights com IA</h1>
        <Card>
          <p className="text-gray-300 mb-4">Gere insights financeiros e de estoque com base nos dados recentes.</p>
          <Button onClick={handleAnalyze} disabled={loading}>{loading ? 'Analisando...' : 'Analisar com IA'}</Button>
          {result && (
            <div className="mt-4 space-y-2 text-gray-100">
              <p><strong>Receitas:</strong> R$ {Number(result.revenueTotal).toFixed(2)}</p>
              <p><strong>Despesas:</strong> R$ {Number(result.expenseTotal).toFixed(2)}</p>
              <p><strong>Lucro estimado:</strong> R$ {Number(result.profit).toFixed(2)}</p>
              <div className="mt-3">
                <p className="font-semibold">Insights:</p>
                <ul className="list-disc ml-5 text-gray-200">
                  {result.insights?.map((i: string, idx: number) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminPageWrapper>
  )
}
