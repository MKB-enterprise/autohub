'use client';

/**
 * Página: Sistema de Diluição e Estoque
 * /estoque/diluicao
 */

import { useState, useEffect } from 'react';
import { Beaker, Package, AlertTriangle, TrendingDown, Plus } from 'lucide-react';

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
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Produtos Concentrados</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>
      <p className="text-gray-400 mb-4">
        Cadastre produtos concentrados que serão diluídos antes do uso.
      </p>
      <div className="text-center py-12 text-gray-500">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-700" />
        <p className="text-gray-300">Nenhum produto cadastrado ainda</p>
        <p className="text-sm mt-2 text-gray-400">Clique em "Novo Produto" para começar</p>
      </div>
    </div>
  );
}

function RecipesView() {
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Receitas de Diluição</h2>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700">
          <Plus className="w-4 h-4" />
          Nova Receita
        </button>
      </div>
      <p className="text-gray-400 mb-4">
        Defina proporções de diluição (ex: 1:10, 1:20) para cada produto concentrado.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Exemplo de card de receita */}
        <RecipeCard />
      </div>
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
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Lotes Preparados</h2>
      </div>
      <p className="text-gray-400 mb-4">
        Histórico de soluções diluídas preparadas e baixas de estoque.
      </p>
      <div className="text-center py-12 text-gray-500">
        <Beaker className="w-16 h-16 mx-auto mb-4 text-gray-700" />
        <p className="text-gray-300">Nenhum lote preparado ainda</p>
      </div>
    </div>
  );
}

function TemplatesView() {
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Templates de Consumo</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>
      <p className="text-gray-400 mb-4">
        Defina o consumo padrão de produtos por serviço e tipo de veículo.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-200">
          <thead className="bg-gray-800 border-b border-gray-700 text-gray-200">
            <tr>
              <th className="text-left p-3">Serviço</th>
              <th className="text-left p-3">Tipo de Veículo</th>
              <th className="text-left p-3">Produto</th>
              <th className="text-left p-3">Receita</th>
              <th className="text-left p-3">Quantidade</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-800 hover:bg-gray-800/60">
              <td className="p-3">Lavagem Completa</td>
              <td className="p-3">
                <span className="bg-blue-500/15 text-blue-200 px-2 py-1 rounded text-xs">
                  SEDAN
                </span>
              </td>
              <td className="p-3">APC Super Concentrado</td>
              <td className="p-3">
                <span className="text-purple-300 font-medium">1:10</span>
              </td>
              <td className="p-3 font-semibold text-white">500 ml</td>
              <td className="p-3">
                <button className="text-blue-300 hover:underline text-xs">
                  Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
