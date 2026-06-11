document.addEventListener("DOMContentLoaded", async () => {

  initAuthUI();

  const supabase = window.supabaseClient;

  let currentPlayer = null;
  let role = "guest";

  await resolveUser();

  loadMatches();

  async function resolveUser() {

    const { data:{ user } } =
      await supabase.auth.getUser();

    if(!user) return;

    const { data: player } =
      await supabase
      .from("players")
      .select("*")
      .eq("email", user.email)
      .single();

    if(!player) return;

    currentPlayer = player;

    role = player.role || "player";

    if(role === "admin"){
      document
      .getElementById("adminPanel")
      .style.display = "block";
    }
  }

  document
  .getElementById("addMatchBtn")
  ?.addEventListener("click", addMatch);

  async function addMatch(){

    const home =
      document.getElementById("homeTeam").value;

    const away =
      document.getElementById("awayTeam").value;

    const date =
      document.getElementById("matchDate").value;

    await supabase
      .from("matches")
      .insert({
        home_team:home,
        away_team:away,
        match_date:date
      });

    loadMatches();
  }

  async function loadMatches(){

    const { data:matches } =
      await supabase
      .from("matches")
      .select("*")
      .order("match_date");

    const box =
      document.getElementById("matchesList");

    box.innerHTML = "";

    for(const match of matches){

      const card =
      document.createElement("div");

      card.className =
      "card match-card";

      let predictionHTML = "";

      if(
        currentPlayer &&
        match.status === "scheduled"
      ){

        predictionHTML = `
        <div class="prediction-box">

          <input id="h${match.id}" type="number">

          <input id="a${match.id}" type="number">

          <button
          onclick="savePrediction(${match.id})">
          Typuj
          </button>

        </div>
        `;
      }

      let adminHTML = "";

      if(
        role==="admin" &&
        match.status==="scheduled"
      ){

        adminHTML = `
        <div>

          <input id="fh${match.id}" type="number">

          <input id="fa${match.id}" type="number">

          <button
          onclick="finishMatch(${match.id})">
          Zakończ
          </button>

        </div>
        `;
      }

      card.innerHTML = `

      <div>

        <div class="teams">
          ${match.home_team}
          vs
          ${match.away_team}
        </div>

        <div class="status ${match.status}">
          ${match.status}
        </div>

      </div>

      ${
      match.status==="finished"
      ?
      `<div class="result">
      ${match.home_score}:${match.away_score}
      </div>`
      :
      predictionHTML
      }

      ${adminHTML}
      `;

      box.appendChild(card);
    }
  }

  window.savePrediction =
  async function(matchId){

    const home =
      Number(document.getElementById(
      `h${matchId}`
      ).value);

    const away =
      Number(document.getElementById(
      `a${matchId}`
      ).value);

    await supabase
      .from("predictions")
      .upsert({

        match_id:matchId,

        player_id:currentPlayer.id,

        predicted_home:home,

        predicted_away:away

      });

    alert("Typ zapisany");
  }

  window.finishMatch =
  async function(matchId){

    const home =
      Number(document.getElementById(
      `fh${matchId}`
      ).value);

    const away =
      Number(document.getElementById(
      `fa${matchId}`
      ).value);

    await supabase
      .from("matches")
      .update({

        home_score:home,
        away_score:away,
        status:"finished"

      })
      .eq("id",matchId);

    await calculatePoints(
      matchId,
      home,
      away
    );

    loadMatches();
  }

  async function calculatePoints(
    matchId,
    home,
    away
  ){

    const { data: predictions } =
      await supabase
      .from("predictions")
      .select("*")
      .eq("match_id", matchId);

    for(const p of predictions){

      let points = 0;

      if(
        p.predicted_home===home &&
        p.predicted_away===away
      ){
        points = 3;
      }

      else{

        const winnerPrediction =
          Math.sign(
            p.predicted_home -
            p.predicted_away
          );

        const winnerMatch =
          Math.sign(
            home -
            away
          );

        if(
          winnerPrediction===
          winnerMatch
        ){
          points = 1;
        }
      }

      await supabase
        .from("predictions")
        .update({ points })
        .eq("id", p.id);
    }
  }

});
