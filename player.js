// player.js
const supabaseClient = window.supabase; // używamy już istniejącej instancji

// pobranie ID gracza z URL
const params = new URLSearchParams(window.location.search);
const playerId = params.get("id");

if (!playerId) {
  alert("Brak ID gracza w URL!");
  throw new Error("Brak ID gracza w URL");
}

const playerNameEl = document.getElementById("playerName");
const averageRatingEl = document.getElementById("averageRating");
const historyTable = document.getElementById("historyTable");
const ratingChartCtx = document.getElementById("ratingChart").getContext("2d");

let ratingChart;

// inicjalizacja profilu
async function initProfile() {

  // pobranie danych gracza
  const { data: player } = await supabaseClient
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (!player) {
    alert("Nie znaleziono gracza");
    return;
  }

  playerNameEl.textContent = player.name;

  // pobranie głosów gracza
  const { data: votes } = await supabaseClient
    .from("votes")
    .select("score, round_id")
    .eq("player_id", playerId)
    .order("round_id", { ascending: true });

  if (!votes || votes.length === 0) {
    historyTable.innerHTML += `<tr><td colspan="2">Brak danych</td></tr>`;
    averageRatingEl.textContent = "Brak ocen";
    return;
  }

  // pobranie dat rund
  const roundIds = votes.map(v => v.round_id);
  const { data: rounds } = await supabaseClient
    .from("rounds")
    .select("id, round_date")
    .in("id", roundIds);

  // mapa round_id -> round_date
  const roundMap = {};
  rounds.forEach(r => roundMap[r.id] = r.round_date);

  // wypełnienie tabeli historii i przygotowanie danych do wykresu
  const labels = [];
  const scores = [];
  let total = 0;

  votes.forEach(v => {
    const date = roundMap[v.round_id]
      ? new Date(roundMap[v.round_id]).toLocaleDateString("pl-PL")
      : "Brak daty";

    historyTable.innerHTML += `<tr><td>${date}</td><td>${v.score}</td></tr>`;

    labels.push(date);
    scores.push(v.score);
    total += v.score;
  });

  // średnia ocena
  const avg = total / votes.length;
  averageRatingEl.innerHTML = `<b>Średnia ocena:</b> ${avg.toFixed(2)} pkt`;

  // wykres formy
  if (ratingChart) ratingChart.destroy(); // odświeżenie wykresu
  ratingChart = new Chart(ratingChartCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Punkty",
        data: scores,
        fill: true,
        backgroundColor: "rgba(99, 132, 255, 0.2)",
        borderColor: "rgba(99, 132, 255, 1)",
        tension: 0.3,
        pointRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, suggestedMax: 10 } }
    }
  });
}

initProfile();
