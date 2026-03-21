document.addEventListener("DOMContentLoaded", async () => {
  initAuthUI();

  const supabase = window.supabaseClient;
  const savedEmail = localStorage.getItem("savedEmail");

  if (savedEmail) document.getElementById("email").value = savedEmail;

  let players = [];
  let currentRoundId = null;
  let yesterdayRatings = {};

  const datePicker = document.getElementById('datePicker');
  const rankingTable = document.getElementById('rankingTable');
  const panelsDiv = document.getElementById('panels');

  datePicker.value = new Date().toISOString().split('T')[0];

  datePicker.addEventListener('change', () => {
    updateDateDisplay();
    init();
  });

  document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);

  // ========================
  // FUNKCJE GŁOSOWANIA I PANELI
  // ========================

  async function ensureRound(date) {
    const { data, error } = await supabase
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
    } else currentRoundId = data.id;
  }

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('rating', { ascending: false });
    players = data || [];
    renderRanking();
    renderPanels();
  }

  function updateDateDisplay() {
    const dateDisplay = document.getElementById("currentDateDisplay");
    const date = new Date(datePicker.value);
    dateDisplay.innerHTML = "📅 Runda: <b>" + date.toLocaleDateString("pl-PL", { weekday:"long", year:"numeric", month:"long", day:"numeric" }) + "</b>";
  }

  function renderRanking() {
    rankingTable.innerHTML = `
      <tr>
        <th>#</th><th>Gracz</th><th>Punkty</th><th>Zmiana</th>
      </tr>`;
    players.forEach((p, i) => {
      let medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
      const diff = Math.round(p.rating - (yesterdayRatings[p.id]||p.rating));
      rankingTable.innerHTML += `
        <tr class="${i===0?'leader gold':i===1?'silver':i===2?'bronze':''}">
          <td>${medal||i+1}</td>
          <td><span class="avatar">${p.avatar||"👤"}</span>${p.name}</td>
          <td>${Math.round(p.rating+(p.manual_points||0))}</td>
          <td class="${diff>=0?'positive':'negative'}">${diff>=0?'+':''}${diff}</td>
        </tr>`;
    });
  }

  async function renderPanels() {
    panelsDiv.innerHTML = '';
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email;
    const currentPlayer = players.find(p => p.email === userEmail);
    if (!currentPlayer) return;

    const selectedDate = new Date(datePicker.value);
    const today = new Date();
    selectedDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const threeDaysBefore = new Date(selectedDate);
    threeDaysBefore.setDate(selectedDate.getDate()-3);

    let votingAllowed = currentPlayer.role==="admin" || (today>=threeDaysBefore && today<=selectedDate);
    let voters = currentPlayer.role==="admin"?players:[currentPlayer];

    voters.forEach(voter => {
      const card = document.createElement('div');
      card.className = 'card center';
      let html = `<h3>${voter.name} ocenia:</h3><div class="vote-row-container">`;
      players.forEach(player => {
        html += `<div class="vote-row">
          <div><span class="avatar">${player.avatar||"👤"}</span>${player.name}</div>
          <input type="number" step="0.1" min="1" max="10" ${!votingAllowed?"disabled":""} id="${voter.id}_${player.id}" />
        </div>`;
      });
      html += `</div>
        <div class="panel-buttons">
          <button ${!votingAllowed?"disabled":""} onclick="saveVotes('${voter.name}')">Zapisz oceny</button>
          <button class="absence-btn" onclick="markAbsent('${voter.id}')">Nieobecność</button>
        </div>`;
      if (!votingAllowed) html += `<p style="margin-top:20px;opacity:0.7;">Głosowanie dostępne tylko od 3 dni przed datą rundy do dnia rundy.</p>`;
      card.innerHTML = html;
      panelsDiv.appendChild(card);
    });
  }

  window.markAbsent = async function(playerId) {
    await supabase.from('absences').insert({ player_id: playerId, round_id: currentRoundId });
    const player = players.find(p => p.id === playerId);
    await supabase.from('players').update({ rating: player.rating }).eq('id', playerId);
    await loadPlayers();
  }

  window.saveVotes = async function(voterName) {
    for (let player of players) {
      const voter = players.find(p => p.name===voterName);
      const input = document.getElementById(voter.id+'_'+player.id);
      if (!input.value) continue;
      await supabase.from('votes').upsert({
        round_id: currentRoundId,
        player_id: player.id,
        voter_name: voterName,
        score: parseFloat(input.value.replace(",","."))
      });
    }
    await supabase.rpc('calculate_round', { p_round_id: currentRoundId });
    await loadPlayers();
  }

  async function addPlayer() {
    const name = document.getElementById('newPlayerName').value;
    if (!name) return;
    await supabase.from('players').insert({ name });
    document.getElementById('newPlayerName').value = '';
    await loadPlayers();
  }

  document.addEventListener("keydown", function(e){
    if(e.key==="Enter"){
      const email = document.getElementById("email");
      const password = document.getElementById("password");
      if(document.activeElement===email || document.activeElement===password) login();
    }
  });

  async function init() {
    const { data } = await supabase.auth.getUser();
    const addPlayerSection = document.getElementById("newPlayerName").parentElement;
    const penaltyBox = document.getElementById("adminPenaltyBox");
    const userBox = document.getElementById("userBox");
    const userName = document.getElementById("userName");
    const loginBox = document.getElementById("loginBox");
    const dateCard = document.getElementById("dateCard");

    if (!data.user) {
      panelsDiv.style.display="none";
      addPlayerSection.style.display="none";
      userBox.style.display="none";
      loginBox.style.display="flex";
      dateCard.style.display="none";
      penaltyBox.style.display="none";
    } else {
      panelsDiv.style.display="block";
      userBox.style.display="flex";
      loginBox.style.display="none";
      dateCard.style.display="block";
      const { data: player } = await supabase.from('players').select('*').eq('email', data.user.email).single();
      if(player){
        userName.innerHTML = `<span class="avatar">${player.avatar||"👤"}</span>${player.name}`;
        if(player.role==="admin"){
          addPlayerSection.style.display="block";
          penaltyBox.style.display="block";
        } else {
          addPlayerSection.style.display="none";
          penaltyBox.style.display="none";
        }
      }
    }

    await ensureRound(datePicker.value);
    updateNavbarDate();
    await loadPlayers();
  }

  init();

  function updateNavbarDate() {
    const date = new Date(datePicker.value);
    document.getElementById("navbarDate").innerText = "📅 "+date.toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"});
  }
});
