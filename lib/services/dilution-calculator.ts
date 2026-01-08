/**
 * Serviço de Cálculos de Diluição
 * Fórmulas e utilitários para cálculo de diluição de produtos concentrados
 */

import type {
  DilutionCalculation,
  DilutionFormulaParams,
  ConcentrateConsumptionParams,
} from '@/lib/types/dilution';

/**
 * Calcula as quantidades necessárias para preparar uma solução diluída
 * 
 * @param ratioProduct - Parte do produto concentrado (ex: 1 em 1:10)
 * @param ratioWater - Parte de água (ex: 10 em 1:10)
 * @param targetSolutionMl - Quantidade total de solução desejada em ML
 * @returns Cálculo completo da diluição
 * 
 * @example
 * // Para 1 litro de solução 1:10
 * calculateDilution(1, 10, 1000)
 * // Retorna: { concentrateMl: 91, waterMl: 909, ... }
 */
export function calculateDilution(
  ratioProduct: number,
  ratioWater: number,
  targetSolutionMl: number
): DilutionCalculation {
  if (ratioProduct <= 0) {
    throw new Error('Proporção do produto deve ser maior que zero');
  }
  
  if (ratioWater < 0) {
    throw new Error('Proporção de água não pode ser negativa');
  }
  
  if (targetSolutionMl <= 0) {
    throw new Error('Quantidade de solução deve ser maior que zero');
  }

  const totalParts = ratioProduct + ratioWater;
  
  // Fração de concentrado na solução
  const concentrateFraction = ratioProduct / totalParts;
  
  // Quantidade de concentrado necessária (arredonda para cima para não faltar)
  const concentrateMl = Math.ceil(targetSolutionMl * concentrateFraction);
  
  // Água é o restante
  const waterMl = targetSolutionMl - concentrateMl;
  
  // Percentual de concentrado
  const concentratePercentage = (concentrateFraction * 100);

  return {
    totalSolutionMl: targetSolutionMl,
    concentrateMl,
    waterMl,
    ratio: `${ratioProduct}:${ratioWater}`,
    concentratePercentage: parseFloat(concentratePercentage.toFixed(2)),
  };
}

/**
 * Calcula quanto concentrado foi consumido ao usar X ml de solução diluída
 * 
 * @param solutionUsedMl - Quantidade de solução diluída usada
 * @param ratioProduct - Parte do produto na receita
 * @param ratioWater - Parte de água na receita
 * @returns Quantidade de concentrado consumido (em ML)
 * 
 * @example
 * // Usou 500ml de solução 1:10, quanto concentrado foi consumido?
 * calculateConcentrateUsed(500, 1, 10)
 * // Retorna: 46 (ml de concentrado)
 */
export function calculateConcentrateUsed(
  solutionUsedMl: number,
  ratioProduct: number,
  ratioWater: number
): number {
  if (solutionUsedMl <= 0) {
    throw new Error('Quantidade de solução usada deve ser maior que zero');
  }
  
  const totalParts = ratioProduct + ratioWater;
  const concentrateFraction = ratioProduct / totalParts;
  
  // Arredonda para cima para não subestimar o consumo
  return Math.ceil(solutionUsedMl * concentrateFraction);
}

/**
 * Calcula quantos ML de solução podem ser preparados com X ml de concentrado
 * 
 * @param concentrateMl - Quantidade de concentrado disponível
 * @param ratioProduct - Parte do produto na receita
 * @param ratioWater - Parte de água na receita
 * @returns Quantidade máxima de solução que pode ser preparada
 * 
 * @example
 * // Tenho 100ml de concentrado, quanto de solução 1:10 posso fazer?
 * calculateMaxSolution(100, 1, 10)
 * // Retorna: 1100 (ml de solução)
 */
export function calculateMaxSolution(
  concentrateMl: number,
  ratioProduct: number,
  ratioWater: number
): number {
  if (concentrateMl <= 0) {
    return 0;
  }
  
  const totalParts = ratioProduct + ratioWater;
  const multiplier = totalParts / ratioProduct;
  
  // Arredonda para baixo para garantir que não vai faltar concentrado
  return Math.floor(concentrateMl * multiplier);
}

/**
 * Valida se há estoque suficiente de concentrado para preparar uma diluição
 * 
 * @param targetSolutionMl - Quantidade de solução desejada
 * @param availableConcentrateMl - Estoque disponível de concentrado
 * @param ratioProduct - Parte do produto
 * @param ratioWater - Parte de água
 * @returns true se há estoque suficiente
 */
export function hasEnoughConcentrate(
  targetSolutionMl: number,
  availableConcentrateMl: number,
  ratioProduct: number,
  ratioWater: number
): boolean {
  const required = calculateConcentrateUsed(targetSolutionMl, ratioProduct, ratioWater);
  return availableConcentrateMl >= required;
}

/**
 * Calcula o custo por ML de solução diluída
 * 
 * @param concentrateCostTotal - Custo total da embalagem de concentrado
 * @param concentratePackageMl - Tamanho da embalagem em ML
 * @param ratioProduct - Parte do produto
 * @param ratioWater - Parte de água
 * @returns Custo por ML da solução pronta
 * 
 * @example
 * // Embalagem de 5L (5000ml) custa R$ 150
 * // Diluição 1:10
 * calculateSolutionCostPerMl(150, 5000, 1, 10)
 * // Retorna: 0.00273 (R$ 0,00273 por ML de solução)
 */
export function calculateSolutionCostPerMl(
  concentrateCostTotal: number,
  concentratePackageMl: number,
  ratioProduct: number,
  ratioWater: number
): number {
  if (concentratePackageMl <= 0) {
    return 0;
  }
  
  // Custo por ML de concentrado
  const costPerMlConcentrate = concentrateCostTotal / concentratePackageMl;
  
  // Fração de concentrado na solução
  const totalParts = ratioProduct + ratioWater;
  const concentrateFraction = ratioProduct / totalParts;
  
  // Custo por ML de solução = custo do concentrado * fração
  return costPerMlConcentrate * concentrateFraction;
}

/**
 * Calcula quantos serviços podem ser feitos com o estoque disponível
 * 
 * @param availableConcentrateMl - Estoque disponível em ML
 * @param mlPerService - ML de solução usado por serviço
 * @param ratioProduct - Parte do produto
 * @param ratioWater - Parte de água
 * @returns Número de serviços possíveis (inteiro)
 */
export function calculateRemainingServices(
  availableConcentrateMl: number,
  mlPerService: number,
  ratioProduct: number,
  ratioWater: number
): number {
  if (mlPerService <= 0 || availableConcentrateMl <= 0) {
    return 0;
  }
  
  const concentratePerService = calculateConcentrateUsed(
    mlPerService,
    ratioProduct,
    ratioWater
  );
  
  return Math.floor(availableConcentrateMl / concentratePerService);
}

/**
 * Formata uma razão de diluição de forma amigável
 * 
 * @param ratioProduct - Parte do produto
 * @param ratioWater - Parte de água
 * @returns String formatada (ex: "1:10")
 */
export function formatRatio(ratioProduct: number, ratioWater: number): string {
  return `${ratioProduct}:${ratioWater}`;
}

/**
 * Converte volume em ML para litros de forma amigável
 * 
 * @param ml - Volume em ML
 * @returns String formatada (ex: "1,5 L" ou "500 ml")
 */
export function formatVolume(ml: number): string {
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${liters.toFixed(liters % 1 === 0 ? 0 : 1)} L`;
  }
  return `${ml} ml`;
}

/**
 * Calcula o custo total de concentrado para uma quantidade de solução
 * 
 * @param solutionMl - Quantidade de solução em ML
 * @param concentrateCostPerMl - Custo por ML do concentrado
 * @param ratioProduct - Parte do produto
 * @param ratioWater - Parte de água
 * @returns Custo total em reais
 */
export function calculateConcentrateCost(
  solutionMl: number,
  concentrateCostPerMl: number,
  ratioProduct: number,
  ratioWater: number
): number {
  const concentrateUsed = calculateConcentrateUsed(solutionMl, ratioProduct, ratioWater);
  return concentrateUsed * concentrateCostPerMl;
}
