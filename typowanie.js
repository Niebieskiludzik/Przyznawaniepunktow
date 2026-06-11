document.addEventListener("DOMContentLoaded", async () => {

  initAuthUI();

  const supabase = window.supabaseClient;

  const navbarDate =
    document.getElementById("navbarDate");

  navbarDate.innerText =
    "📅 " +
    new Date().toLocaleDateString("pl-PL");

  let currentPlayer = null;
  let role = "guest";

  await loadUser();
  await loadCountries();
  await loadMatches();

  document
    .getElementById("addMatchBtn")
    ?.addEventListener("click", addMatch);

  async function loadUser(){

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
      document.getElementById(
        "adminPanel"
      ).style.display = "block";
    }
  }

  async function loadCountries(){

    const { data:countries } =
      await supabase
      .from("countries")
      .select("*")
      .order("name");

    const home =
      document.getElementById("homeCountry");

    const away =
      document.getElementById("awayCountry");

    countries.forEach(country => {

      const html =
      `<option value="${country.id}">
        ${country.flag} ${country.name}
      </option>`;

      home.insertAdjacentHTML(
        "beforeend",
        html
      );

      away.insertAdjacentHTML(
        "beforeend",
        html
      );

    });

  }

  async function addMatch(){

    await supabase
      .from("matches")
      .insert({

        home_country_id:
          Number(
            homeCountry.value
          ),

        away_country_id:
          Number(
            awayCountry.value
          ),

        match_date:
          matchDate.value,

        status:"scheduled"

      });

    loadMatches();
  }

  async function loadMatches(){

    const { data:matches } =
      await supabase
      .from("matches")
      .select(`
      *,
      home:countries!home_country_id(*),
      away:countries!away_country_id(*)
      `)
      .order("match_date");

    const { data:predictions } =
      await supabase
      .from("predictions")
      .select("*");

    const box =
      document.getElementById(
        "matchesList"
      );

    box.innerHTML = "";

    matches.forEach(match => {

      const myPrediction =
      predictions?.find(
        p =>
        currentPlayer &&
        p.player_id === currentPlayer.id &&
        p.match_id === match.id
      );

      const deadline =
        new Date(match.match_date);

      deadline.setMinutes(
        deadline.getMinutes()-1
      );

      const canBet =
        new Date() < deadline;

      const div =
        document.createElement("div");

      div.className =
        "match-card";

      div.innerHTML = `

      <div class="match-top">

        <div class="teams">

          <div class="team">
            <div class="flag">
              ${match.home.flag}
            </div>

            ${match.home.name}
          </div>

          <div class="vs">VS</div>

          <div class="team">
            <div class="flag">
              ${match.away.flag}
            </div>

            ${match.away.name}
          </div>

        </div>

        <div class="status-badge ${match.status}">
          ${match.status}
        </div>

      </div>

      <div class="countdown"
           id="countdown-${match.id}">
      </div>

      ${renderPrediction(
        match,
        myPrediction,
        canBet
      )}

      ${renderAdmin(match)}

      `;

      box.appendChild(div);

      startCountdown(match);

    });

  }

  function renderPrediction(
    match,
    prediction,
    canBet
  ){

    if(match.status === "finished"){

      return `
      <div class="result">

      ${match.home_score}
      :
      ${match.away_score}

      </div>

      ${
      prediction
      ?
      `
      <div class="my-tip">
      🎯 Twój typ:
      ${prediction.predicted_home}
      :
      ${prediction.predicted_away}
      (${prediction.points} pkt)
      </div>
      `
      :
      ""
      }
      `;
    }

    if(!currentPlayer){

      return `
      <div class="locked">
      Zaloguj się aby typować
      </div>
      `;
    }

    if(!canBet){

      return `
      <div class="locked">
      🔒 Typowanie zamknięte
      </div>
      `;
    }

    return `

    <div class="prediction-box">

      <input
      id="h${match.id}"
      type="number">

      <input
      id="a${match.id}"
      type="number">

      <button
      onclick="savePrediction(${match.id})">
      Zapisz typ
      </button>

    </div>

    ${
    prediction
    ?
    `
    <div class="my-tip">
    🎯 Twój typ:
    ${prediction.predicted_home}
    :
    ${prediction.predicted_away}
    </div>
    `
    :
    ""
    }

    `;
  }

  function renderAdmin(match){

    if(role !== "admin") return "";

    if(match.status === "finished")
      return "";

    return `

    <div class="admin-score">

      <input
      id="fh${match.id}"
      type="number">

      <input
      id="fa${match.id}"
      type="number">

      <button
      onclick="finishMatch(${match.id})">
      Ustaw wynik
      </button>

    </div>

    `;
  }

  window.savePrediction =
  async function(matchId){

    const home =
      Number(
        document.getElementById(
        `h${matchId}`
      ).value);

    const away =
      Number(
        document.getElementById(
        `a${matchId}`
      ).value);

    await supabase
      .from("predictions")
      .upsert({

        player_id:
          currentPlayer.id,

        match_id:
          matchId,

        predicted_home:
          home,

        predicted_away:
          away

      });

    loadMatches();
  }

  window.finishMatch =
  async function(matchId){

    const home =
      Number(
        document.getElementById(
        `fh${matchId}`
      ).value);

    const away =
      Number(
        document.getElementById(
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

    const { data:list } =
      await supabase
      .from("predictions")
      .select("*")
      .eq("match_id", matchId);

    for(const p of list){

      let points = 0;

      if(
        p.predicted_home === home &&
        p.predicted_away === away
      ){
        points = 3;
      }
      else{

        const real =
          Math.sign(home-away);

        const pred =
          Math.sign(
            p.predicted_home -
            p.predicted_away
          );

        if(real === pred)
          points = 1;
      }

      await supabase
        .from("predictions")
        .update({ points })
        .eq("id", p.id);
    }
  }

  function startCountdown(match){

    const box =
      document.getElementById(
        `countdown-${match.id}`
      );

    function update(){

      const diff =
      new Date(match.match_date)
      -
      new Date();

      if(diff <= 0){

        box.innerHTML =
        "⚽ Mecz rozpoczęty";

        return;
      }

      const d =
      Math.floor(
        diff/86400000
      );

      const h =
      Math.floor(
        diff%86400000/3600000
      );

      const m =
      Math.floor(
        diff%3600000/60000
      );

      box.innerHTML =
      `⏳ ${d}d ${h}h ${m}m`;

    }

    update();

    setInterval(update,60000);
  }

});
