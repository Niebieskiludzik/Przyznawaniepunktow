document.addEventListener("DOMContentLoaded", async () => {

const supabase = window.supabaseClient;
const daysContainer = document.getElementById("daysContainer");

function getDays(){

const days=[];
const today=new Date();

for(let i=0;i<3;i++){

const d=new Date();
d.setDate(today.getDate()+i);

days.push(d.toISOString().split("T")[0]);

}

return days;

}

async function loadDays(){

daysContainer.innerHTML="";

const days=getDays();

for(let day of days){

const card=document.createElement("div");
card.className="day-card";

const title=document.createElement("h2");
title.innerText=day;

card.appendChild(title);

const {data}=await supabase
.from("field_meetups")
.select("*")
.eq("date",day);

const list=document.createElement("div");

if(!data || data.length===0){

list.innerHTML="pusto";

}else{

data.forEach(p=>{

list.innerHTML+=`

<div>
<span class="avatar">${p.avatar||"👤"}</span>
${p.player_name}<br>
od ${p.from_time||"-:-"} do ${p.to_time||"-:-"}<br>
${p.description||""}
</div>
`;

});

}

card.appendChild(list);
daysContainer.appendChild(card);

}

}

loadDays();

});
