const supabase = window.supabase.createClient(
  'https://wzanqzcjrpbhocrfcciy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
);

// pobranie id gracza z URL
const params = new URLSearchParams(window.location.search);
const playerId = params.get("id");

if(!playerId){
  alert("Brak ID gracza w URL!");
  throw new Error("Brak ID gracza w URL");
}

const playerNameEl = document.getElementById("playerName");
const averageRatingEl = document.getElementById("averageRating");
const historyTable = document.getElementById("historyTable");
const ratingChartCtx = document.getElementById("ratingChart").getContext("2d");

let ratingChart;

async function initProfile(){

  // pobranie danych gracza
  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if(!player){
    alert("Nie znaleziono gracza");
    return;
  }

  playerNameEl.textContent = player.name;

  // pobranie historii punktów
  const { data: rounds } = await supabase
    .from("votes")
    .select(`
      round_id,
      round:rounds(round_date),
      score
    `)
    .eq("player_id", playerId)
    .order("round.round_date", { ascending: true });

  if(!rounds || rounds.length === 0){
    historyTable.innerHTML += `<tr><td colspan="2">Brak danych</td></tr>`;
    return;
  }

  // wypełnianie tabeli i przygotowanie danych do wykresu
  const labels = [];
  const scores = [];
  let total = 0;

  rounds.forEach(r => {
    const date = new Date(r.round.round_date).toLocaleDateString("pl-PL");
    historyTable.innerHTML += `<tr><td>${date}</td><td>${r.score}</td></tr>`;
    labels.push(date);
    scores.push(r.score);
    total += r.score;
  });

  // średnia ocena
  const avg = total / rounds.length;
  averageRatingEl.innerHTML = `<b>Średnia ocena:</b> ${avg.toFixed(2)} pkt`;

  // wykres formy
  if(ratingChart) ratingChart.destroy(); // odświeżenie wykresu
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
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 10
        }
      }
    }
  });
}

initProfile();
