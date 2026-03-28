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
  document.getElementById("profileCard").innerHTML = `
    <div class="avatar" style="font-size:60px;">
      ${player.avatar || "👤"}
    </div>

    <h1>${player.name}</h1>

    <h2>🏆 Punkty chwały</h2>
    <div style="font-size:40px; font-weight:bold;">
      ${totalPoints.toFixed(3).replace(".", ",")}
    </div>

    <p style="margin-top:20px;">
      Rola: <b>${player.role}</b>
    </p>
  `;
});
