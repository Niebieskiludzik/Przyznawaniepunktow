document.addEventListener("DOMContentLoaded", async () => {

  initAuthUI();
  const supabase = window.supabaseClient;

  let players = [];
  let previousRatings = {}; // 🔥 do liczenia zmiany punktów
  let currentRoundId = null;

  const datePicker = document.getElementById('datePicker');
  const rankingTable = document.getElementById('rankingTable');
  const panelsDiv = document.getElementById('panels');

  datePicker.value = new Date().toISOString().split('T')[0];

  datePicker.addEventListener('change', () => {
    init();
  });

  document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);

  // =====================
  // ROUND
  // =====================

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

  // =====================
  // PLAYERS
  // =====================

  async function loadPlayers() {

    const { data } = await supabase
      .from("players")
      .select("*");

    if (!data) return;

    // 🔥 zapamiętaj poprzednie ratingi
    previousRatings = {};
    players.forEach(p => {
      previousRatings[p.id] = p.rating;
    });

    players = data.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      rating: p.rating ?? 1000,
      role: p.role,
      email: p.email
    }));

    players.sort((a, b) => b.rating - a.rating);

    renderRanking();
    renderPanels();
  }

  // =====================
  // RANKING
  // =====================

  function renderRanking() {

    rankingTable.innerHTML = `
      <tr>
        <th>#</th>
        <th>Gracz</th>
        <th>Punkty</th>
        <th>Zmiana</th>
      </tr>
    `;

    players.forEach((p, i) => {

      const prev = previousRatings[p.id] ?? p.rating;
      const diff = Math.round(p.rating - prev);

      let medal = '';
      if (i === 0) medal = '🥇';
      if (i === 1) medal = '🥈';
      if (i === 2) medal = '🥉';

      rankingTable.innerHTML += `
        <tr>
          <td>${medal || i + 1}</td>
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

  // =====================
  // PANELS (GŁOSOWANIE)
  // =====================

  async function renderPanels() {

    panelsDiv.innerHTML = '';

    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email;

    const { data: currentPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (!currentPlayer) return;

    let voters = currentPlayer.role === "admin"
      ? players
      : [players.find(p => p.email === userEmail)];

    voters.forEach((voter) => {

      const card = document.createElement('div');
      card.className = 'card center';

      let html = `<h3>${voter.name} ocenia:</h3>`;
      html += `<div class="vote-row-container">`;

      players.forEach((player) => {

        html += `
          <div class="vote-row">
            <div>
              <span class="avatar">${player.avatar || "👤"}</span>
              ${player.name}
            </div>
            <input 
              type="number"
              step="0.1"
              min="1"
              max="10"
              id="${voter.id}_${player.id}"
            />
          </div>
        `;
      });

      html += `</div>`;

      html += `
        <div class="panel-buttons">
          <button onclick="saveVotes('${voter.name}')">
            Zapisz oceny
          </button>
        </div>
      `;

      card.innerHTML = html;
      panelsDiv.appendChild(card);
    });
  }

  // =====================
  // SAVE VOTES
  // =====================

  window.saveVotes = async function (voterName) {

    for (let player of players) {

      const voter = players.find(p => p.name === voterName);

      const input = document.getElementById(
        voter.id + '_' + player.id
      );

      if (!input.value) continue;

      await supabase.from('votes').upsert({
        round_id: currentRoundId,
        player_id: player.id,
        voter_name: voterName,
        score: parseFloat(input.value.replace(",", "."))
      });
    }

    await supabase.rpc('calculate_round', {
      p_round_id: currentRoundId,
    });

    await loadPlayers(); // 🔥 odśwież ranking
  };

  // =====================
  // ADD PLAYER
  // =====================

  async function addPlayer() {

    const name = document.getElementById('newPlayerName').value;
    if (!name) return;

    await supabase.from('players').insert({
      name,
      rating: 1000
    });

    document.getElementById('newPlayerName').value = '';
    await loadPlayers();
  }

  // =====================
  // INIT
  // =====================

  async function init() {

    await ensureRound(datePicker.value);
    await loadPlayers();
  }

  init();

});
