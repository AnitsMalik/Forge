import http from 'http';

function req(options, body) {
  return new Promise((resolve) => {
    const r = http.request(options, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  const login = await req(
    { hostname: 'localhost', port: 4000, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'sarah@apex.com', password: 'Password123!' }
  );
  const token = login.data.data.tokens.accessToken;
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';

  const tplRes = await req(
    { hostname: 'localhost', port: 4000, path: `/api/v1/brands/${brandId}/templates`, method: 'GET', headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('✓ Status:', tplRes.status);
  console.log('✓ Directive 11 Templates returned:', tplRes.data.data.length);
  console.log('✓ Categories:', tplRes.data.data.map(t => t.category).join(', '));
}
main();
