document.addEventListener("DOMContentLoaded", async () => {

  initAuthUI();

  const supabase = window.supabaseClient;

  const savedEmail = localStorage.getItem("savedEmail");
  if (savedEmail) {
    const emailInput = document.getElementById("email");
    if (emailInput) emailInput.value = savedEmail;
  }

  let players = [];
  let currentRoundId = null;
  let yesterdayRatings = {};

  const datePicker = document.getElementById('datePicker');
  const rankingTable = document.getElementById('rankingTable');
  const panelsDiv = document.getElementById('panels');

  /* ================= LOADER ================= */

  window.showLoader = function () {
    const overlay = document.getElementById("globalLoader");
    const loader = overlay?.querySelector(".loader");
    if (!overlay || !loader) return;

    loader.classList.remove("success");
    overlay.classList.remove("hidden");

    setTimeout(() => overlay.classList.add("active"), 10);
  };

  window.hideLoaderSuccess = function () {
    const overlay = document.getElementById("globalLoader");
    const loader = overlay?.querySelector(".loader");
    if (!overlay || !loader) return;

    loader.classList.add("success");

    setTimeout(() => {
      overlay.classList.remove("active");
      overlay.classList.add("hidden");
      loader.classList.remove("success");
    }, 1200);
  };

  /* ================= DATA ================= */

  datePicker.value = new Date().toISOString().split('T')[0];

  datePicker.addEventListener('change', () => {
    init();
  });

  async function ensureRound(date) {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('round_date', date)
      .maybeSingle();

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

  async function loadPlayers() {
    const { data } = await supabase.from("players").select("*");
    if (!data) return;

    players = data.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      rating: p.rating ?? 1000
    }));

    players.sort((a, b) => b.rating - a.rating);

    renderRanking();
    renderPanels();
  }

  async function loadYesterdayRatings() {
    const { data } = await supabase.from("players").select("id, rating");

    yesterdayRatings = {};
    data?.forEach(p => {
      yesterdayRatings[p.id] = p.rating;
    });
  }

  /* ================= RANKING ================= */

  function renderRanking() {

    if (!rankingTable) return;

    rankingTable.innerHTML = `
      <tr>
        <th>#</th>
        <th>Gracz</th>
        <th>Punkty</th>
        <th>Zmiana</th>
      </tr>
    `;

    players.forEach((p, i) => {

      const prev = yesterdayRatings[p.id] ?? p.rating;
      const diff = Math.round(p.rating - prev);

      rankingTable.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td onclick="goToProfile('${p.id}')">
            <span class="avatar">${p.avatar || "👤"}</span>
            ${p.name}
          </td>
          <td>${Math.round(p.rating)}</td>
          <td class="${diff >= 0 ? 'positive' : 'negative'}">
            ${diff >= 0 ? '+' : ''}${diff}
          </td>
        </tr>
      `;
    });
  }

  window.goToProfile = function(playerId){
    window.location.href = `profile.html?id=${playerId}`;
  };

  /* ================= PANELS ================= */

  async function renderPanels() {

    if (!panelsDiv) return;

    panelsDiv.innerHTML = '';

    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;

    if (!email) return;

    const { data: currentPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!currentPlayer) return; // 🔥 FIX crasha

    const voters = currentPlayer.role === "admin"
      ? players
      : [currentPlayer];

    voters.forEach((voter) => {

      const card = document.createElement('div');
      card.className = 'card center';

      let html = `<h3>${voter.name} ocenia:</h3>`;

      players.forEach(player => {
        html += `
          <div class="vote-row">
            <div>
              <span class="avatar">${player.avatar || "👤"}</span>
              ${player.name}
            </div>
            <input type="number" step="0.1" min="1" max="10"
              id="${voter.id}_${player.id}" />
          </div>
        `;
      });

      html += `
        <button onclick="saveVotes('${voter.name}')">
          Zapisz oceny
        </button>
      `;

      card.innerHTML = html;
      panelsDiv.appendChild(card);
    });
  }

  /* ================= VOTES ================= */

  window.saveVotes = async function (voterName) {

    showLoader();

    try {

      const voter = players.find(p => p.name === voterName);
      if (!voter) return;

      for (let player of players) {

        const input = document.getElementById(`${voter.id}_${player.id}`);
        if (!input || !input.value) continue;

        await supabase.from('votes').upsert({
          round_id: currentRoundId,
          player_id: player.id,
          voter_name: voterName,
          score: parseFloat(input.value.replace(",", "."))
        });
      }

      // 🔥 LICZENIE PO WSZYSTKIM
      await supabase.rpc("calculate_all");
      await supabase.rpc("update_players_rating");

      await loadPlayers();

      hideLoaderSuccess();

    } catch (e) {
      console.error(e);
      alert("Błąd zapisu");
    }
  };

  /* ================= ADMIN ================= */

  window.recalculateRanking = async function () {

    showLoader();

    const { error } = await supabase.rpc("calculate_all");

    if (error) {
      console.error(error);
      alert("Błąd");
      return;
    }

    await supabase.rpc("update_players_rating");
    await loadPlayers();

    hideLoaderSuccess();
  };

  /* ================= INIT ================= */

  async function init() {

    const { data } = await supabase.auth.getUser();

    const panels = document.getElementById("panels");
    const loginBox = document.getElementById("loginBox");

    if (!data.user) {
      if (panels) panels.style.display = "none";
      if (loginBox) loginBox.style.display = "flex";
      return;
    }

    if (panels) panels.style.display = "block";
    if (loginBox) loginBox.style.display = "none";

    await ensureRound(datePicker.value);
    await loadYesterdayRatings();
    await loadPlayers();
  }

  init();

});
