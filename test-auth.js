#!/usr/bin/env node
/**
 * Script para testar o fluxo de autenticação completo
 */
const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': 'autogarage-demo',
      },
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  console.log('🧪 Iniciando testes de autenticação...\n');

  try {
    // 1. Tentar acessar /api/auth/me sem token
    console.log('1️⃣ GET /api/auth/me (sem token)');
    let res = await makeRequest('GET', '/api/auth/me');
    console.log(`   Status: ${res.status}`);
    console.log(`   Body: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.status, 200, 'Deve retornar 200 mesmo sem token');
    assert.strictEqual(res.body.user, null, 'user deve ser null sem token');
    assert.strictEqual(res.body.business, null, 'business deve ser null sem token');
    console.log('   ✅ Passou\n');

    // 2. Login como business
    console.log('2️⃣ POST /api/auth/business/login');
    res = await makeRequest('POST', '/api/auth/business/login', {
      email: 'admin@autogarage.com',
      password: 'admin123',
    });
    console.log(`   Status: ${res.status}`);
    console.log(`   Business: ${res.body.business?.name}`);
    assert.strictEqual(res.status, 200, 'Deve fazer login com sucesso');
    assert(res.body.token, 'Deve retornar token');
    
    // Extrair cookie
    const setCookieHeader = res.headers['set-cookie'];
    console.log(`   Cookies: ${setCookieHeader}`);
    const authCookie = setCookieHeader?.[0]?.split(';')[0];
    console.log(`   Auth Token: ${authCookie}`);
    console.log('   ✅ Passou\n');

    // 3. Verificar auth com token
    if (authCookie) {
      console.log('3️⃣ GET /api/auth/me (com token)');
      res = await makeRequest('GET', '/api/auth/me', null, authCookie);
      console.log(`   Status: ${res.status}`);
      console.log(`   Business: ${res.body.business?.name}`);
      assert.strictEqual(res.status, 200, 'Deve retornar 200');
      assert(res.body.business, 'Deve retornar business');
      console.log('   ✅ Passou\n');
    }

    console.log('✅ Todos os testes passaram!');
  } catch (err) {
    console.error('❌ Erro nos testes:', err.message);
    process.exit(1);
  }
}

test();
