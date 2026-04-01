document.addEventListener("DOMContentLoaded", async () => {

  // 🔹 Supabase
  const supabaseUrl = "https://wzanqzcjrpbhocrfcciy.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k";
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  const supabase = window.supabaseClient;

  // 📌 ID z URL
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");
  if (!playerId) return;

  // 📅 data w navbarze
  const today = new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  document.getElementById("navbarDate").innerText = "📅 " + today;

  // 🧍‍♂️ Pobierz gracza
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).single();
  if (!player) {
    document.getElementById("profileCard").innerHTML = "❌ Nie znaleziono gracza";
    return;
  }

  const totalPoints = player.rating + (player.manual_points || 0);

  document.getElementById("stats-tab").innerHTML = `
    <div class="profile-avatar-circle">${player.avatar || "👤"}</div>
    <div class="profile-name">${player.name}</div>
    <div class="profile-box">Punkty: <b>${totalPoints.toFixed(3).replace(".", ",")}</b></div>
    <div class="profile-average">
      Średnia ocen: <span id="avg-rating">...</span> | <span id="avg-count">0</span> ocen
    </div>
  `;

  // 📊 średnia ocen
  const { avg, count } = await loadAverageRating(playerId);
  document.getElementById('avg-rating').innerText = avg;
  document.getElementById('avg-count').innerText = count;

  // 🏅 Osiągnięcia
  await loadAchievements(playerId);

  // 🔹 Zakładki
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  // Funkcje pomocnicze
  async function loadAverageRating(playerId) {
    const { data: votes } = await supabase.from('votes')
      .select('score, created_at')
      .eq('player_id', playerId)
      .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString());

    if (!votes || votes.length === 0) return { avg: 0, count: 0 };
    const sum = votes.reduce((acc, v) => acc + v.score, 0);
    return { avg: (sum / votes.length).toFixed(2), count: votes.length };
  }

  async function loadAchievements(playerId) {
    const { data: achievements } = await supabase.from("achievements")
      .select("*")
      .eq("player_id", playerId)
      .order("obtained_at", { ascending: false });

    const listEl = document.getElementById("achievements-list");
    const countEl = document.getElementById("achievements-count");
    if (!listEl || !countEl) return;

    listEl.innerHTML = achievements.map(a => `
      <div class="achievement-badge ${a.rarity}" title="${a.description}">
        ${a.name}<br><small>${new Date(a.obtained_at).toLocaleDateString("pl-PL")}</small>
      </div>
    `).join("");

    countEl.innerText = `${achievements.length}/${achievements.length}`;
  }

});
