function ttc() {
  return {
    source: 'mock',
    vehicles: [
      { id: 'bus-1001', route: '504', lat: 43.6447, lon: -79.4014, delay_min: 8, status: 'delayed' },
      { id: 'bus-1002', route: '510', lat: 43.6596, lon: -79.4022, delay_min: 12, status: 'delayed' },
      { id: 'bus-1003', route: '29', lat: 43.7070, lon: -79.3984, delay_min: 3, status: 'on_time' },
      { id: 'bus-1004', route: '34', lat: 43.7066, lon: -79.3980, delay_min: 0, status: 'on_time' },
      { id: 'bus-1005', route: '505', lat: 43.6561, lon: -79.3802, delay_min: 6, status: 'delayed' },
    ],
    alerts: [
      { route: '504', type: 'detour', description: 'Streetcar detour at Bathurst due to track work' },
      { route: '510', type: 'single_track', description: 'Single-track operation at Spadina & College' },
    ],
  };
}

function on511() {
  return {
    source: 'mock',
    events: [
      { id: '511-001', highway: '401', direction: 'EB', location: 'West of Keele St', type: 'construction', lane: 'right shoulder', start: '2026-07-16T20:00:00Z', end: '2026-07-17T05:00:00Z' },
      { id: '511-002', highway: '410', direction: 'NB', location: 'At Steeles Ave', type: 'maintenance', lane: 'left lane', start: '2026-07-16T22:00:00Z', end: '2026-07-17T05:00:00Z' },
    ],
  };
}

function weather() {
  return {
    source: 'mock',
    condition: 'clear',
    temperature_c: 22,
    humidity: 45,
    alerts: [],
    forecast: [
      { period: 'today', condition: 'sunny', high: 24, low: 16 },
      { period: 'tonight', condition: 'clear', high: 16, low: 11 },
      { period: 'tomorrow', condition: 'partly_cloudy', high: 26, low: 17 },
    ],
  };
}

module.exports = { ttc, on511, weather };
