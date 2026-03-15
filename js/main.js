document.addEventListener("DOMContentLoaded", async () => {

const supabase = window.supabaseClient;

let players = [];
let currentRoundId = null;
let yesterdayRatings = {};

const datePicker = document.getElementById('datePicker');
const rankingTable = document.getElementById('rankingTable');
const panelsDiv = document.getElementById('panels');

if(datePicker){
datePicker.value = new Date().toISOString().split('T')[0];
datePicker.addEventListener('change', init);
}

const addPlayerBtn = document.getElementById('addPlayerBtn');
if(addPlayerBtn){
addPlayerBtn.addEventListener('click', addPlayer);
}

const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");

if(emailInput){
emailInput.addEventListener("keypress",e=>{
if(e.key==="Enter") login();
});
}

if(passInput){
passInput.addEventListener("keypress",e=>{
if(e.key==="Enter") login();
});
}

async function ensureRound(date){

const {data}=await supabase
.from('rounds')
.select('*')
.eq('round_date',date)
.single();

if(!data){

const {data:newRound}=await supabase
.from('rounds')
.insert({round_date:date})
.select()
.single();

currentRoundId=newRound.id;

}else{

currentRoundId=data.id;

}

}

async function loadPlayers(){

const {data}=await supabase
.from('players')
.select('*')
.order('rating',{ascending:false});

players=data||[];

if(rankingTable) renderRanking();
if(panelsDiv) renderPanels();
loadBoiskoCounter();

}

async function loadYesterdayRatings(){

const {data}=await supabase
.from('players')
.select('id,rating');

yesterdayRatings={};

data?.forEach(p=>{
yesterdayRatings[p.id]=p.rating;
});

}

function renderRanking(){

rankingTable.innerHTML=`

<tr>
<th>#</th>
<th>Gracz</th>
<th>Punkty</th>
<th>Zmiana</th>
</tr>
`;

players.forEach((p,i)=>{

let medal='';
if(i===0) medal='🥇';
if(i===1) medal='🥈';
if(i===2) medal='🥉';

const diff=Math.round(p.rating-(yesterdayRatings[p.id]||p.rating));

rankingTable.innerHTML+=`

<tr>
<td>${medal||i+1}</td>
<td><span class="avatar">${p.avatar||"👤"}</span> ${p.name}</td>
<td>${Math.round(p.rating)}</td>
<td>${diff>=0?'+':''}${diff}</td>
</tr>
`;

});

}

async function renderPanels(){

panelsDiv.innerHTML='';

const {data}=await supabase.auth.getUser();
const userEmail=data.user?.email;

const currentPlayer=players.find(p=>p.email===userEmail);

if(!currentPlayer) return;

players.forEach((player)=>{

const card=document.createElement('div');
card.className='card';

card.innerHTML=`

<div class="vote-row">
<span class="avatar">${player.avatar||"👤"}</span>
${player.name}
<input type="number" id="${player.id}">
</div>
`;

panelsDiv.appendChild(card);

});

}

window.login=async function(){

const email=document.getElementById("email").value;
const password=document.getElementById("password").value;

const {error}=await supabase.auth.signInWithPassword({
email:email,
password:password
});

if(error){
alert("Błąd logowania");
return;
}

localStorage.setItem("lastEmail",email);

init();

}

window.logout=async function(){

await supabase.auth.signOut();
location.reload();

}

async function addPlayer(){

const name=document.getElementById('newPlayerName').value;

if(!name) return;

await supabase.from('players').insert({name});

document.getElementById('newPlayerName').value='';

await loadPlayers();

}

async function loadBoiskoCounter(){

const counter=document.getElementById("boiskoCounter");
if(!counter) return;

const today=new Date().toISOString().split("T")[0];

const {data}=await supabase
.from("field_meetups")
.select("*")
.eq("date",today)
.eq("status","yes");

const willCome=data?data.length:0;
const totalPlayers=players.length;

counter.innerText=`dziś będzie ${willCome}/${totalPlayers} osób`;

}

async function init(){

const {data}=await supabase.auth.getUser();

const loginBox=document.getElementById("loginBox");
const userBox=document.getElementById("userBox");
const userName=document.getElementById("userName");

if(!data.user){

if(loginBox) loginBox.style.display="block";
if(userBox) userBox.style.display="none";

}else{

if(loginBox) loginBox.style.display="none";
if(userBox) userBox.style.display="block";

const {data:player}=await supabase
.from('players')
.select('*')
.eq('email',data.user.email)
.single();

if(userName && player){

userName.innerHTML=
`<span class="avatar">${player.avatar||"👤"}</span> ${player.name}`;

}

}

if(datePicker){
await ensureRound(datePicker.value);
}

await loadYesterdayRatings();
await loadPlayers();

}

await init();

});
