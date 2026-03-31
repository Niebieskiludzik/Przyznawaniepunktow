document.addEventListener("DOMContentLoaded", async () => {

  initAuthUI();

  const supabase = window.supabaseClient;

  // 📌 pobierz ID z URL
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");

  if (!playerId) return;

  // 📅 navbar data (jak w main.js)
  const today = new Date().toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  document.getElementById("navbarDate").innerText = "📅 " + today;

  // 📥 pobierz gracza
  const { data: player, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (error || !player) {
    document.getElementById("profileCard").innerHTML = "❌ Nie znaleziono gracza";
    return;
  }

  const totalPoints = (player.rating + (player.manual_points || 0));

  // 🎨 render
  const { data: votes } = await supabase
  .from("votes")
  .select("score")
  .eq("player_id", playerId);

// 📊 statystyki
let avg = 0;
let count = 0;
let max = 0;

if (votes && votes.length > 0) {
  count = votes.length;

  const sum = votes.reduce((a, b) => a + b.score, 0);
  avg = sum / count;

  max = Math.max(...votes.map(v => v.score));
}

if (count === 0) {
  avg = 0;
  max = 0;
}

const { data: votesHistory, error: votesError } = await supabase
  .from("votes")
  .select(`score,rounds (round_date)`)
  .eq("player_id", playerId);
  
console.log("VOTES:", votesHistory);
console.log("ERROR:", votesError);

let last30days = 0;
let points30daysAgo = 0;

if (votesHistory && votesHistory.length > 0) {
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - 30);

  votesHistory.forEach(v => {
    const roundDate = new Date(v.rounds.round_date);

    if (roundDate >= pastDate) {
      last30days += v.score;
    } else {
      points30daysAgo += v.score;
    }
  });
}

const { data: givenVotes } = await supabase
  .from("votes")
  .select("score, player_id")
  .eq("voter_name", player.name);

let givenCount = 0;
let givenAvg = 0;

let selfVotes = 0;
let selfSum = 0;

if (givenVotes && givenVotes.length > 0) {
  const filtered = givenVotes.filter(v => v.player_id !== playerId);
  const self = givenVotes.filter(v => v.player_id === playerId);

  givenCount = filtered.length;
  givenAvg = filtered.length
    ? filtered.reduce((a, b) => a + b.score, 0) / filtered.length
    : 0;

  selfVotes = self.length;
  selfSum = self.length
    ? self.reduce((a, b) => a + b.score, 0) / self.length
    : 0;
}

const { data: roundsPlayed } = await supabase
  .from("votes")
  .select("round_id")
  .eq("player_id", playerId);



  
const { data: allVotes } = await supabase
  .from("votes")
  .select("player_id, score");

const avgMap = {};

allVotes.forEach(v => {
  if (!avgMap[v.player_id]) {
    avgMap[v.player_id] = { sum: 0, count: 0 };
  }
  avgMap[v.player_id].sum += v.score;
  avgMap[v.player_id].count += 1;
});

// średnie
const averages = Object.entries(avgMap).map(([id, val]) => ({
  player_id: id,
  avg: val.sum / val.count
}));

// sortowanie
averages.sort((a, b) => b.avg - a.avg);

// pozycja
const avgRank = averages.findIndex(a => a.player_id == playerId) + 1;



const { data: fullHistory } = await supabase
  .from("votes")
  .select(`
    score,
    voter_name,
    rounds (
      round_date
    )
  `)
  .eq("player_id", playerId)
  .order("rounds(round_date)", { ascending: false });

const historyHTML = fullHistory.map(v => `
  <div class="history-row">
    <span class="history-date">${v.rounds.round_date}</span>
    <span class="history-name">${v.voter_name}</span>
    <span class="history-score">${v.score}</span>
  </div>
`).join("");

const { data: recentVotes } = await supabase
  .from("votes")
  .select(`
    score,
    players (
      name
    ),
    rounds (
      round_date
    )
  `)
  .eq("voter_name", player.name);

let topVotes = [];
let worstVotes = [];

if (recentVotes && recentVotes.length > 0) {
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - 14);

  const filtered = recentVotes.filter(v =>
    new Date(v.rounds.round_date) >= pastDate
  );

  // TOP 3
  topVotes = [...filtered]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // NAJGORSZE 3
  worstVotes = [...filtered]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

const renderRow = (v) => `
  <div class="history-row">
    <span class="history-date">${v.rounds.round_date}</span>
    <span class="history-name">${v.players.name}</span>
    <span class="history-score ${v.score >= 0 ? 'plus' : 'minus'}">
      ${v.score}
    </span>
  </div>
`;
  
const topHTML = topVotes.map(renderRow).join("");
const worstHTML = worstVotes.map(renderRow).join("");

const uniqueRounds = new Set(roundsPlayed?.map(v => v.round_id));
const daysPlayed = uniqueRounds.size;
  
const manualPoints = player.manual_points || 0;

const manualClass = manualPoints < 0 ? "minus" : "";

const diff = totalPoints - last30days;
  
const diffClass = last30days >= 0 ? "plus" : "minus";

// 📅 ostatnie 30 dni (JUŻ MASZ)
const last30 = last30days;

// 🗳 oddane głosy (na innych)
const { data: givenVotesData } = await supabase
  .from("votes")
  .select("score")
  .eq("voter_name", player.name);

let givenAvg = 0;
let givenCount = 0;

if (givenVotesData && givenVotesData.length > 0) {
  givenCount = givenVotesData.length;
  givenAvg = givenVotesData.reduce((a, b) => a + b.score, 0) / givenCount;
}

// 🎯 głosy NA SIEBIE
const selfVotes = votes || [];

let selfAvg = 0;
let selfCount = 0;

if (selfVotes.length > 0) {
  selfCount = selfVotes.length;
  selfAvg = selfVotes.reduce((a, b) => a + b.score, 0) / selfCount;
}

// 📅 dni aktywności (unique dni)
const activeDaysSet = new Set(
  votesHistory.map(v => new Date(v.created_at).toISOString().split("T")[0])
);
const activeDays = activeDaysSet.size;

// 🏆 ranking średniej
const { data: allPlayers } = await supabase
  .from("players")
  .select("id, rating");

let sorted = allPlayers
  .map(p => ({ id: p.id, avg: p.rating }))
  .sort((a, b) => b.avg - a.avg);

const rankIndex = sorted.findIndex(p => p.id === player.id);
const avgRank = rankIndex + 1;

// 📊 14 dni – top i low
const now = new Date();
const past14 = new Date();
past14.setDate(now.getDate() - 14);

const last14Votes = votesHistory.filter(v => 
  new Date(v.created_at) >= past14
);

// najwyższe
const top3 = [...last14Votes]
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

// najniższe
const low3 = [...last14Votes]
  .sort((a, b) => a.score - b.score)
  .slice(0, 3);
  
document.getElementById("profileCard").innerHTML = `
  
  <div class="profile-avatar-circle">
    ${player.avatar || "👤"}
  </div>

  <div class="profile-name">${player.name}</div>

  <div class="profile-points">
    Punkty: <b>${totalPoints.toFixed(1).replace(".", ",")}</b>
  </div>

  <div class="profile-highlight">
    📅 Przez ostatnie 30 dni zdobył 
    <b>${last30.toFixed(1).replace(".", ",")}</b> punktów
  </div>

  <div class="profile-box">
    🗳 Oddane głosy średnia: 
    <b>${givenAvg.toFixed(2).replace(".", ",")}</b>
    <span class="divider">|</span>
    ${givenCount} ocen
  </div>

  <div class="profile-box">
    🎯 Oddane głosy na siebie:
    <b>${selfAvg.toFixed(2).replace(".", ",")}</b>
    <span class="divider">|</span>
    ${selfCount} ocen
  </div>

  <div class="profile-box">
    📅 Dni aktywności: <b>${activeDays}</b>
  </div>

  <div class="profile-box">
    🏆 Ranking średniej: <b>#${avgRank}</b>
  </div>

  <div class="profile-section-title">
    📊 Najwyższe i najniższe oceny (14 dni)
  </div>

  <div class="votes-section">

    <div class="votes-column">
      <h3>🔥 Najwyższe</h3>
      ${top3.map(v => `
        <div class="vote-item">
          ${v.score.toFixed(1).replace(".", ",")}
        </div>
      `).join("")}
    </div>

    <div class="votes-column">
      <h3>❄️ Najniższe</h3>
      ${low3.map(v => `
        <div class="vote-item">
          ${v.score.toFixed(1).replace(".", ",")}
        </div>
      `).join("")}
    </div>

  </div>

`;
});
