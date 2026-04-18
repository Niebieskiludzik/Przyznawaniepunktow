document.addEventListener("DOMContentLoaded", async () => {

  initAuthUI();
  const supabase = window.supabaseClient;

  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");
  if (!playerId) return;

  // 📅 Navbar
  const today = new Date().toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  document.getElementById("navbarDate").innerText = "📅 " + today;

  // 👤 Player
  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (!player) {
    document.getElementById("profileCard").innerHTML = "❌ Nie znaleziono gracza";
    return;
  }

  // 📊 Historia punktów (NOWA LOGIKA)
  const { data: history } = await supabase
    .from("ranking_history")
    .select("date, points")
    .eq("player_id", playerId)
    .order("date", { ascending: false });

  // 🔹 aktualne punkty
  const totalPoints = history?.[0]?.points ?? player.rating ?? 0;

  // 🔹 ostatnie 30 dni (RÓŻNICA)
  let last30 = 0;

  if (history && history.length >= 2) {
    const now = new Date();
    const past30 = new Date();
    past30.setDate(now.getDate() - 30);

    const filtered = history.filter(h => new Date(h.date) >= past30);

    if (filtered.length >= 2) {
      last30 = filtered[0].points - filtered[filtered.length - 1].points;
    }
  }

  // ⭐ Średnia ocen
  const { avg: avgRating, count: ratingCount } = await loadAverageRating(playerId);

  // 🗳 głosy
  const { data: votes } = await supabase
    .from("votes")
    .select("score")
    .eq("player_id", playerId);

  let votesAvg = 0;
  let votesCount = 0;

  if (votes?.length) {
    votesCount = votes.length;
    votesAvg = votes.reduce((a, b) => a + b.score, 0) / votesCount;
  }

  // 📅 historia głosów
  const { data: votesHistory } = await supabase
    .from("votes")
    .select(`score, rounds (round_date)`)
    .eq("player_id", playerId);

  // 🎯 oddane głosy
  const { data: givenVotes } = await supabase
    .from("votes")
    .select("score, player_id")
    .eq("voter_name", player.name);

  let givenAvg = 0, givenCount = 0;
  let selfAvg = 0, selfCount = 0;

  if (givenVotes?.length) {
    const others = givenVotes.filter(v => v.player_id != playerId);
    const self = givenVotes.filter(v => v.player_id == playerId);

    givenCount = others.length;
    selfCount = self.length;

    givenAvg = others.length ? others.reduce((a, b) => a + b.score, 0) / others.length : 0;
    selfAvg = self.length ? self.reduce((a, b) => a + b.score, 0) / self.length : 0;
  }

  // 📅 aktywność
  const activeDays = new Set(votesHistory?.map(v => v.rounds.round_date)).size;

  // 🏆 ranking średniej
  const { data: allVotes } = await supabase.from("votes").select("player_id, score");

  const avgMap = {};
  allVotes.forEach(v => {
    if (!avgMap[v.player_id]) avgMap[v.player_id] = { sum: 0, count: 0 };
    avgMap[v.player_id].sum += v.score;
    avgMap[v.player_id].count++;
  });

  const averages = Object.entries(avgMap).map(([id, val]) => ({
    player_id: id,
    avg: val.sum / val.count
  }));

  averages.sort((a, b) => b.avg - a.avg);
  const avgRank = averages.findIndex(a => a.player_id == playerId) + 1;

  // 📊 top/low
  const now = new Date();
  const past14 = new Date();
  past14.setDate(now.getDate() - 14);

  const filtered14 = (votesHistory || []).filter(v => new Date(v.rounds.round_date) >= past14);

  const top3 = [...filtered14].sort((a, b) => b.score - a.score).slice(0, 3);
  const low3 = [...filtered14].sort((a, b) => a.score - b.score).slice(0, 3);

  // 🎨 RENDER
  document.getElementById("profileCard").innerHTML = `
    <div class="profile-avatar-circle">${player.avatar || "👤"}</div>
    <div class="profile-name">${player.name}</div>

    <div class="profile-points">
      Punkty: <b>${totalPoints.toFixed(1).replace(".", ",")}</b>
    </div>

    <div class="profile-highlight">
      📅 30 dni: <b>${last30.toFixed(1).replace(".", ",")}</b>
    </div>

    <div class="profile-average">
      🗳 ${avgRating} (${ratingCount})
    </div>

    <div class="profile-box">Oddane: ${givenAvg.toFixed(2)} (${givenCount})</div>
    <div class="profile-box">Na siebie: ${selfAvg.toFixed(2)} (${selfCount})</div>
    <div class="profile-box">Dni aktywności: ${activeDays}</div>
    <div class="profile-box">Ranking avg: #${avgRank}</div>

    <h3>🔥 Najwyższe</h3>
    ${top3.map(v => `<div>${v.score} - ${v.voter_name}</div>`).join("")}

    <h3>❄️ Najniższe</h3>
    ${low3.map(v => `<div>${v.score} - ${v.voter_name}</div>`).join("")}
  `;

  async function loadAverageRating(playerId) {
    const { data: votes } = await supabase
      .from("votes")
      .select("score, created_at")
      .eq("player_id", playerId)
      .gte("created_at", new Date(Date.now() - 30*24*60*60*1000).toISOString());

    if (!votes?.length) return { avg: "0,00", count: 0 };

    const sum = votes.reduce((a, b) => a + b.score, 0);
    return {
      avg: (sum / votes.length).toFixed(2).replace(".", ","),
      count: votes.length
    };
  }

});
