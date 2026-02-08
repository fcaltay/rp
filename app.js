const LS_KEY="ramadan_events";
const el=id=>document.getElementById(id);

const grid=el("calendarGrid");
const monthTitle=el("monthTitle");
const nextList=el("nextList");

const dateInput=el("date");
const typeInput=el("type");
const whoInput=el("who");
const menuInput=el("menu");
const placeInput=el("place");
const noteInput=el("note");
const eventId=el("eventId");
const btnDelete=el("btnDelete");

let viewDate=new Date();
let filter="all";
let search="";

const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const load=()=>JSON.parse(localStorage.getItem(LS_KEY)||"[]");
const save=d=>localStorage.setItem(LS_KEY,JSON.stringify(d));

function renderCalendar(){
  grid.innerHTML="";
  monthTitle.textContent=viewDate.toLocaleString("tr",{month:"long",year:"numeric"});
  const first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);
  const start=(first.getDay()+6)%7;
  for(let i=0;i<42;i++){
    const d=new Date(viewDate.getFullYear(),viewDate.getMonth(),i-start+1);
    const cell=document.createElement("div");
    cell.className="day";
    cell.textContent=d.getDate();
    cell.onclick=()=>dateInput.value=iso(d);
    grid.appendChild(cell);
  }
}

function renderNext(){
  const events=load();
  const today=new Date();
  nextList.innerHTML="";
  for(let i=0;i<3;i++){
    const d=new Date(today);
    d.setDate(today.getDate()+i);
    const dayIso=iso(d);
    events.filter(e=>e.date===dayIso).forEach(e=>{
      const div=document.createElement("div");
      div.className="next-item";
      div.textContent=`${dayIso} • ${e.who}`;
      nextList.appendChild(div);
    });
  }
}

el("eventForm").onsubmit=e=>{
  e.preventDefault();
  const events=load();
  events.push({
    id:Date.now(),
    date:dateInput.value,
    type:typeInput.value,
    who:whoInput.value,
    menu:menuInput.value,
    place:placeInput.value,
    note:noteInput.value
  });
  save(events);
  renderNext();
};

el("prevMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);renderCalendar();}
el("nextMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);renderCalendar();}
el("btnToday").onclick=()=>{viewDate=new Date();renderCalendar();}

renderCalendar();
renderNext();
