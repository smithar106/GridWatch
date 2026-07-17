const fetch = require('node-fetch');

const TTC_RT_URL = process.env.TTC_RT_URL || 'https://transit.land/api/v2/rest/agencies/ttc/route_geometries';

async function poll() {
  if (!process.env.TTC_RT_URL) {
    throw new Error('TTC_RT_URL not configured');
  }

  const resp = await fetch(TTC_RT_URL, {
    headers: { 'Accept': 'application/json' },
    timeout: 10000,
  });

  if (!resp.ok) {
    throw new Error(`TTC feed returned ${resp.status}`);
  }

  const data = await resp.json();
  return data;
}

module.exports = { poll };
