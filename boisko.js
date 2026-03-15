const supabase = window.supabase.createClient(
'https://wzanqzcjrpbhocrfcciy.supabase.co',
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
);

const daysContainer = document.getElementById("daysContainer");

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

const {data} = await supabase
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

html+=`<h3>Będą:</h3>`;

yes.forEach(p=>{

html+=`<div>${p.player_name} ${formatTime(p)}</div>`;

});

html+=`<h3>Nie będą:</h3>`;

no.forEach(p=>{

html+=`<div>${p.player_name}</div>`;

});

}

html+=`

<hr>

Od <input type="time" id="from_${date}">
Do <input type="time" id="to_${date}">
<button onclick="sunset('${date}')">Do zachodu</button>

<br><br>

<input id="note_${date}" maxlength="100" placeholder="opis (opcjonalnie)">

<br><br>

<button onclick="setStatus('${date}','yes')">Będę</button>
<button onclick="setStatus('${date}','no')">Nie będę</button>

<button onclick="save('${date}')">Zapisz</button>

`;

card.innerHTML=html;

daysContainer.appendChild(card);

}

function formatTime(p){

let from=p.time_from||"-:-";
let to=p.time_to||"-:-";

if(to==="sunset") to="do zachodu słońca";

return `od ${from} do ${to}`;

}

function sunset(date){

document.getElementById("to_"+date).value="";

document.getElementById("to_"+date).dataset.sunset=true;

}

let currentStatus=null;

function setStatus(date,status){

currentStatus=status;

}

async function save(date){

const {data:userData}=await supabase.auth.getUser();

if(!userData.user) return;

const email=userData.user.email;

const {data:player}=await supabase
.from("players")
.select("*")
.eq("email",email)
.single();

const from=document.getElementById("from_"+date).value;

const toInput=document.getElementById("to_"+date);

let to=toInput.value;

if(toInput.dataset.sunset) to="sunset";

const note=document.getElementById("note_"+date).value;

await supabase
.from("field_meetups")
.upsert({
player_id:player.id,
player_name:player.name,
date:date,
status:currentStatus,
time_from:from,
time_to:to,
note:note
});

loadDays();

}

loadDays();
