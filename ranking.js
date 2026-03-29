document.addEventListener("DOMContentLoaded", async () => {

  const supabase = window.supabaseClient;

  const monthPicker = document.getElementById("monthPicker");
  const rankingList = document.getElementById("rankingList");

  // 📅 domyślny miesiąc = obecny
  const now = new Date();
  monthPicker.value = now.toISOString().slice(0, 7);

  monthPicker.addEventListener("change", loadRanking);

  await loadRanking();

  // 🔥 funkcja punktów
  function calculateDailyPoints(avg) {
    if (avg >= 5) {
      return (avg - 5) * (220 / 5);
    } else {
      return (avg - 5) * (150 / 4);
    }
  }

  async function loadRanking() {

    rankingList.innerHTML = "Ładowanie...";

    const [year, month] = monthPicker.value.split("-").map(Number);

    // 📥 votes + round_date
    const { data: votes, error } = await supabase
      .from("votes")
      .select(`
        score,
        player_id,
        rounds (
          round_date
        )
      `);

    if (error) {
      console.error(error);
      rankingList.innerHTML = "❌ Błąd pobierania danych";
      return;
    }

    // 📊 grupowanie
    const map = {};

    votes.forEach(v => {
      const date = new Date(v.rounds.round_date);

      if (
        date.getFullYear() === year &&
        date.getMonth() === (month - 1)
      ) {
        const dayKey = date.toISOString().split("T")[0];
        const key = v.player_id + "_" + dayKey;

        if (!map[key]) {
          map[key] = {
            player_id: v.player_id,
            scores: []
          };
        }

        map[key].scores.push(v.score);
      }
    });

    // 📈 liczenie punktów
    const playerPoints = {};

    Object.values(map).forEach(entry => {
      const avg =
        entry.scores.reduce((a, b) => a + b, 0) /
        entry.scores.length;

      const pts = calculateDailyPoints(avg);

      if (!playerPoints[entry.player_id]) {
        playerPoints[entry.player_id] = 1000;
      }

      playerPoints[entry.player_id] += pts;
    });

    // 📥 gracze
    const { data: players } = await supabase
      .from("players")
      .select("id, name");

    const playerMap = {};
    players.forEach(p => {
      playerMap[p.id] = p.name;
    });

    // 🏆 ranking
    const ranking = Object.entries(playerPoints)
      .map(([player_id, points]) => ({
        player_id,
        points
      }))
      .sort((a, b) => b.points - a.points);

    // 🎨 render
    if (ranking.length === 0) {
      rankingList.innerHTML = "Brak danych w tym miesiącu";
      return;
    }

    rankingList.innerHTML = ranking.map((p, i) => `
      <div class="ranking-row" onclick="goToProfile('${p.player_id}')">
        <span class="rank">${i + 1}</span>
        <span class="name">${playerMap[p.player_id] || "?"}</span>
        <span class="points">${p.points.toFixed(1)}</span>
      </div>
    `).join("");
  }

});

// 🔗 profil
function goToProfile(id) {
  window.location.href = `profile.html?id=${id}`;
}
