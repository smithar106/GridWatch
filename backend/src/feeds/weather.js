const fetch = require('node-fetch');

const EC_ALERTS_URL = process.env.EC_ALERTS_URL || 'https://dd.weather.gc.ca/alerts/provinces/on.xml';

async function poll() {
  const resp = await fetch(EC_ALERTS_URL, {
    timeout: 10000,
  });

  if (!resp.ok) {
    throw new Error(`Environment Canada returned ${resp.status}`);
  }

  const text = await resp.text();
  return { raw: text, source: 'Environment Canada', fetched_at: new Date().toISOString() };
}

module.exports = { poll };
