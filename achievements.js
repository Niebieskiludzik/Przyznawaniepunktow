document.addEventListener("DOMContentLoaded", async () => {

  // 🔥 auth UI (login)
  initAuthUI();

  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error("❌ Supabase nie istnieje");
    return;
  }

  // 📌 ID z URL
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get("id");
  if (!playerId) return;

  // 📅 data w navbarze
  const today = new Date().toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const navbarDate = document.getElementById("navbarDate");
  if (navbarDate) {
    navbarDate.innerText = "📅 " + today;
  }

  try {

    // 🧍‍♂️ gracz
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      document.getElementById("profileCard").innerHTML = "❌ Nie znaleziono gracza";
      return;
    }

    const totalPoints = player.rating + (player.manual_points || 0);

    // 📊 statystyki
    document.getElementById("stats-tab").innerHTML = `
      <div class="profile-avatar-circle">${player.avatar || "👤"}</div>
      <div class="profile-name">${player.name}</div>

      <div class="profile-box">
        Punkty: <b>${totalPoints.toFixed(3).replace(".", ",")}</b>
      </div>

      <div class="profile-average">
        Średnia ocen: <span id="avg-rating">...</span> | <span id="avg-count">0</span> ocen
      </div>
    `;

    // 📊 średnia (30 dni)
    const { avg, count } = await loadAverageRating(playerId);

    document.getElementById("avg-rating").innerText = avg;
    document.getElementById("avg-count").innerText = count;

    // 🏅 osiągnięcia
    await loadAchievements(playerId);

    // 🔁 zakładki
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {

        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");

      });
    });

  } catch (err) {
    console.error(err);
  }

  // 📊 średnia
  async function loadAverageRating(playerId) {

    const { data: votes } = await supabase
      .from("votes")
      .select("score, created_at")
      .eq("player_id", playerId)
      .gte("created_at", new Date(Date.now() - 30*24*60*60*1000).toISOString());

    if (!votes || votes.length === 0) {
      return { avg: 0, count: 0 };
    }

    const sum = votes.reduce((a, b) => a + b.score, 0);
    return {
      avg: (sum / votes.length).toFixed(2),
      count: votes.length
    };
  }

  // 🏅 osiągnięcia
  async function loadAchievements(playerId) {

    const { data: achievements, error } = await supabase
      .from("achievements")
      .select("*")
      .eq("player_id", playerId)
      .order("obtained_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const listEl = document.getElementById("achievements-list");
    const countEl = document.getElementById("achievements-count");

    if (!listEl || !countEl) return;

    if (!achievements || achievements.length === 0) {
      listEl.innerHTML = `<div class="empty">Brak osiągnięć</div>`;
      countEl.innerText = "0/0";
      return;
    }

    listEl.innerHTML = achievements.map(a => `
      <div class="achievement-badge ${a.rarity}" title="${a.description}">
        <div class="ach-name">${a.name}</div>
        <div class="ach-date">
          ${new Date(a.obtained_at).toLocaleDateString("pl-PL")}
        </div>
      </div>
    `).join("");

    countEl.innerText = `${achievements.length}/${achievements.length}`;
  }

});
