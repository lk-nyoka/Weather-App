const API_KEY = '7eae2a450271c306cf45b2618e7d760c';
let unit = 'metric';
let cities = JSON.parse(localStorage.getItem('atmos_cities') || '[]');
let saved  = JSON.parse(localStorage.getItem('atmos_saved')  || '[]');
 
// Popular cities for autocomplete
const SUGGESTIONS = [
  'London','New York','Tokyo','Paris','Sydney','Dubai','Singapore',
  'Berlin','Toronto','Mumbai','Cape Town','Johannesburg','São Paulo',
  'Mexico City','Seoul','Bangkok','Cairo','Lagos','Nairobi','Amsterdam',
  'Rome','Madrid','Vienna','Stockholm','Oslo','Copenhagen','Helsinki',
  'Warsaw','Prague','Budapest','Athens','Istanbul','Moscow','Beijing',
  'Shanghai','Hong Kong','Jakarta','Karachi','Dhaka','Manila','Bogotá',
  'Lima','Santiago','Buenos Aires','Casablanca','Accra','Addis Ababa'
];
 
const weatherIcons = {
  Clear:'☀️', Clouds:'☁️', Rain:'🌧️', Drizzle:'🌦️',
  Snow:'❄️', Thunderstorm:'⛈️', Mist:'🌫️', Haze:'🌫️',
  Fog:'🌁', Dust:'💨', Smoke:'💨', default:'🌡️'
};
 
const weatherClass = {
  Clear:'clear', Clouds:'clouds', Rain:'rain', Drizzle:'rain',
  Snow:'snow', Thunderstorm:'thunderstorm', Mist:'mist', Haze:'mist'
};
 
// ── Autocomplete ──
const input = document.getElementById('cityInput');
const acBox = document.getElementById('autocomplete');
 
input.addEventListener('input', () => {
  const q = input.value.trim().toLowerCase();
  if (!q) { acBox.classList.remove('show'); return; }
  const matches = SUGGESTIONS.filter(c => c.toLowerCase().startsWith(q)).slice(0, 6);
  if (!matches.length) { acBox.classList.remove('show'); return; }
  acBox.innerHTML = matches.map(c => `
    <div class="ac-item" onclick="selectCity('${c}')">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
      ${c}
    </div>`).join('');
  acBox.classList.add('show');
});
 
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) acBox.classList.remove('show');
});
 
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') { acBox.classList.remove('show'); addCity(); }
});
 
function selectCity(c) {
  input.value = c;
  acBox.classList.remove('show');
  addCity();
}
 
// ── Unit toggle ──
document.querySelectorAll('.unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    unit = btn.dataset.unit;
    refreshAll();
  });
});
 
// ── Tabs ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + '-panel').classList.add('active');
  });
});
 
// ── Fetch weather ──
async function fetchWeather(city) {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${unit}&appid=${API_KEY}`);
  if (!res.ok) throw new Error('not found');
  const data = await res.json();
  if (data.cod === '404' || data.cod === 404) throw new Error('not found');
  return data;
}
 
// ── Add city ──
document.getElementById('addBtn').addEventListener('click', addCity);
 
async function addCity() {
  const city = input.value.trim();
  if (!city) return;
  if (cities.includes(city.toLowerCase())) { showToast(`${city} already added`); return; }
 
  input.value = '';
  try {
    const data = await fetchWeather(city);
    const name = data.name;
    if (!cities.includes(name.toLowerCase())) {
      cities.unshift(name.toLowerCase());
      saveData();
      renderGrid();
    }
  } catch {
    showToast(`City "${city}" not found`);
  }
}
 
// ── Render grid ──
async function renderGrid() {
  const grid = document.getElementById('cityGrid');
  const empty = document.getElementById('emptyState');
  if (!cities.length) {
    grid.innerHTML = '';
    grid.appendChild(empty);
    return;
  }
 
  // Preserve existing cards, add new ones
  grid.innerHTML = '';
  cities.forEach((city, i) => {
    const card = createLoadingCard(city, i);
    grid.appendChild(card);
    loadCardData(card, city);
  });
}
 
function createLoadingCard(city, i) {
  const card = document.createElement('div');
  card.className = 'city-card loading';
  card.dataset.city = city;
  card.style.animationDelay = (i * 60) + 'ms';
  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-city">${capitalise(city)}</div>
        <div class="card-country">Loading…</div>
      </div>
      <div class="card-icon"><div class="spinner"></div></div>
    </div>
    <div class="card-mid"><div class="card-temp">--</div><div class="card-unit">${unit==='metric'?'°C':'°F'}</div></div>
    <div class="card-desc">fetching</div>
    <div class="card-bottom">
      <div class="card-stat"><span class="card-stat-label">Humidity</span><span class="card-stat-val">--%</span></div>
      <div class="card-stat"><span class="card-stat-label">Wind</span><span class="card-stat-val">--</span></div>
      <div class="card-stat"><span class="card-stat-label">Feels</span><span class="card-stat-val">--</span></div>
    </div>
    <button class="card-remove" title="Remove">✕</button>
    ${saved.includes(city) ? '<span class="card-saved-badge">★ saved</span>' : ''}
  `;
  card.querySelector('.card-remove').addEventListener('click', e => { e.stopPropagation(); removeCity(city); });
  card.addEventListener('click', () => saveSearch(city));
  return card;
}
 
async function loadCardData(card, city) {
  try {
    const data = await fetchWeather(city);
    const main = data.weather[0].main;
    const icon = weatherIcons[main] || weatherIcons.default;
    const wClass = weatherClass[main] || '';
    const unitSym = unit === 'metric' ? '°C' : '°F';
    const windUnit = unit === 'metric' ? 'km/h' : 'mph';
 
    card.classList.remove('loading');
    if (wClass) card.classList.add(wClass);
    const imageMap = {
    Clear:        'michel-catalisano-ENngHQ_gHGw-unsplash.jpg',
    Rain:         'suhyeon-choi-HCDugQDdtfc-unsplash.jpg',
    Snow:         'greg-rakozy-dqE4raxMqlo-unsplash.jpg',
    Clouds:       'billy-huynh-v9bnfMCyKbg-unsplash.jpg',
    Mist:         'annie-spratt-7CME6Wlgrdk-unsplash.jpg',
    Haze:         'paul-earle-l98YXp1X8dA-unsplash.jpg',
    };
    const imgSrc = imageMap[main] || 'michel-catalisano-ENngHQ_gHGw-unsplash.jpg';
    card.style.backgroundImage = `url('${imgSrc}')`;
    card.style.backgroundSize = 'cover';
    card.style.backgroundPosition = 'center';
    card.querySelector('.card-city').textContent = data.name;
    card.querySelector('.card-country').textContent = data.sys.country;
    card.querySelector('.card-icon').textContent = icon;
    card.querySelector('.card-temp').textContent = Math.round(data.main.temp);
    card.querySelector('.card-unit').textContent = unitSym;
    card.querySelector('.card-desc').textContent = data.weather[0].description;
    const stats = card.querySelectorAll('.card-stat-val');
    stats[0].textContent = data.main.humidity + '%';
    stats[1].textContent = Math.round(data.wind.speed) + ' ' + windUnit;
    stats[2].textContent = Math.round(data.main.feels_like) + unitSym;
 
    // Update city key to canonical name
    const idx = cities.indexOf(city);
    if (idx !== -1 && data.name.toLowerCase() !== city) {
      cities[idx] = data.name.toLowerCase();
      saveData();
    }
  } catch {
    card.classList.remove('loading');
    card.querySelector('.card-country').textContent = 'Error';
    card.querySelector('.card-icon').textContent = '⚠️';
  }
}
 
function removeCity(city) {
  cities = cities.filter(c => c !== city);
  saveData();
  renderGrid();
}
 
// ── Save / Saved searches ──
function saveSearch(city) {
  if (!saved.includes(city)) {
    saved.unshift(city);
    saveData();
    renderSaved();
    showToast(`${capitalise(city)} saved ★`);
  }
  // Update badge
  renderGrid();
}
 
async function renderSaved() {
  const list = document.getElementById('savedList');
  const empty = document.getElementById('savedEmpty');
  if (!saved.length) {
    list.innerHTML = '';
    list.appendChild(empty);
    return;
  }
  list.innerHTML = '';
  for (let i = 0; i < saved.length; i++) {
    const city = saved[i];
    const item = document.createElement('div');
    item.className = 'saved-item';
    item.style.animationDelay = (i * 50) + 'ms';
    item.innerHTML = `
      <div class="saved-item-left">
        <div class="saved-item-icon">🌡️</div>
        <div>
          <div class="saved-item-name">${capitalise(city)}</div>
          <div class="saved-item-sub">Loading…</div>
        </div>
      </div>
      <div class="saved-item-temp">--</div>
      <div class="saved-item-actions">
        <button class="saved-item-btn add-btn">+ Add</button>
        <button class="saved-item-btn del del-btn">Remove</button>
      </div>
    `;
    item.querySelector('.add-btn').addEventListener('click', e => { e.stopPropagation(); addFromSaved(city); });
    item.querySelector('.del-btn').addEventListener('click', e => { e.stopPropagation(); removeSaved(city); });
    list.appendChild(item);
 
    // Load data
    try {
      const data = await fetchWeather(city);
      const main = data.weather[0].main;
      item.querySelector('.saved-item-icon').textContent = weatherIcons[main] || '🌡️';
      item.querySelector('.saved-item-sub').textContent = data.weather[0].description + ' · ' + data.sys.country;
      const unitSym = unit === 'metric' ? '°C' : '°F';
      item.querySelector('.saved-item-temp').textContent = Math.round(data.main.temp) + unitSym;
    } catch {
      item.querySelector('.saved-item-sub').textContent = 'Error loading';
    }
  }
}
 
function addFromSaved(city) {
  if (!cities.includes(city)) {
    cities.unshift(city);
    saveData();
    renderGrid();
    // Switch to cities tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-tab="cities"]').classList.add('active');
    document.getElementById('cities-panel').classList.add('active');
  } else {
    showToast('City already on board');
  }
}
 
function removeSaved(city) {
  saved = saved.filter(c => c !== city);
  saveData();
  renderSaved();
}
 
// ── Refresh all ──
function refreshAll() {
  renderGrid();
  renderSaved();
}
 
// ── Persist ──
function saveData() {
  localStorage.setItem('atmos_cities', JSON.stringify(cities));
  localStorage.setItem('atmos_saved',  JSON.stringify(saved));
}
 
// ── Toast ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
 
// ── Utils ──
function capitalise(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}
 
// ── Init ──
if (!cities.length) {
  // Default starter cities
  cities = ['london', 'new york', 'tokyo'];
  saveData();
}
renderGrid();
renderSaved();