const fetch = require('node-fetch');

const API_URL = process.env.ONTARIO_511_API_URL || 'https://api.511on.ca/v1/events';
const API_KEY = process.env.ONTARIO_511_API_KEY;

async function poll() {
  if (!API_KEY) {
    throw new Error('ONTARIO_511_API_KEY not configured');
  }

  const resp = await fetch(`${API_URL}?apikey=${API_KEY}&format=json`, {
    timeout: 10000,
  });

  if (!resp.ok) {
    throw new Error(`Ontario 511 returned ${resp.status}`);
  }

  const data = await resp.json();
  return data;
}

module.exports = { poll };
