document.addEventListener("DOMContentLoaded", async () => {

  const supabase = window.supabaseClient;

  const { data: players } = await supabase
    .from("players")
    .select("id, name, avatar, simple_points")
    .order("simple_points", { ascending: false });

  const list = document.getElementById("rankingList");

  list.innerHTML = players.map((p, i) => `
    <div class="ranking-item">
      <div>#${i + 1}</div>
      <div>${p.avatar || "👤"} ${p.name}</div>
      <div><b>${(p.simple_points || 1000).toFixed(0)}</b></div>
    </div>
  `).join("");

});
