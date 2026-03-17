document.addEventListener("DOMContentLoaded", async () => {

const supabase = window.supabase.createClient(
  'https://wzanqzcjrpbhocrfcciy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
);

let players = [];
let yesterdayRatings = {};
let currentRoundId = null;

// ELEMENTY
const rankingList = document.getElementById("rankingList");
const panelsDiv = document.getElementById("panels");
const datePicker = document.getElementById("datePicker");

// =============================
// 🌙 THEME

function toggleTheme() {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");

  localStorage.setItem("theme", isLight ? "light" : "dark");

  document.querySelector(".icon-btn").innerText = isLight ? "☀️" : "🌙";
}

window.toggleTheme = toggleTheme;

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light");
  const btn = document.querySelector(".icon-btn");
  if (btn) btn.innerText = "☀️";
}

// =============================
// 📅 DATA

datePicker.value = new Date().toISOString().split("T")[0];

function updateDateDisplay() {
  const el = document.getElementById("navbarDate");
  if (!el) return;

  const date = new Date(datePicker.value);

  el.innerText = date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

datePicker.addEventListener("change", async () => {
  updateDateDisplay();
  await init();
});

// =============================
// 🔄 ROUND

async function ensureRound(date) {

  const { data } = await supabase
    .from('rounds')
    .select('*')
    .eq('round_date', date)
    .single();

  if (!data) {
    const { data: newRound } = await supabase
      .from('rounds')
      .insert({ round_date: date })
      .select()
      .single();

    currentRoundId = newRound.id;

  } else {
    currentRoundId = data.id;
  }
}

// =============================
// 📊 DANE

async function loadPlayers() {

  const { data } = await supabase
    .from('players')
    .select('*')
    .order('rating', { ascending: false });

  players = data || [];

  renderRanking();
  renderPanels();
  loadBoiskoCounter();
}

async function loadYesterdayRatings() {

  const { data } = await supabase
    .from('players')
    .select('id,rating');

  yesterdayRatings = {};

  data?.forEach(p => {
    yesterdayRatings[p.id] = p.rating;
  });
}

// =============================
// 🏆 RANKING (NOWY UI)

function renderRanking() {

  if (!rankingList) return;

  rankingList.innerHTML = "";

  players.forEach((p, i) => {

    const row = document.createElement("div");
    row.className = "player-row";

    const diff = Math.round(p.rating - (yesterdayRatings[p.id] || p.rating));

    row.innerHTML = `
      <div class="player-left">
        <div>${i+1}</div>
        <div class="avatar">${p.avatar || "👤"}</div>
        <div>${p.name}</div>
      </div>

      <div class="player-right">
        <div>${Math.round(p.rating)}</div>
        <div class="player-diff ${diff >= 0 ? 'positive':'negative'}">
          ${diff >= 0 ? '+' : ''}${diff}
        </div>
      </div>
    `;

    row.onclick = () => {
      alert("Profil gracza: " + p.name);
    };

    rankingList.appendChild(row);
  });
}

// =============================
// 🧠 PANELS

async function renderPanels() {

  if (!panelsDiv) return;

  panelsDiv.innerHTML = "";

  const { data } = await supabase.auth.getUser();
  const userEmail = data.user?.email;

  const currentPlayer = players.find(p => p.email === userEmail);

  if (!currentPlayer) return;

  const card = document.createElement("div");
  card.className = "section";

  let html = `<h2>Oceń graczy</h2>`;

  players.forEach(player => {

    html += `
      <div style="margin-bottom:12px;">
        ${player.name}
        <input type="number" min="1" max="10" id="vote_${player.id}">
      </div>
    `;
  });

  html += `<button onclick="saveVotes()">Zapisz</button>`;

  card.innerHTML = html;
  panelsDiv.appendChild(card);
}

// =============================
// 💾 ZAPIS

window.saveVotes = async function () {

  const { data } = await supabase.auth.getUser();
  const userEmail = data.user?.email;

  const voter = players.find(p => p.email === userEmail);
  if (!voter) return;

  for (let player of players) {

    const input = document.getElementById("vote_" + player.id);

    if (!input || !input.value) continue;

    await supabase.from('votes').upsert({
      round_id: currentRoundId,
      player_id: player.id,
      voter_name: voter.name,
      score: parseFloat(input.value)
    });
  }

  await supabase.rpc('calculate_round', {
    p_round_id: currentRoundId,
  });

  await loadPlayers();
};

// =============================
// ⚽ BOISKO

async function loadBoiskoCounter(){

  const today=new Date().toISOString().split("T")[0];

  const {data}=await supabase
    .from("field_meetups")
    .select("*")
    .eq("date",today)
    .eq("status","yes");

  const el = document.getElementById("boiskoCounter");

  if (el) {
    el.innerText = data.length + " osób dziś";
  }
}

// =============================
// 🔐 LOGIN

window.login = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    document.getElementById("loginError").innerText = "Błąd logowania";
    return;
  }

  init();
};

window.logout = async function () {
  await supabase.auth.signOut();
  location.reload();
};

async function renderAuth() {

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const box = document.getElementById("authSection");

  if (!box) return;

  if (!user) {
    box.innerHTML = `
      <div class="section">
        <input id="email" placeholder="email">
        <input id="password" type="password" placeholder="hasło">
        <button onclick="login()">Zaloguj</button>
      </div>
    `;
  } else {
    box.innerHTML = `
      <div class="section">
        <div>Zalogowany jako ${user.email}</div>
        <button onclick="logout()">Wyloguj</button>
      </div>
    `;
  }
}

// =============================
// 🚀 INIT

async function init() {

  updateDateDisplay();

  await ensureRound(datePicker.value);
  await loadYesterdayRatings();
  await loadPlayers();
  await renderAuth();
  
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const dateCard = document.getElementById("dateCard");

  if (!user && dateCard) {
    dateCard.style.display = "none";
}
}

init();

});
