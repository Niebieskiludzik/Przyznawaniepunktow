document.addEventListener("DOMContentLoaded", async () => {

const supabase = window.supabase.createClient(
  'https://wzanqzcjrpbhocrfcciy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
);

// =============================
// STATE

let players = [];
let currentUser = null;
let currentPlayer = null;
let currentRoundId = null;

// =============================
// ELEMENTY

const rankingList = document.getElementById("rankingList");
const panelsDiv = document.getElementById("panels");
const datePicker = document.getElementById("datePicker");
const dateCard = document.getElementById("dateCard");

// =============================
// 🌙 THEME

function toggleTheme() {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");

  localStorage.setItem("theme", isLight ? "light" : "dark");
}

window.toggleTheme = toggleTheme;

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
}

// =============================
// 🔐 AUTH

async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user || null;

  if (!currentUser) return;

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("email", currentUser.email)
    .single();

  currentPlayer = player;
}

// =============================
// 📅 ROUND

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
// 📊 PLAYERS

async function loadPlayers() {

  const { data } = await supabase
    .from('players')
    .select('*')
    .order('rating', { ascending: false });

  players = data || [];
}

// =============================
// 🏆 RANKING

function renderRanking() {

  if (!rankingList) return;

  rankingList.innerHTML = "";

  players.forEach((p, i) => {

    const row = document.createElement("div");
    row.className = "player-row";

    row.innerHTML = `
      <div class="player-left">
        <div>${i+1}</div>
        <div class="avatar">${p.avatar || "👤"}</div>
        <div>${p.name}</div>
      </div>

      <div class="player-right">
        <div>${Math.round(p.rating + (p.manual_points || 0))}</div>
      </div>
    `;

    // 👉 TU będzie popup profil
    row.onclick = () => openProfile(p);

    rankingList.appendChild(row);
  });
}

// =============================
// 🧠 PANELS (VOTING + ADMIN)

function renderPanels() {

  if (!panelsDiv) return;

  panelsDiv.innerHTML = "";

  // ❌ niezalogowany → nic
  if (!currentPlayer) return;

  const isAdmin = currentPlayer.role === "admin";

  const card = document.createElement("div");
  card.className = "section";

  let html = `<h2>Głosowanie</h2>`;

  players.forEach(player => {

    html += `
      <div style="margin-bottom:10px;">
        ${player.name}
        <input type="number" min="1" max="10" id="vote_${player.id}">
      </div>
    `;
  });

  html += `<button onclick="saveVotes()">Zapisz</button>`;

  // ================= ADMIN

  if (isAdmin) {
    html += `<h2>Admin</h2>`;

    players.forEach(player => {
      html += `
        <div>
          ${player.name}
          <input type="number" placeholder="bonus/kara" id="admin_${player.id}">
        </div>
      `;
    });

    html += `<button onclick="saveAdmin()">Zapisz kary/bonusy</button>`;
  }

  card.innerHTML = html;
  panelsDiv.appendChild(card);
}

// =============================
// 💾 SAVE VOTES

window.saveVotes = async function () {

  if (!currentPlayer) return;

  for (let player of players) {

    const input = document.getElementById("vote_" + player.id);
    if (!input || !input.value) continue;

    await supabase.from('votes').upsert({
      round_id: currentRoundId,
      player_id: player.id,
      voter_name: currentPlayer.name,
      score: parseFloat(input.value)
    });
  }

  alert("Zapisano");
};

// =============================
// 🛠 ADMIN SAVE

window.saveAdmin = async function () {

  for (let player of players) {

    const input = document.getElementById("admin_" + player.id);
    if (!input || !input.value) continue;

    await supabase
      .from("players")
      .update({ manual_points: parseFloat(input.value) })
      .eq("id", player.id);
  }

  alert("Zapisano kary/bonusy");
  await loadPlayers();
  renderRanking();
};

// =============================
// ⚽ BOISKO

async function loadBoiskoCounter(){

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("field_meetups")
    .select("*")
    .eq("date", today)
    .eq("status", "yes");

  const el = document.getElementById("boiskoCounter");

  if (el) {
    el.innerText = (data?.length || 0) + " osób dziś";
  }
}

// =============================
// 👤 PROFIL (NA RAZIE PROSTY)

function openProfile(player) {
  alert("Profil: " + player.name);
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
    alert("Błąd logowania");
    return;
  }

  location.reload();
};

window.logout = async function () {
  await supabase.auth.signOut();
  location.reload();
};

// =============================
// 🚀 INIT

async function init() {

  await loadUser();

  // ukrycie dla niezalogowanych
  if (!currentPlayer && dateCard) {
    dateCard.style.display = "none";
  }

  datePicker.value = new Date().toISOString().split("T")[0];

  await ensureRound(datePicker.value);
  await loadPlayers();

  renderRanking();
  renderPanels();
  loadBoiskoCounter();
}

init();

});
