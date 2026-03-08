document.addEventListener("DOMContentLoaded", async () => {

const supabase = window.supabase.createClient(
  'https://wzanqzcjrpbhocrfcciy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
);

let players = [];
let currentRoundId = null;
let yesterdayRatings = {};
let votersDone = new Set();

const datePicker = document.getElementById('datePicker');
const rankingTable = document.getElementById('rankingTable');
const panelsDiv = document.getElementById('panels');

datePicker.value = new Date().toISOString().split('T')[0];

datePicker.addEventListener('change', init);
document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);

async function ensureRound(date) {

  const { data } = await supabase
  .from('votes')
  .select(`
  score,
  player_id,
  players:player_id(name)
  `)
  .gte('created_at', start.toISOString());

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

  const { data } = await supabase
    .from('players')
    .select('*')
    .order('rating', { ascending: false });

  players = data || [];

  renderRanking();
  renderPanels();
}

async function loadVotesStatus() {

  const { data } = await supabase
    .from('votes')
    .select('voter_name')
    .eq('round_id', currentRoundId);

  votersDone = new Set(data?.map(v => v.voter_name));

}

async function loadYesterdayRatings() {

  const { data } = await supabase
    .from('players')
    .select('id,rating');

  yesterdayRatings = {};

  data?.forEach(p => {
    yesterdayRatings[p.id] = p.rating;
  });
}

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

    let medal = '';
    if (i === 0) medal = '🥇';
    if (i === 1) medal = '🥈';
    if (i === 2) medal = '🥉';

    const diff = Math.round(p.rating - (yesterdayRatings[p.id] || p.rating));

    rankingTable.innerHTML += `
      <tr class="${i === 0 ? 'leader' : ''}">
        <td>${medal || i + 1}</td>
        <td>${p.name}</td>
        <td>${Math.round(p.rating)}</td>
        <td class="${diff >= 0 ? 'positive' : 'negative'}">
          ${diff >= 0 ? '+' : ''}${diff}
        </td>
      </tr>
    `;
  });

}

function renderPanels() {

  panelsDiv.innerHTML = '';

  players.forEach((voter) => {

    const card = document.createElement('div');
    card.className = 'card center';

    let voted = votersDone.has(voter.name);

    let html = `
    <h3>
    ${voter.name} ocenia
    ${voted ? "✅" : "❌"}
    </h3>`;
    
    players.forEach((player) => {

    if(player.id === voter.id) return;

      html += `
        <div class="vote-row">
          <div>${player.name}</div>
          <input type="number" min="1" max="10"
          id="${voter.id}_${player.id}" />
        </div>
      `;

    });

    html += `
  <button onclick="saveVotes('${voter.name}')">Zapisz oceny</button>
`;

    card.innerHTML = html;
    panelsDiv.appendChild(card);

  });

}

window.markAbsent = async function (playerId) {

  await supabase.from('absences').insert({
    player_id: playerId,
    round_id: currentRoundId,
  });

  const player = players.find((p) => p.id === playerId);

  await supabase
    .from('players')
    .update({ rating: player.rating - 20 })
    .eq('id', playerId);

  alert('Dodano nieobecność -20');

  await loadPlayers();
};

window.saveVotes = async function (voterName) {

  const voter = players.find(p => p.name === voterName);

  for (let player of players) {

    const input = document.getElementById(
      voter.id + '_' + player.id
    );

    if (!input) continue;

    if (!input.value) continue;

    await supabase.from('votes').upsert({
      round_id: currentRoundId,
      player_id: player.id,
      voter_name: voterName,
      score: Number(input.value),
    });

  }

  await supabase.rpc('calculate_round', {
    p_round_id: currentRoundId,
  });

  await loadPlayers();
  await loadMonthlyRanking();
  await loadVotesStatus();

};

async function addPlayer() {

  const name = document.getElementById('newPlayerName').value;

  if (!name) return;

  await supabase.from('players').insert({ name });

  document.getElementById('newPlayerName').value = '';

  await loadPlayers();
}

async function loadMonthlyRanking(){

const start = new Date();
start.setDate(1);

const { data } = await supabase
.from('votes')
.select(`
score,
player_id,
players(name)
`)
.gte('created_at', start.toISOString());

const map = {};

data?.forEach(v => {

if(!map[v.player_id]){

map[v.player_id] = {
name:v.players.name,
scores:[]
};

}

map[v.player_id].scores.push(v.score);

});

const result = Object.values(map).map(p=>{

const avg = p.scores.reduce((a,b)=>a+b,0)/p.scores.length;

return {
name:p.name,
score:avg
};

});

result.sort((a,b)=>b.score-a.score);

renderMonthly(result);

}

function renderMonthly(players){

const table = document.getElementById("monthlyRanking");

table.innerHTML=`
<tr>
<th>#</th>
<th>Gracz</th>
<th>Średnia</th>
</tr>
`;

players.forEach((p,i)=>{

table.innerHTML+=`
<tr>
<td>${i+1}</td>
<td>${p.name}</td>
<td>${p.score.toFixed(2)}</td>
</tr>
`;

});

}

async function init() {

  console.log('INIT START');

  await ensureRound(datePicker.value);

  await loadYesterdayRatings();

  await loadVotesStatus();
  
  await loadPlayers();
  
  await loadMonthlyRanking();
  
  await loadVotesStatus();

  await loadMonthlyRanking();

}

await init();

});
