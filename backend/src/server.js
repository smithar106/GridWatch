require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const ttcFeed = require('./feeds/ttc');
const on511Feed = require('./feeds/on511');
const weatherFeed = require('./feeds/weather');
const mockFeed = require('./feeds/mock');

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'app')));

let cache = { ttc: null, on511: null, weather: null, lastUpdated: null };
let feedStatus = { ttc: 'pending', on511: 'pending', weather: 'pending', mock: 'available' };

app.get('/api/all', (req, res) => {
  res.json({
    data: cache,
    status: feedStatus,
    generated_at: cache.lastUpdated || new Date().toISOString(),
  });
});

app.get('/api/status', (req, res) => {
  res.json({ status: feedStatus, cache_age_ms: cache.lastUpdated ? Date.now() - new Date(cache.lastUpdated).getTime() : null });
});

async function pollAll() {
  const results = await Promise.allSettled([
    ttcFeed.poll().then(d => { feedStatus.ttc = 'ok'; return d; }).catch(e => { feedStatus.ttc = 'error: ' + e.message; return null; }),
    on511Feed.poll().then(d => { feedStatus.on511 = 'ok'; return d; }).catch(e => { feedStatus.on511 = 'error: ' + e.message; return null; }),
    weatherFeed.poll().then(d => { feedStatus.weather = 'ok'; return d; }).catch(e => { feedStatus.weather = 'error: ' + e.message; return null; }),
  ]);

  cache = {
    ttc: results[0].status === 'fulfilled' ? results[0].value : mockFeed.ttc(),
    on511: results[1].status === 'fulfilled' ? results[1].value : mockFeed.on511(),
    weather: results[2].status === 'fulfilled' ? results[2].value : mockFeed.weather(),
    lastUpdated: new Date().toISOString(),
  };

  if (!results[0].value) feedStatus.ttc = 'fallback: mock';
  if (!results[1].value) feedStatus.on511 = 'fallback: mock';
  if (!results[2].value) feedStatus.weather = 'fallback: mock';
}

app.listen(PORT, () => {
  console.log(`GridWatch backend running on http://localhost:${PORT}`);
  pollAll();
  setInterval(pollAll, 30000);
});
