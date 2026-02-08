/* Ramazan İftar Takvimi — vanilla JS + localStorage */

const LS_KEY = "ramadan_iftar_events_v1";

const el = (id) => document.getElementById(id);
const grid = el("calendarGrid");
const monthTitle = el("monthTitle");
const list = el("eventList");
const listHint = el("listHint");

const form = el("eventForm");
const eventId = el("eventId");
const dateInput = el("date");
const typeInput = el("type");
const whoInput = el("who");
const menuInput = el("menu");
const placeInput = el("place");
const noteInput = el("note");

const btnDelete = el("btnDelete");
const btnNew = el("btnNew");
const btnToday = el("btnToday");
const btnReset = el("btnReset");

const importFile = el("importFile");
const searchInput = el("search");

const menuField = el("menuField");
const placeField = el("placeField");

/* Gün detayı paneli */
const dayDetails = el("dayDetails");
const dayDetailsTitle = el("dayDetailsTitle");
const dayDetailsBody = el("dayDetailsBody");
const btnAddForSelected = el("btnAddForSelected");

let viewDate = new Date(); // current month
let filter = "all";
let search = "";
let selectedISO = toISODate(new Date());

function pad(n){ return String(n).padStart(2,"0"); }
function toISODate(d){
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function parseISODate(s){
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function loadEvents(){
  try{
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  }catch{
    return [];
  }
}
function saveEvents(events){
  localStorage.setItem(LS_KEY, JSON.stringify(events));
}

function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function applyTypeVisibility(){
  const t = typeInput.value;
  const isHost = t === "host";
  menuField.style.display = isHost ? "block" : "none";
  placeField.style.display = isHost ? "none" : "block";
}

function formatMonthTitle(d){
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function matchesFilterAndSearch(ev){
  if(filter !== "all" && ev.type !== filter) return false;
  if(!search) return true;
  const hay = [
    ev.who, ev.menu, ev.place, ev.note, ev.date, ev.type
  ].join(" ").toLowerCase();
  return hay.includes(search.toLowerCase());
}

function getEventsForDate(events, iso){
  return events.filter(e => e.date === iso && matchesFilterAndSearch(e))
               .sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));
}

function getMonthEvents(events, d){
  const a = startOfMonth(d);
  const b = endOfMonth(d);
  const aISO = toISODate(a);
  const bISO = toISODate(b);
  return events
    .filter(e => e.date >= aISO && e.date <= bISO)
    .filter(matchesFilterAndSearch)
    .sort((x,y)=> x.date.localeCompare(y.date));
}

function renderCalendar(){
  const events = loadEvents();

  monthTitle.textContent = formatMonthTitle(viewDate);

  const first = startOfMonth(viewDate);
  const last = endOfMonth(viewDate);

  // Monday-based calendar: 0=Sun..6=Sat => convert to Monday start
  const firstDow = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = last.getDate();

  grid.innerHTML = "";
  const todayISO = toISODate(new Date());

  // previous month spill
  const prevMonthLast = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0);
  const prevDays = prevMonthLast.getDate();

  for(let i=0; i<42; i++){
    const cell = document.createElement("div");
    cell.className = "day";

    let dayNum, cellDate, muted = false;

    if(i < firstDow){
      dayNum = prevDays - (firstDow - 1 - i);
      cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, dayNum);
      muted = true;
    }else if(i >= firstDow + daysInMonth){
      dayNum = i - (firstDow + daysInMonth) + 1;
      cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, dayNum);
      muted = true;
    }else{
      dayNum = i - firstDow + 1;
      cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
    }

    const iso = toISODate(cellDate);

    if(muted) cell.classList.add("muted");
    if(iso === todayISO) cell.classList.add("today");

    cell.innerHTML = `
      <div class="num">${dayNum}</div>
      <div class="badges"></div>
    `;

    const dayEvents = getEventsForDate(events, iso);
    const badges = cell.querySelector(".badges");

    dayEvents.slice(0,3).forEach(ev=>{
      const b = document.createElement("div");
      b.className = `badge ${ev.type}`;
      b.title = ev.who;
      b.textContent = ev.type === "host" ? `🏠 ${ev.who}` : `🚗 ${ev.who}`;
      badges.appendChild(b);
    });

    if(dayEvents.length > 3){
      const more = document.createElement("div");
      more.className = "badge";
      more.textContent = `+${dayEvents.length-3}`;
      badges.appendChild(more);
    }

    // click → set date, show day details
    cell.addEventListener("click", ()=>{
      dateInput.value = iso;
      el("formHint").textContent = muted
        ? "Başka ay seçtin — yine de ekleyebilirsin."
        : "Seçili tarihe kayıt ekleyebilirsin.";
      clearEditing(false);
      renderDayDetails(iso);
    });

    grid.appendChild(cell);
  }

  renderList();

  // Ay değişince seçili gün aynı ayda değilse bugün'e çek
  if(!selectedISO) selectedISO = toISODate(new Date());
}

function renderList(){
  const events = loadEvents();
  const monthEvents = getMonthEvents(events, viewDate);

  listHint.textContent = `${monthEvents.length} kayıt (filtre/araman ile)`;

  if(monthEvents.length === 0){
    list.innerHTML = `<div class="item"><div class="left">
      <span class="tag host">İpucu</span>
      <div>
        <h4>Henüz kayıt yok</h4>
        <p>Takvimden bir güne tıkla ve sağdan ekle. Dilersen “Bizde” için menü planını yaz.</p>
      </div>
    </div></div>`;
    return;
  }

  list.innerHTML = "";
  monthEvents.forEach(ev=>{
    const item = document.createElement("div");
    item.className = "item";

    const tagClass = ev.type === "host" ? "host" : "guest";
    const tagText = ev.type === "host" ? "Bizde" : "Gidiyoruz";

    const detail = ev.type === "host"
      ? (ev.menu ? `Menü: ${ev.menu}` : "Menü: —")
      : (ev.place ? `Not: ${ev.place}` : "Not: —");

    const extra = ev.note ? ` • ${ev.note}` : "";

    item.innerHTML = `
      <div class="left">
        <div class="tag ${tagClass}">${tagText}</div>
        <div>
          <h4>${ev.date} — ${escapeHtml(ev.who)}</h4>
          <p>${escapeHtml(detail)}${escapeHtml(extra)}</p>
        </div>
      </div>
      <div class="actions">
        <button class="smallbtn" data-action="edit">Düzenle</button>
      </div>
    `;

    item.querySelector('[data-action="edit"]').addEventListener("click", ()=>{
      loadToForm(ev.id);
      renderDayDetails(ev.date);
      window.scrollTo({top: 0, behavior:"smooth"});
    });

    list.appendChild(item);
  });
}

function renderDayDetails(iso){
  const events = loadEvents();
  const dayEvents = events
    .filter(e => e.date === iso)
    .filter(matchesFilterAndSearch)
    .sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));

  selectedISO = iso;
  if(dayDetailsTitle) dayDetailsTitle.textContent = `Gün Detayı: ${iso}`;

  if(!dayDetailsBody) return;

  if(dayEvents.length === 0){
    dayDetailsBody.innerHTML = `<p class="hint">Bu gün için kayıt yok. “Bu güne ekle” ile hızlıca ekleyebilirsin.</p>`;
    return;
  }

  dayDetailsBody.innerHTML = "";
  dayEvents.forEach(ev=>{
    const typeText = ev.type === "host" ? "🏠 Bizde iftar" : "🚗 Gidiyoruz";
    const detail = ev.type === "host"
      ? (ev.menu ? `Menü: ${escapeHtml(ev.menu)}` : "Menü: —")
      : (ev.place ? `Not: ${escapeHtml(ev.place)}` : "Not: —");

    const note = ev.note ? `<p>Ek not: ${escapeHtml(ev.note)}</p>` : "";

    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <div class="top">
        <div>
          <strong>${typeText} — ${escapeHtml(ev.who)}</strong>
          <p>${detail}</p>
          ${note}
        </div>
        <div class="mini-actions">
          <button class="smallbtn" data-act="edit">Düzenle</button>
        </div>
      </div>
    `;

    card.querySelector('[data-act="edit"]').addEventListener("click", ()=>{
      loadToForm(ev.id);
      window.scrollTo({top: 0, behavior:"smooth"});
    });

    dayDetailsBody.appendChild(card);
  });
}

function escapeHtml(s){
  return (s ?? "")
    .toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function clearEditing(resetDate=true){
  eventId.value = "";
  whoInput.value = "";
  menuInput.value = "";
  placeInput.value = "";
  noteInput.value = "";
  if(resetDate) dateInput.value = "";
  typeInput.value = "host";
  applyTypeVisibility();
  btnDelete.disabled = true;
}

function loadToForm(id){
  const events = loadEvents();
  const ev = events.find(x=>x.id === id);
  if(!ev) return;

  eventId.value = ev.id;
  dateInput.value = ev.date;
  typeInput.value = ev.type;
  whoInput.value = ev.who || "";
  menuInput.value = ev.menu || "";
  placeInput.value = ev.place || "";
  noteInput.value = ev.note || "";

  applyTypeVisibility();
  btnDelete.disabled = false;
  el("formHint").textContent = "Düzenleme modundasın. Kaydet → günceller.";
}

function upsertEvent(data){
  const events = loadEvents();
  const idx = events.findIndex(x=>x.id === data.id);
  if(idx >= 0){
    events[idx] = { ...events[idx], ...data, updatedAt: Date.now() };
  }else{
    events.push({ ...data, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveEvents(events);
}

function deleteEventById(id){
  const events = loadEvents().filter(x=>x.id !== id);
  saveEvents(events);
}

/* Filter chips */
document.querySelectorAll(".chip").forEach(chip=>{
  chip.addEventListener("click", ()=>{
    filter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach(c=>{
      c.classList.toggle("active", c.dataset.filter === filter);
    });
    renderCalendar();
    renderDayDetails(selectedISO || dateInput.value || toISODate(new Date()));
  });
});

/* search */
searchInput.addEventListener("input", (e)=>{
  search = e.target.value.trim();
  renderCalendar();
  renderDayDetails(selectedISO || dateInput.value || toISODate(new Date()));
});

typeInput.addEventListener("change", applyTypeVisibility);

form.addEventListener("submit", (e)=>{
  e.preventDefault();

  const date = dateInput.value;
  const type = typeInput.value;
  const who = whoInput.value.trim();

  if(!date || !who){
    alert("Tarih ve 'Kim?' alanı zorunlu.");
    return;
  }

  const id = eventId.value || uid();
  const menu = (type === "host") ? menuInput.value.trim() : "";
  const place = (type === "guest") ? placeInput.value.trim() : "";
  const note = noteInput.value.trim();

  upsertEvent({ id, date, type, who, menu, place, note });

  clearEditing(false);
  renderCalendar();
  renderDayDetails(date);
});

btnDelete.addEventListener("click", ()=>{
  const id = eventId.value;
  if(!id) return;
  if(confirm("Bu kaydı silmek istediğine emin misin?")){
    deleteEventById(id);
    clearEditing(false);
    renderCalendar();
    renderDayDetails(dateInput.value || selectedISO || toISODate(new Date()));
  }
});

btnNew.addEventListener("click", ()=>{
  clearEditing(false);
  el("formHint").textContent = "Yeni kayıt ekle.";
});

el("prevMonth").addEventListener("click", ()=>{
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1);
  renderCalendar();
});

el("nextMonth").addEventListener("click", ()=>{
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1);
  renderCalendar();
});

btnToday.addEventListener("click", ()=>{
  viewDate = new Date();
  dateInput.value = toISODate(new Date());
  renderCalendar();
  renderDayDetails(dateInput.value);
});

btnReset.addEventListener("click", ()=>{
  if(confirm("Tüm kayıtlar silinecek. Emin misin?")){
    localStorage.removeItem(LS_KEY);
    clearEditing(true);
    renderCalendar();
    renderDayDetails(dateInput.value || toISODate(new Date()));
  }
});

btnAddForSelected?.addEventListener("click", ()=>{
  dateInput.value = selectedISO || toISODate(new Date());
  clearEditing(false);
  el("formHint").textContent = "Seçili gün için yeni kayıt ekle.";
  window.scrollTo({top: 0, behavior:"smooth"});
});

/* Init */
(function init(){
  dateInput.value = toISODate(new Date());
  selectedISO = dateInput.value;
  applyTypeVisibility();
  renderCalendar();
  renderDayDetails(dateInput.value);
})();
