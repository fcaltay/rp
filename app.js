/* Ramazan İftar Takvimi — Çalışan sürüm (localStorage + modal + toast) */

const LS_KEY = "ramadan_iftar_events_v2";

const el = (id) => document.getElementById(id);
const grid = el("calendarGrid");
const monthTitle = el("monthTitle");

const form = el("eventForm");
const eventId = el("eventId");
const dateInput = el("date");
const typeInput = el("type");
const whoInput = el("who");
const menuInput = el("menu");
const placeInput = el("place");
const noteInput = el("note");

const menuField = el("menuField");
const placeField = el("placeField");

const btnDelete = el("btnDelete");
const btnNew = el("btnNew");
const btnToday = el("btnToday");
const btnReset = el("btnReset");
const btnOpenToday = el("btnOpenToday");

const searchInput = el("search");
const nextList = el("nextList");

const toast = el("toast");

const dayModal = el("dayModal");
const dayModalTitle = el("dayModalTitle");
const dayModalSub = el("dayModalSub");
const dayModalBody = el("dayModalBody");
const btnCloseModal = el("btnCloseModal");
const btnAddForDay = el("btnAddForDay");

let viewDate = new Date();
let selectedISO = toISODate(new Date());
let filter = "all";
let search = "";

/* ===== helpers ===== */
function pad(n){ return String(n).padStart(2,"0"); }
function toISODate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseISODate(s){
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function escapeHtml(s){
  return (s ?? "")
    .toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

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

/* ===== toast ===== */
let toastTimer = null;
function showToast(msg){
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove("show"), 1400);
}

/* ===== form toggle ===== */
function applyTypeVisibility(){
  const isHost = typeInput.value === "host";
  menuField.style.display = isHost ? "block" : "none";
  placeField.style.display = isHost ? "none" : "block";
}

/* ===== filter/search ===== */
function matchesFilterAndSearch(ev){
  if(filter !== "all" && ev.type !== filter) return false;
  if(!search) return true;
  const hay = [ev.date, ev.type, ev.who, ev.menu, ev.place, ev.note].join(" ").toLowerCase();
  return hay.includes(search.toLowerCase());
}

/* ===== CRUD ===== */
function upsertEvent(data){
  const events = loadEvents();
  const idx = events.findIndex(x => x.id === data.id);
  if(idx >= 0){
    events[idx] = { ...events[idx], ...data, updatedAt: Date.now() };
  }else{
    events.push({ ...data, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveEvents(events);
}
function deleteEventById(id){
  const events = loadEvents().filter(x => x.id !== id);
  saveEvents(events);
}

/* ===== calendar render ===== */
function formatMonthTitle(d){
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function renderCalendar(){
  const events = loadEvents();
  monthTitle.textContent = formatMonthTitle(viewDate);

  const first = startOfMonth(viewDate);
  const last = endOfMonth(viewDate);

  // Monday-start
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();

  grid.innerHTML = "";

  const prevMonthLast = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0);
  const prevDays = prevMonthLast.getDate();

  for(let i=0;i<42;i++){
    const cell = document.createElement("div");
    cell.className = "day";

    let dayNum, cellDate, muted=false;

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
    if(iso === selectedISO) cell.classList.add("selected");

    cell.innerHTML = `<div class="num">${dayNum}</div><div class="badges"></div>`;

    const dayEvents = events
      .filter(e => e.date === iso)
      .filter(matchesFilterAndSearch)
      .sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));

    const badges = cell.querySelector(".badges");
    dayEvents.slice(0,2).forEach(ev=>{
      const b = document.createElement("div");
      b.className = `badge ${ev.type}`;
      b.textContent = ev.type === "host" ? `🏠` : `🚗`;
      badges.appendChild(b);
    });
    if(dayEvents.length > 2){
      const more = document.createElement("div");
      more.className = "badge";
      more.textContent = `+${dayEvents.length-2}`;
      badges.appendChild(more);
    }

    cell.addEventListener("click", ()=>{
      if(muted) return; // istersen muted'e de izin verilir
      selectedISO = iso;
      dateInput.value = iso;
      renderCalendar();
      openDayModal(iso);
    });

    grid.appendChild(cell);
  }
}

/* ===== modal day view ===== */
function openModal(){
  dayModal.classList.remove("hidden");
  dayModal.setAttribute("aria-hidden","false");
}
function closeModal(){
  dayModal.classList.add("hidden");
  dayModal.setAttribute("aria-hidden","true");
}

function openDayModal(iso){
  const events = loadEvents()
    .filter(e => e.date === iso)
    .filter(matchesFilterAndSearch)
    .sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));

  const d = parseISODate(iso);
  const dayName = d.toLocaleDateString("tr-TR", { weekday:"long" });

  dayModalTitle.textContent = `${iso}`;
  dayModalSub.textContent = `${dayName} — ${events.length} kayıt`;

  btnAddForDay.onclick = ()=>{
    dateInput.value = iso;
    clearEditing(false);
    closeModal();
    showToast("Tarih seçildi");
  };

  if(events.length === 0){
    dayModalBody.innerHTML = `<div class="modal-item"><p>Bu gün için kayıt yok. “Bu güne ekle” ile hızlıca ekle.</p></div>`;
    openModal();
    return;
  }

  dayModalBody.innerHTML = "";
  events.forEach(ev=>{
    const typeText = ev.type === "host" ? "🏠 Bizde iftar" : "🚗 Gidiyoruz";
    const line1 = ev.type === "host"
      ? (ev.menu ? `Menü: ${escapeHtml(ev.menu)}` : "Menü: —")
      : (ev.place ? `Kime gidiyoruz / Yer: ${escapeHtml(ev.place)}` : "Kime gidiyoruz / Yer: —");

    const note = ev.note ? `Not: ${escapeHtml(ev.note)}` : "";

    const wrap = document.createElement("div");
    wrap.className = "modal-item";
    wrap.innerHTML = `
      <div class="row">
        <div>
          <h4>${typeText} — ${escapeHtml(ev.who)}</h4>
          <p>${line1}${note ? `<br>${note}` : ""}</p>
        </div>
        <div class="actions">
          <button class="smallbtn" data-act="edit">Düzenle</button>
          <button class="smallbtn" data-act="del">Sil</button>
        </div>
      </div>
    `;

    wrap.querySelector('[data-act="edit"]').addEventListener("click", ()=>{
      loadToForm(ev.id);
      closeModal();
    });

    wrap.querySelector('[data-act="del"]').addEventListener("click", ()=>{
      if(confirm("Bu kaydı silmek istiyor musun?")){
        deleteEventById(ev.id);
        showToast("Silindi");
        renderAll();
        openDayModal(iso);
      }
    });

    dayModalBody.appendChild(wrap);
  });

  openModal();
}

/* ===== next 3 days ===== */
function renderNext3(){
  const events = loadEvents()
    .filter(matchesFilterAndSearch)
    .sort((a,b)=> a.date.localeCompare(b.date));

  const today = new Date();
  const days = [0,1,2].map(n=>{
    const d = new Date(today);
    d.setDate(today.getDate()+n);
    return toISODate(d);
  });

  nextList.innerHTML = "";

  let count = 0;
  days.forEach(iso=>{
    const dayEvents = events.filter(e => e.date === iso);
    if(dayEvents.length === 0) return;

    dayEvents.forEach(ev=>{
      count++;
      const card = document.createElement("div");
      card.className = "next-card";
      card.innerHTML = `
        <h4>${iso} — ${escapeHtml(ev.who)}</h4>
        <p>
          <span class="tag ${ev.type}">${ev.type === "host" ? "Bizde" : "Gidiyoruz"}</span>
          ${ev.type === "host"
            ? (ev.menu ? `Menü: ${escapeHtml(ev.menu)}` : "Menü: —")
            : (ev.place ? `Yer: ${escapeHtml(ev.place)}` : "Yer: —")}
        </p>
      `;
      card.addEventListener("click", ()=>{
        selectedISO = iso;
        dateInput.value = iso;
        renderCalendar();
        openDayModal(iso);
      });
      nextList.appendChild(card);
    });
  });

  if(count === 0){
    nextList.innerHTML = `<div class="next-card"><p>Bugün ve sonraki 2 gün için kayıt yok.</p></div>`;
  }
}

/* ===== form helpers ===== */
function clearEditing(resetDate=false){
  eventId.value = "";
  whoInput.value = "";
  menuInput.value = "";
  placeInput.value = "";
  noteInput.value = "";
  if(resetDate) dateInput.value = "";
  typeInput.value = "host";
  applyTypeVisibility();
  btnDelete.disabled = true;
  el("formHint").textContent = "Yeni kayıt ekleyebilirsin.";
}

function loadToForm(id){
  const ev = loadEvents().find(x => x.id === id);
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

/* ===== render all ===== */
function renderAll(){
  renderCalendar();
  renderNext3();
}

/* ===== events wiring ===== */
document.querySelectorAll(".chip").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    filter = btn.dataset.filter;
    document.querySelectorAll(".chip").forEach(b=> b.classList.toggle("active", b.dataset.filter === filter));
    renderAll();
  });
});

searchInput.addEventListener("input", (e)=>{
  search = e.target.value.trim();
  renderAll();
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
  const data = {
    id,
    date,
    type,
    who,
    menu: type === "host" ? menuInput.value.trim() : "",
    place: type === "guest" ? placeInput.value.trim() : "",
    note: noteInput.value.trim()
  };

  upsertEvent(data);
  btnDelete.disabled = false;

  selectedISO = date;
  showToast("Kaydedildi ✅");
  renderAll();
});

btnDelete.addEventListener("click", ()=>{
  const id = eventId.value;
  if(!id) return;
  if(confirm("Bu kaydı silmek istiyor musun?")){
    deleteEventById(id);
    showToast("Silindi");
    clearEditing(false);
    renderAll();
  }
});

btnNew.addEventListener("click", ()=>{
  clearEditing(false);
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
  selectedISO = toISODate(new Date());
  dateInput.value = selectedISO;
  renderAll();
  openDayModal(selectedISO);
});

btnOpenToday.addEventListener("click", ()=>{
  const todayISO = toISODate(new Date());
  selectedISO = todayISO;
  dateInput.value = todayISO;
  renderCalendar();
  openDayModal(todayISO);
});

btnReset.addEventListener("click", ()=>{
  if(confirm("Tüm kayıtlar silinecek. Emin misin?")){
    localStorage.removeItem(LS_KEY);
    clearEditing(true);
    selectedISO = toISODate(new Date());
    viewDate = new Date();
    showToast("Temizlendi");
    renderAll();
  }
});

/* Modal close wiring */
btnCloseModal.addEventListener("click", closeModal);
dayModal.addEventListener("click", (e)=>{
  const t = e.target;
  if(t && t.getAttribute && t.getAttribute("data-close") === "1") closeModal();
});
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape" && !dayModal.classList.contains("hidden")) closeModal();
});

/* ===== init ===== */
(function init(){
  dateInput.value = toISODate(new Date());
  selectedISO = dateInput.value;
  applyTypeVisibility();
  renderAll();
})();
