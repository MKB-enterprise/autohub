'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import type { User } from '@/lib/types'

interface EmployeesFormProps {
  onSave?: () => void
}

export function EmployeesSection({ onSave }: EmployeesFormProps) {
  const [employees, setEmployees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: ''
  })

  // Carregar funcionários
  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    try {
      setLoading(true)
      const response = await fetch('/api/users?role=STAFF&isActive=true')
      if (!response.ok) throw new Error('Erro ao carregar funcionários')
      const data = await response.json()
      setEmployees(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddEmployee() {
    try {
      setSaving(true)
      setError(null)

      if (!formData.fullName || !formData.email || !formData.password) {
        setError('Nome, email e senha são obrigatórios')
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || null,
          role: 'STAFF'
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erro ao adicionar funcionário')
      }

      const newEmployee = await response.json()
      setEmployees([...employees, newEmployee])
      setFormData({ fullName: '', email: '', password: '', phone: '' })
      setShowForm(false)
      setSuccess('Funcionário adicionado com sucesso!')
      onSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveEmployee(id: string) {
    if (!confirm('Tem certeza que deseja remover este funcionário?')) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Erro ao remover funcionário')

      setEmployees(employees.filter(e => e.id !== id))
      setSuccess('Funcionário removido com sucesso!')
      onSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400">Carregando funcionários...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Funcionários</h3>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie os funcionários que podem visualizar a agenda
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          +
          {showForm ? 'Cancelar' : 'Adicionar Funcionário'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-900 border border-gray-700">
          <h4 className="font-semibold text-white mb-4">Novo Funcionário</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nome Completo
              </label>
              <Input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ex: João Silva"
                className="bg-slate-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: joao@empresa.com"
                className="bg-slate-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Senha
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Escolha uma senha segura"
                className="bg-slate-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Telefone (opcional)
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: (11) 99999-9999"
                className="bg-slate-800 border-gray-600 text-white"
              />
            </div>

            <Button
              onClick={handleAddEmployee}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Adicionando...' : 'Adicionar Funcionário'}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/50 border border-gray-700 rounded-lg">
            <p className="text-gray-400">Nenhum funcionário cadastrado</p>
            <p className="text-sm text-gray-500 mt-2">
              Adicione funcionários para que apareçam na agenda
            </p>
          </div>
        ) : (
          employees.map((employee) => (
            <Card
              key={employee.id}
              className="bg-slate-900 border border-gray-700 flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold text-white">{employee.fullName}</h4>
                <p className="text-sm text-gray-400">{employee.email}</p>
                {employee.phone && (
                  <p className="text-sm text-gray-400">{employee.phone}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveEmployee(employee.id)}
                disabled={saving}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                title="Remover funcionário"
              >
                ✕
              </button>
            </Card>
          ))
        )}
      </div>

      <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          💡 <strong>Dica:</strong> Adicione os funcionários que devem acessar a agenda. Eles aparecerão como colunas no board de agendamentos.
        </p>
      </div>
    </div>
  )
}
