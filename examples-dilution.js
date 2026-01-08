// ================================================================
// EXEMPLOS PRÁTICOS - Sistema de Diluição AutoHub
// ================================================================

// ================================================================
// EXEMPLO 1: Setup Completo de um Produto
// ================================================================

async function exemploSetupCompletoProduto() {
  const businessId = 'clx123abc';
  const headers = {
    'Content-Type': 'application/json',
    'x-business-id': businessId,
  };

  // Passo 1: Criar categoria
  const categoria = await fetch('/api/product-categories', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'APC (Limpador Multiuso)',
      description: 'All Purpose Cleaners para limpeza geral'
    })
  }).then(r => r.json());

  console.log('✅ Categoria criada:', categoria.category.name);

  // Passo 2: Criar produto concentrado
  const produto = await fetch('/api/products-dilution', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      categoryId: categoria.category.id,
      name: 'Vonixx APC Super Concentrado',
      brand: 'Vonixx',
      isConcentrated: true,
      baseUnit: 'ml',
      packageSizeMl: 5000,  // Embalagem de 5 litros
      costTotal: 149.90,     // Custo: R$ 149,90
      stockMinMl: 1000       // Alerta quando < 1L
    })
  }).then(r => r.json());

  console.log('✅ Produto criado:', produto.product.name);

  // Passo 3: Registrar entrada de estoque (compra)
  const entrada = await fetch('/api/inventory-movements', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: produto.product.id,
      movementType: 'IN',
      quantity: 5000,        // 5 litros comprados
      unitCost: 0.02998,     // R$ 149,90 / 5000ml
      note: 'Compra inicial - Fornecedor XYZ',
      referenceType: 'PURCHASE'
    })
  }).then(r => r.json());

  console.log('✅ Estoque adicionado: 5000ml');

  // Passo 4: Criar receitas de diluição
  const receitas = [
    {
      name: 'Limpeza Pesada (1:10)',
      ratio: { product: 1, water: 10 },
      uso: 'Motor, rodas muito sujas'
    },
    {
      name: 'Limpeza Média (1:20)',
      ratio: { product: 1, water: 20 },
      uso: 'Bancos, painel, portas'
    },
    {
      name: 'Limpeza Leve (1:30)',
      ratio: { product: 1, water: 30 },
      uso: 'Manutenção rápida'
    }
  ];

  for (const r of receitas) {
    const receita = await fetch('/api/dilution-recipes', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productId: produto.product.id,
        name: r.name,
        ratioProduct: r.ratio.product,
        ratioWater: r.ratio.water,
        targetBottleMl: 1000  // Frasco padrão de 1L
      })
    }).then(res => res.json());

    console.log(`✅ Receita criada: ${r.name} - ${r.uso}`);
  }

  return produto.product;
}

// ================================================================
// EXEMPLO 2: Preparar Lotes de Diluição
// ================================================================

async function exemploPrepararLotes() {
  const businessId = 'clx123abc';
  const headers = {
    'Content-Type': 'application/json',
    'x-business-id': businessId,
    'x-user-id': 'user_funcionario_1'
  };

  // Buscar receita
  const receitas = await fetch(
    '/api/dilution-recipes?productId=prod_vonixx_apc',
    { headers }
  ).then(r => r.json());

  const receita1to10 = receitas.recipes.find(r => r.name.includes('1:10'));

  // Preparar 3 litros de solução 1:10
  const batch = await fetch('/api/dilution-batches', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      recipeId: receita1to10.id,
      numberOfBottles: 3,  // 3 frascos de 1L
      notes: 'Preparado para movimento do final de semana'
    })
  }).then(r => r.json());

  console.log('✅ Lote preparado:');
  console.log(`   Total solução: ${batch.batch.preparedTotalMl}ml`);
  console.log(`   Concentrado usado: ${batch.batch.usedConcentrateMl}ml`);
  console.log(`   Água usada: ${batch.batch.usedWaterMl}ml`);

  // Para 3L de solução 1:10:
  // Concentrado: ~273ml
  // Água: ~2727ml
  // Total: 3000ml
}

// ================================================================
// EXEMPLO 3: Configurar Templates de Consumo
// ================================================================

async function exemploConfigurarTemplates() {
  const businessId = 'clx123abc';
  const headers = {
    'Content-Type': 'application/json',
    'x-business-id': businessId,
  };

  // Buscar serviço "Lavagem Completa"
  const servicos = await fetch('/api/services', { headers })
    .then(r => r.json());
  const lavagemCompleta = servicos.find(s => s.name === 'Lavagem Completa');

  // Buscar produto e receita
  const produtos = await fetch('/api/products-dilution', { headers })
    .then(r => r.json());
  const apc = produtos.products.find(p => p.name.includes('APC'));

  const receitas = await fetch(
    `/api/dilution-recipes?productId=${apc.id}`,
    { headers }
  ).then(r => r.json());
  const receita1to20 = receitas.recipes.find(r => r.name.includes('1:20'));

  // Configurar consumo para diferentes tipos de veículos
  const templates = [
    { tipo: 'MOTO', quantidade: 250 },
    { tipo: 'HATCH', quantidade: 450 },
    { tipo: 'SEDAN', quantidade: 550 },
    { tipo: 'SUV', quantidade: 750 },
    { tipo: 'PICKUP', quantidade: 850 },
    { tipo: 'VAN', quantidade: 950 },
  ];

  for (const t of templates) {
    const template = await fetch('/api/service-usage-templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        serviceId: lavagemCompleta.id,
        vehicleType: t.tipo,
        productId: apc.id,
        recipeId: receita1to20.id,
        quantityMl: t.quantidade,
        notes: `Consumo médio para ${t.tipo}`
      })
    }).then(r => r.json());

    // Calcular consumo de concentrado
    const concentrado = Math.ceil(t.quantidade * 1 / 21);
    console.log(`✅ ${t.tipo}: ${t.quantidade}ml solução = ${concentrado}ml concentrado`);
  }
}

// ================================================================
// EXEMPLO 4: Fluxo Completo - Criar e Concluir Serviço
// ================================================================

async function exemploFluxoCompleto() {
  const businessId = 'clx123abc';
  const headers = {
    'Content-Type': 'application/json',
    'x-business-id': businessId,
    'x-user-id': 'user_atendente'
  };

  // 1. Cliente agenda serviço
  const appointment = await fetch('/api/appointments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerId: 'customer_joao',
      carId: 'car_honda_civic',  // SEDAN
      serviceId: 'service_lavagem_completa',
      startDatetime: '2026-01-10T14:00:00Z',
      // ... outros campos
    })
  }).then(r => r.json());

  console.log('✅ Agendamento criado:', appointment.id);

  // 2. Antes de concluir: Preview do consumo
  const preview = await fetch(
    `/api/appointments/${appointment.id}/complete`,
    { headers }
  ).then(r => r.json());

  console.log('\n📊 Preview de Consumo:');
  console.log(`Veículo: ${preview.vehicleType}`);
  preview.estimates.forEach(est => {
    console.log(`\nServiço: ${est.serviceName}`);
    est.products.forEach(p => {
      console.log(`  - ${p.productName}:`);
      console.log(`    Solução: ${p.solutionUsedMl}ml`);
      console.log(`    Concentrado: ${p.concentrateUsedMl}ml`);
      console.log(`    Estoque: ${p.currentStock}ml`);
      console.log(`    Status: ${p.hasEnoughStock ? '✅ OK' : '❌ Insuficiente'}`);
    });
  });
  console.log(`\nCusto total produtos: R$ ${preview.totalCost.toFixed(2)}`);
  console.log(`Pode concluir: ${preview.canComplete ? 'Sim' : 'Não'}`);

  // 3. Concluir serviço (dispara consumo automático)
  if (preview.canComplete) {
    const result = await fetch(
      `/api/appointments/${appointment.id}/complete`,
      { method: 'POST', headers }
    ).then(r => r.json());

    console.log('\n✅ Serviço concluído:');
    console.log(`   Usos registrados: ${result.usagesCreated}`);
    console.log(`   Movimentações: ${result.movementsCreated}`);
  }

  // 4. Verificar consumo registrado
  const consumo = await fetch(
    `/api/service-execution-product-usage?appointmentId=${appointment.id}`,
    { headers }
  ).then(r => r.json());

  console.log('\n📝 Consumo Registrado:');
  consumo.usages.forEach(u => {
    console.log(`   ${u.product.name}: ${u.quantityMl}ml (${u.source})`);
  });
}

// ================================================================
// EXEMPLO 5: Consultar Estoque e Alertas
// ================================================================

async function exemploConsultarEstoque() {
  const businessId = 'clx123abc';
  const headers = {
    'x-business-id': businessId,
  };

  // Consultar produtos abaixo do mínimo
  const baixoEstoque = await fetch(
    '/api/stock?belowMinimum=true',
    { headers }
  ).then(r => r.json());

  console.log('🚨 Produtos com estoque baixo:');
  baixoEstoque.products.forEach(p => {
    console.log(`\n${p.productName}:`);
    console.log(`  Atual: ${p.currentStockMl}ml (${p.packagesInStock.toFixed(2)} embalagens)`);
    console.log(`  Mínimo: ${p.minStockMl}ml`);
    console.log(`  Faltam: ${p.minStockMl - p.currentStockMl}ml`);
  });

  // Consultar estoque de um produto específico
  const produtoId = 'prod_vonixx_apc';
  const estoque = await fetch(
    `/api/stock?productId=${produtoId}`,
    { headers }
  ).then(r => r.json());

  console.log(`\n📦 Estoque de ${estoque.stock.productName}:`);
  console.log(`   Atual: ${estoque.stock.currentStockMl}ml`);
  console.log(`   Embalagem: ${estoque.stock.packageSizeMl}ml`);
  console.log(`   Equivale a: ${estoque.stock.packagesInStock.toFixed(2)} embalagens`);
  console.log(`   Status: ${estoque.stock.isBelowMinimum ? '🚨 Baixo' : '✅ OK'}`);
}

// ================================================================
// EXEMPLO 6: Ajuste Manual de Consumo
// ================================================================

async function exemploAjusteManual() {
  const businessId = 'clx123abc';
  const userId = 'user_supervisor';
  const headers = {
    'Content-Type': 'application/json',
    'x-business-id': businessId,
    'x-user-id': userId,
  };

  // Cenário: Funcionário usou mais produto que o padrão

  // 1. Criar consumo manual adicional
  const consumoExtra = await fetch('/api/service-execution-product-usage', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      appointmentId: 'appt_123',
      serviceId: 'service_lavagem',
      vehicleType: 'SEDAN',
      productId: 'prod_apc',
      recipeId: 'recipe_1to10',
      quantityMl: 200,  // Usou 200ml extra
      source: 'MANUAL'
    })
  }).then(r => r.json());

  console.log('✅ Consumo extra registrado: 200ml');

  // 2. Baixar estoque manualmente
  const movimento = await fetch('/api/inventory-movements', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: 'prod_apc',
      movementType: 'MANUAL_OUT',
      quantity: 18,  // ~18ml de concentrado (200ml solução 1:10)
      referenceType: 'MANUAL',
      note: 'Ajuste - carro muito sujo, usou mais produto'
    })
  }).then(r => r.json());

  console.log('✅ Estoque ajustado: -18ml concentrado');
}

// ================================================================
// EXEMPLO 7: Relatório de Consumo Mensal
// ================================================================

async function exemploRelatorioMensal() {
  const businessId = 'clx123abc';
  const headers = { 'x-business-id': businessId };

  // Buscar consumos do último mês
  const hoje = new Date();
  const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

  const consumos = await fetch(
    `/api/service-execution-product-usage?startDate=${mesPassado.toISOString()}`,
    { headers }
  ).then(r => r.json());

  // Agrupar por produto
  const porProduto = {};
  consumos.usages.forEach(u => {
    if (!porProduto[u.productId]) {
      porProduto[u.productId] = {
        nome: u.product.name,
        totalSolucao: 0,
        totalConcentrado: 0,
        servicos: 0
      };
    }

    porProduto[u.productId].totalSolucao += u.quantityMl;
    // Calcular concentrado se tiver receita
    if (u.recipe) {
      const conc = Math.ceil(
        u.quantityMl * u.recipe.ratioProduct / 
        (u.recipe.ratioProduct + u.recipe.ratioWater)
      );
      porProduto[u.productId].totalConcentrado += conc;
    } else {
      porProduto[u.productId].totalConcentrado += u.quantityMl;
    }
    porProduto[u.productId].servicos++;
  });

  console.log('📊 Relatório de Consumo - Último Mês\n');
  Object.values(porProduto).forEach(p => {
    console.log(`${p.nome}:`);
    console.log(`  Serviços: ${p.servicos}`);
    console.log(`  Solução usada: ${(p.totalSolucao / 1000).toFixed(2)}L`);
    console.log(`  Concentrado: ${(p.totalConcentrado / 1000).toFixed(2)}L`);
    console.log(`  Média por serviço: ${Math.round(p.totalSolucao / p.servicos)}ml`);
    console.log();
  });
}

// ================================================================
// EXEMPLO 8: Calcular Rentabilidade de Serviço
// ================================================================

async function exemploCalcularRentabilidade() {
  const businessId = 'clx123abc';
  const headers = { 'x-business-id': businessId };

  const serviceId = 'service_lavagem_completa';
  const vehicleType = 'SEDAN';

  // Buscar dados do serviço
  const servico = await fetch(`/api/services/${serviceId}`, { headers })
    .then(r => r.json());

  // Estimar consumo
  const estimate = await fetch(
    `/api/appointments/estimate?serviceId=${serviceId}&vehicleType=${vehicleType}`,
    { headers }
  ).then(r => r.json());

  console.log(`💰 Rentabilidade: ${servico.name} - ${vehicleType}\n`);
  console.log(`Preço do serviço: R$ ${servico.price.toFixed(2)}`);
  console.log(`\nCusto dos produtos:`);

  let custoTotal = 0;
  estimate.products.forEach(p => {
    const custo = (p.concentrateUsedMl / p.packageSizeMl) * p.packageCost;
    custoTotal += custo;
    console.log(`  ${p.productName}: R$ ${custo.toFixed(2)}`);
  });

  console.log(`\nCusto total produtos: R$ ${custoTotal.toFixed(2)}`);

  const lucro = servico.price - custoTotal;
  const margem = (lucro / servico.price) * 100;

  console.log(`Lucro bruto (sem mão de obra): R$ ${lucro.toFixed(2)}`);
  console.log(`Margem: ${margem.toFixed(1)}%`);
}

// ================================================================
// EXECUTAR EXEMPLOS
// ================================================================

// Para executar, descomentar a linha desejada:

// exemploSetupCompletoProduto();
// exemploPrepararLotes();
// exemploConfigurarTemplates();
// exemploFluxoCompleto();
// exemploConsultarEstoque();
// exemploAjusteManual();
// exemploRelatorioMensal();
// exemploCalcularRentabilidade();
