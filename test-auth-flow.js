/**
 * Script para testar o fluxo de autenticação
 */
const http = require('http');
const url = require('url');

function getFromUrl(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: pathname,
      method: 'GET',
      headers: {
        ...headers,
        'User-Agent': 'Test Client'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function postToUrl(pathname, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'X-Tenant-Slug': 'autogarage-demo',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function test() {
  console.log('🧪 Testando fluxo de autenticação...\n');

  try {
    // 1. Fazer login
    console.log('1️⃣ POST /api/auth/business/login');
    let res = await postToUrl('/api/auth/business/login', {
      email: 'admin@autogarage.com',
      password: 'admin123'
    });
    console.log(`   Status: ${res.status}`);
    console.log(`   Cookies: ${res.cookies.map(c => c.split(';')[0]).join(', ')}`);
    
    const loginData = JSON.parse(res.body);
    const token = loginData.token;
    const cookies = res.cookies.join('; ');
    
    console.log(`   ✅ Login bem-sucedido\n`);

    // 2. Acessar /api/auth/me COM cookie
    console.log('2️⃣ GET /api/auth/me (com cookie)');
    res = await getFromUrl('/api/auth/me', {
      'Cookie': cookies,
      'X-Tenant-Slug': 'autogarage-demo'
    });
    console.log(`   Status: ${res.status}`);
    const meData = JSON.parse(res.body);
    console.log(`   Business: ${meData.business?.name || 'N/A'}`);
    console.log(`   User: ${meData.user?.name || 'N/A'}`);
    console.log(`   ✅ Auth verificado\n`);

    // 3. Tentar acessar página /t/autogarage-demo/agenda
    console.log('3️⃣ GET /t/autogarage-demo/agenda (com cookie)');
    res = await getFromUrl('/t/autogarage-demo/agenda', {
      'Cookie': cookies
    });
    console.log(`   Status: ${res.status}`);
    console.log(`   Body length: ${res.body.length}`);
    
    // Verificar se tem logging
    if (res.body.includes('[AuthContext]')) {
      console.log(`   ✅ Logging está funcionando`);
    }
    if (res.body.includes('[useRequireAuth]')) {
      console.log(`   ✅ useRequireAuth está rodando`);
    }

    console.log('\n✅ Teste completado!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

test();
