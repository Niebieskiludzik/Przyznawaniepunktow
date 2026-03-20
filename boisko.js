const supabase = window.supabase.createClient(
'https://wzanqzcjrpbhocrfcciy.supabase.co',
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
);

const daysContainer = document.getElementById("daysContainer");

let currentStatus = {};

/* ============================= */
/* LOGIN SYSTEM (jak index) */

window.login = async function () {

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

const btn = document.getElementById("loginBtn");
const errorBox = document.getElementById("loginError");

errorBox.innerText = "";
btn.innerText = "Logowanie...";

const { error } = await supabase.auth.signInWithPassword({
email, password
});

btn.innerText = "Zaloguj";

if (error) {
errorBox.innerText = "❌ Błąd logowania";
return;
}

localStorage.setItem("savedEmail", email);

init();
};

window.logout = async function () {
await supabase.auth.signOut();
location.reload();
};

/* ============================= */
/* INIT NAVBAR */

async function initNavbar(){

const { data } = await supabase.auth.getUser();

const loginBox = document.getElementById("loginBox");
const userBox = document.getElementById("userBox");
const userName = document.getElementById("userName");

if(!data.user){

loginBox.style.display="flex";
userBox.style.display="none";

}else{

loginBox.style.display="none";
userBox.style.display="flex";

const {data:player}=await supabase
.from("players")
.select("*")
.eq("email",data.user.email)
.single();

if(player){

userName.innerHTML = `
<span class="avatar">${player.avatar || "👤"}</span>
${player.name}
`;

}

}

}

/* ============================= */
/* DATA W NAVBAR */

function updateDate(){

const now=new Date();

document.getElementById("navbarDate").innerText =
now.toLocaleDateString("pl-PL",{
day:"numeric",
month:"long"
});

}

/* ============================= */
/* BOISKO LOGIKA */

function getNextDays(){

const days=[];

for(let i=0;i<3;i++){

const d=new Date();
d.setDate(d.getDate()+i);

days.push(d.toISOString().split("T")[0]);

}

return days;

}

async function loadDays(){

daysContainer.innerHTML="";

const days=getNextDays();

for(const day of days){

await renderDay(day);

}

}

async function renderDay(date){

const {data:userData}=await supabase.auth.getUser();
const logged=userData.user;

const {data}=await supabase
.from("field_meetups")
.select("*")
.eq("date",date);

const card=document.createElement("div");
card.className="card";

const dateFormatted=new Date(date).toLocaleDateString("pl-PL",{
day:"numeric",
month:"long"
});

let html=`<h2>📅 ${dateFormatted}</h2>`;

if(!data || data.length===0){

html+=`<p>Pusto</p>`;

}else{

const yes=data.filter(x=>x.status==="yes");
const no=data.filter(x=>x.status==="no");

html+=`<h3>Będą</h3>`;

yes.forEach(p=>{

html+=`
<div class="meet-row">
<span class="avatar">${p.avatar || "👤"}</span>
${p.player_name}
<span class="time">${formatTime(p)}</span>
</div>
`;

if(p.note){
html+=`<div class="note">${p.note}</div>`;
}

});

html+=`<h3>Nie będą</h3>`;

no.forEach(p=>{

html+=`
<div class="meet-row">
<span class="avatar">${p.avatar || "👤"}</span>
${p.player_name}
</div>
`;

if(p.note){
html+=`<div class="note">${p.note}</div>`;
}

});

}

/* FORM */

if(logged){

html+=`

<hr>

<div class="formBox">

<div class="meet-row">
<input type="time" id="from_${date}">
<input type="time" id="to_${date}">
</div>

<input id="note_${date}" placeholder="Opis (opcjonalnie)">

<div class="status-row">
<button class="statusBtn" onclick="setStatus('${date}','yes',this)">Będę</button>
<button class="statusBtn" onclick="setStatus('${date}','no',this)">Nie będę</button>
</div>

<button class="saveBtn" onclick="save('${date}')">Zapisz</button>

</div>

`;

}

card.innerHTML=html;
daysContainer.appendChild(card);

}

function formatTime(p){

let from=p.time_from||"-:-";
let to=p.time_to||"-:-";

if(to==="sunset"){
to="zachodu";
}

return `(${from} - ${to})`;

}

window.setStatus=function(date,status,btn){

currentStatus[date]=status;

const buttons=btn.parentElement.querySelectorAll(".statusBtn");

buttons.forEach(b=>b.classList.remove("active"));

btn.classList.add("active");

}

window.save=async function(date){

const {data:userData}=await supabase.auth.getUser();
if(!userData.user) return;

const {data:player}=await supabase
.from("players")
.select("*")
.eq("email",userData.user.email)
.single();

await supabase
.from("field_meetups")
.upsert({
player_id:player.id,
player_name:player.name,
date:date,
status:currentStatus[date],
time_from:document.getElementById("from_"+date).value,
time_to:document.getElementById("to_"+date).value,
note:document.getElementById("note_"+date).value
});

loadDays();

};

/* ============================= */
/* INIT */

async function init(){

updateDate();
await initNavbar();
await loadDays();

}

init();
