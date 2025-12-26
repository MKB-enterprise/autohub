'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { Alert } from '@/components/ui/Alert'
import { useAsyncForm } from '@/lib/hooks/useAsyncAction'

interface Settings {
  id: string
  openingTimeWeekday: string
  closingTimeWeekday: string
  maxCarsPerSlot: number
  timezone: string
  // Campos de reputação
  reputationEnabled: boolean
  reputationNoShowPenalty: number
  reputationMinForAdvance: number
  reputationAdvancePercent: number
  reputationRecoveryOnShow: boolean
}

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reputationEnabled, setReputationEnabled] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações')
      }

      const data = await response.json()
      setSettings(data)
      setReputationEnabled(data.reputationEnabled)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const { onSubmit: handleSubmit, isSubmitting: saving } = useAsyncForm({
    onSubmit: async (e) => {
    const formData = new FormData(e.currentTarget)

    const noShowPenalty = formData.get('reputationNoShowPenalty')
    const minForAdvance = formData.get('reputationMinForAdvance')
    const advancePercent = formData.get('reputationAdvancePercent')

    const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingTimeWeekday: formData.get('openingTimeWeekday'),
          closingTimeWeekday: formData.get('closingTimeWeekday'),
          maxCarsPerSlot: parseInt(formData.get('maxCarsPerSlot') as string),
          timezone: formData.get('timezone'),
          // Campos de reputação
          reputationEnabled: reputationEnabled,
          // Só envia os valores numéricos se existirem (sistema ativado)
          ...(noShowPenalty && { reputationNoShowPenalty: parseFloat(noShowPenalty as string) }),
          ...(minForAdvance && { reputationMinForAdvance: parseFloat(minForAdvance as string) }),
          ...(advancePercent && { reputationAdvancePercent: parseInt(advancePercent as string) }),
          ...(reputationEnabled && { reputationRecoveryOnShow: formData.get('reputationRecoveryOnShow') === 'on' })
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar configurações')
      }

      return await response.json()
    },
    onSuccess: (data) => {
      setSettings(data)
      setSuccess('Configurações salvas com sucesso!')
    },
    onError: (err) => {
      setError(err.message)
    }
  })

  if (loading) {
    return <Loading />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-gray-400 mt-1">Configurações da agenda</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Horário de Funcionamento</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Abertura"
                name="openingTimeWeekday"
                type="time"
                defaultValue={settings?.openingTimeWeekday}
                required
              />
              <Input
                label="Fechamento"
                name="closingTimeWeekday"
                type="time"
                defaultValue={settings?.closingTimeWeekday}
                required
              />
            </div>

            <div className="text-sm text-gray-400">
              <p>Define o horário de funcionamento da estética.</p>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Capacidade de Atendimento</h2>
            
            <Input
              label="Quantidade de boxes/vagas simultâneas"
              name="maxCarsPerSlot"
              type="number"
              min="1"
              defaultValue={settings?.maxCarsPerSlot}
              required
            />

            <div className="text-sm text-gray-400">
              <p>Define quantos carros podem ser atendidos ao mesmo tempo.</p>
              <p className="mt-1">O sistema automaticamente bloqueia horários ocupados considerando a duração dos serviços + 15min de tolerância.</p>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Fuso Horário</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Timezone <span className="text-red-500">*</span>
              </label>
              <select
                name="timezone"
                defaultValue={settings?.timezone}
                required
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo (Brasília)</option>
                <option value="America/Manaus">America/Manaus</option>
                <option value="America/Rio_Branco">America/Rio_Branco</option>
                <option value="America/Noronha">America/Noronha</option>
              </select>
            </div>

            <div className="text-sm text-gray-400">
              <p>Define o fuso horário usado para os agendamentos.</p>
            </div>
          </div>

          {/* Seção de Reputação */}
          <div className="border-t border-gray-700 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">⭐ Sistema de Reputação</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reputationEnabled}
                  onChange={(e) => setReputationEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-300">Ativar</span>
              </label>
            </div>

            {reputationEnabled ? (
              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nota após falta
                    </label>
                    <input
                      type="number"
                      name="reputationNoShowPenalty"
                      step="0.5"
                      min="0"
                      max="5"
                      defaultValue={settings?.reputationNoShowPenalty}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Nota que o cliente fica após uma falta</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nota mínima (sem antecipado)
                    </label>
                    <input
                      type="number"
                      name="reputationMinForAdvance"
                      step="0.5"
                      min="0"
                      max="5"
                      defaultValue={settings?.reputationMinForAdvance}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Abaixo desta nota, exige antecipado</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      % Pagamento Antecipado
                    </label>
                    <input
                      type="number"
                      name="reputationAdvancePercent"
                      min="0"
                      max="100"
                      defaultValue={settings?.reputationAdvancePercent}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Porcentagem exigida para clientes com nota baixa</p>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        name="reputationRecoveryOnShow"
                        defaultChecked={settings?.reputationRecoveryOnShow}
                        className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-300">Reabilitar ao comparecer</span>
                    </label>
                  </div>
                </div>

                <div className="text-sm text-gray-400 p-3 bg-gray-900/50 rounded-lg">
                  <p className="font-medium text-white mb-2">📋 Como funciona:</p>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>Cliente começa com nota <span className="text-green-400">5.0</span></li>
                    <li>Uma falta muda a nota para <span className="text-red-400">{settings?.reputationNoShowPenalty || 2.5}</span></li>
                    <li>Nota abaixo de <span className="text-amber-400">{settings?.reputationMinForAdvance || 3.0}</span> exige <span className="text-amber-400">{settings?.reputationAdvancePercent || 50}%</span> antecipado</li>
                    {settings?.reputationRecoveryOnShow !== false && (
                      <li>Ao comparecer pagando antecipado, nota volta para <span className="text-green-400">5.0</span></li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <p className="text-gray-500 text-sm">
                  ⚪ Sistema de reputação desativado. Todos os clientes podem agendar normalmente sem restrições.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Como funciona o agendamento</h2>
          <div className="text-sm text-gray-400 space-y-3">
            <div className="flex gap-3">
              <span className="text-cyan-400">📅</span>
              <p>Os horários são disponibilizados a cada <strong className="text-white">30 minutos</strong> (8:00, 8:30, 9:00...)</p>
            </div>
            <div className="flex gap-3">
              <span className="text-cyan-400">⏱️</span>
              <p>Ao agendar um serviço, o sistema bloqueia o tempo necessário baseado na <strong className="text-white">duração do serviço</strong></p>
            </div>
            <div className="flex gap-3">
              <span className="text-cyan-400">⏰</span>
              <p>É adicionada uma <strong className="text-white">tolerância de 15 minutos</strong> para atrasos do cliente</p>
            </div>
            <div className="flex gap-3">
              <span className="text-cyan-400">🚗</span>
              <p>Se você tem múltiplos boxes, pode atender mais de um carro no mesmo horário</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">⚠️ Importante</h2>
          <div className="text-sm text-gray-400 space-y-2">
            <p>• Mudanças no horário de funcionamento não afetam agendamentos já criados.</p>
            <p>• Reduzir a capacidade de carros pode causar conflitos com agendamentos existentes.</p>
            <p>• É recomendado revisar a agenda após fazer alterações significativas.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
