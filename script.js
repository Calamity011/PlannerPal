"use strict";


const KEY = "studymate_calendar_notes";

let data = {
  tasks: [],
  sessions: [],
  notes: []
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_HOUR = 6;
const END_HOUR = 22;
const ROW_HEIGHT = 52;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let calendarCursor = new Date();

function id() {
  return Date.now().toString() + Math.random().toString(16).slice(2);
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { alert("Could not save data in this browser."); }
}

function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) data = { ...data, ...JSON.parse(s) };
  } catch (e) { console.error("Loading error:", e); }
}

function safe(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function time(s) {
  if (!s) return "";
  const [h, m] = s.split(":");
  const d = new Date();
  d.setHours(+h, +m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function prettyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":");
  return (+h) * 60 + (+m);
}

function formatHour(h) {
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return String(hh).padStart(2, "0") + ":00 " + suffix;
}


(function setToday() {
  const el = document.getElementById("todayDate");
  if (el) {
    el.textContent = new Date().toLocaleDateString([], {
      weekday: "short", month: "short", day: "numeric"
    });
  }
})();


document.getElementById("taskForm").addEventListener("submit", e => {
  e.preventDefault();

  const name = document.getElementById("taskInput").value.trim();
  const subject = document.getElementById("taskSubject").value.trim();
  const due = document.getElementById("taskDue").value;
  const priority = document.getElementById("taskPriority").value;

  if (!name || !subject || !due) return;

  data.tasks.push({
    id: id(),
    name,
    subject,
    due,
    priority,
    done: false
  });

  e.target.reset();
  document.getElementById("taskPriority").value = "Normal";

  save();
  renderTasks();
  renderUpcoming();
  renderCalendar();
  stats();
});

function renderTasks() {
  const list = document.getElementById("taskList");
  const searchEl = document.getElementById("taskSearch");
  const filterEl = document.getElementById("taskFilter");
  const countEl = document.getElementById("taskCount");

  const search = searchEl ? searchEl.value.toLowerCase().trim() : "";
  const filter = filterEl ? filterEl.value : "all";

  const filtered = data.tasks.filter(t => {
    const matchSearch =
      t.name.toLowerCase().includes(search) ||
      (t.subject || "").toLowerCase().includes(search);
    if (!matchSearch) return false;
    if (filter === "pending") return !t.done;
    if (filter === "completed") return t.done;
    return true;
  });

  list.innerHTML = "";

  if (!filtered.length) {
    list.innerHTML =
      '<p class="muted" style="text-align:center;padding:20px;">No matching tasks. Try adding a task or changing the filter.</p>';
  } else {
    filtered.sort((a, b) =>
      (a.done - b.done) || (a.due || "").localeCompare(b.due || "")
    );

    filtered.forEach(t => {
      const row = document.createElement("div");
      row.className = "task" + (t.done ? " done" : "");
      row.innerHTML =
        '<input type="checkbox" ' + (t.done ? "checked" : "") + ">" +
        "<label></label>" +
        '<button class="del" type="button">Delete</button>';

      const lbl = row.querySelector("label");
      lbl.textContent = t.name;
      const meta = document.createElement("small");
      meta.textContent = `${t.subject} · ${prettyDate(t.due)} · ${t.priority}`;
      lbl.appendChild(meta);

      row.querySelector("input").addEventListener("change", e => {
        t.done = e.target.checked;
        save();
        renderTasks();
        renderUpcoming();
        renderCalendar();
        stats();
      });

      row.querySelector(".del").addEventListener("click", () => {
        if (!confirm("Delete this task?")) return;
        data.tasks = data.tasks.filter(x => x.id !== t.id);
        save();
        renderTasks();
        renderUpcoming();
        renderCalendar();
        stats();
      });

      list.appendChild(row);
    });
  }

  if (countEl) {
    countEl.textContent =
      data.tasks.length + (data.tasks.length === 1 ? " task" : " tasks");
  }
}

document.getElementById("taskSearch").addEventListener("input", renderTasks);
document.getElementById("taskFilter").addEventListener("change", renderTasks);


function renderUpcoming() {
  const box = document.getElementById("upcomingList");
  const pending = data.tasks
    .filter(t => !t.done && t.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);

  if (!pending.length) {
    box.innerHTML =
      '<p class="muted" style="margin:0;">No pending tasks. Add a task in My Tasks to see it here.</p>';
    return;
  }

  box.innerHTML =
    "<ul>" +
    pending.map(t => `
      <li>
        <span><strong>${safe(t.name)}</strong> · ${safe(t.subject)}</span>
        <span class="chip">${prettyDate(t.due)}</span>
      </li>
    `).join("") +
    "</ul>";
}


document.getElementById("sessionForm").addEventListener("submit", e => {
  e.preventDefault();

  const name = document.getElementById("sessionName").value.trim();
  const day = document.getElementById("sessionDay").value;
  const start = document.getElementById("sessionStart").value;
  const end = document.getElementById("sessionEnd").value;
  const color = document.getElementById("sessionColor").value;

  if (!name || !start || !end) {
    alert("Please enter a subject and both times.");
    return;
  }
  if (end <= start) {
    alert("End time must be later than start time.");
    return;
  }

  data.sessions.push({
    id: id(),
    name, day, start, end, color
  });

  e.target.reset();
  document.getElementById("sessionStart").value = "09:00";
  document.getElementById("sessionEnd").value = "10:00";

  save();
  renderWeekGrid();
});


function renderWeekGrid() {
  const grid = document.getElementById("weekGrid");
  grid.innerHTML = "";

  const totalHours = END_HOUR - START_HOUR;


  grid.appendChild(makeCell("wk-day-name", ""));
  const todayShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
  WEEK_DAYS.forEach(d => {
    const isToday = (d === todayShort);
    grid.appendChild(makeCell("wk-day-name" + (isToday ? " today" : ""), d));
  });


  for (let h = 0; h < totalHours; h++) {
    const hour = START_HOUR + h;
    grid.appendChild(makeCell("wk-time", formatHour(hour)));

    for (let d = 0; d < WEEK_DAYS.length; d++) {
      const slot = document.createElement("div");
      slot.className = "wk-slot";
      grid.appendChild(slot);
    }
  }


  const overlay = document.createElement("div");
  overlay.className = "wk-overlay";
  grid.appendChild(overlay);


  const tracks = [];
  for (let d = 0; d < WEEK_DAYS.length; d++) {
    const track = document.createElement("div");
    track.className = "wk-track";
    track.style.left = (d / WEEK_DAYS.length * 100) + "%";
    track.style.width = (1 / WEEK_DAYS.length * 100) + "%";
    overlay.appendChild(track);
    tracks.push(track);
  }


  data.sessions.forEach(s => {
    const dayIndex = WEEK_DAYS.indexOf(s.day);
    if (dayIndex === -1) return;

    const startMin = toMinutes(s.start);
    const endMin = toMinutes(s.end);
    const dayStartMin = START_HOUR * 60;

    const offsetMin = startMin - dayStartMin;
    const durationMin = Math.max(30, endMin - startMin);

    const topPx = (offsetMin / 60) * ROW_HEIGHT;
    const heightPx = (durationMin / 60) * ROW_HEIGHT - 4;

    const ev = document.createElement("div");
    ev.className = "wk-event " + s.color;
    ev.style.top = topPx + "px";
    ev.style.height = heightPx + "px";
    ev.innerHTML = `
      <span>${safe(s.name)}</span>
      <small>${time(s.start)} – ${time(s.end)}</small>
      <button class="x" type="button" title="Delete">×</button>
    `;

    ev.querySelector(".x").addEventListener("click", e2 => {
      e2.stopPropagation();
      if (!confirm("Delete this session?")) return;
      data.sessions = data.sessions.filter(x => x.id !== s.id);
      save();
      renderWeekGrid();
    });

    tracks[dayIndex].appendChild(ev);
  });
}

function makeCell(cls, text) {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = text;
  return el;
}

function renderCalendar() {
  const grid = document.getElementById("calGrid");
  const title = document.getElementById("calTitle");

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  title.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr =
    today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  let html = "";
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr =
      year + "-" +
      String(month + 1).padStart(2, "0") + "-" +
      String(d).padStart(2, "0");

    const dayTasks = data.tasks.filter(t => t.due === dateStr);
    const hasTask = dayTasks.length > 0;
    const isToday = dateStr === todayStr;

    const cls = ["cal-cell"];
    if (hasTask) cls.push("has-task");
    if (isToday) cls.push("today");

    html += `
      <div class="${cls.join(" ")}" data-date="${dateStr}">
        <span>${d}</span>
        ${hasTask ? `<span class="cal-dot">${dayTasks.length}</span>` : ""}
      </div>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll(".cal-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => {
      const date = cell.dataset.date;
      const dayTasks = data.tasks.filter(t => t.due === date);
      const box = document.getElementById("calDayTasks");

      if (!dayTasks.length) {
        box.innerHTML = `<p class="muted" style="margin:0;">No tasks due on ${date}.</p>`;
        return;
      }

      box.innerHTML = `
        <h3>Tasks due on ${date}</h3>
        <ul>
          ${dayTasks.map(t => `
            <li>${t.done ? "✅" : "📌"} <strong>${safe(t.name)}</strong> · ${safe(t.subject)} · ${t.priority}</li>
          `).join("")}
        </ul>
      `;
    });
  });
}

document.getElementById("prevMonth").addEventListener("click", () => {
  calendarCursor.setMonth(calendarCursor.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  calendarCursor.setMonth(calendarCursor.getMonth() + 1);
  renderCalendar();
});


document.getElementById("noteForm").addEventListener("submit", e => {
  e.preventDefault();

  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteContent").value.trim();
  if (!title || !content) return;

  data.notes.unshift({
    id: id(),
    title,
    content,
    date: new Date().toLocaleDateString()
  });

  e.target.reset();
  save();
  renderNotes();
});

const modal = document.getElementById("noteModal");

function openNote(note) {
  document.getElementById("modalTitle").textContent = note.title;
  document.getElementById("modalDate").textContent = "Saved on " + note.date;
  document.getElementById("modalContent").textContent = note.content;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("closeModal").focus();
}

function closeNote() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.getElementById("closeModal").addEventListener("click", closeNote);
document.getElementById("modalDone").addEventListener("click", closeNote);
modal.querySelector(".backdrop").addEventListener("click", closeNote);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeNote(); });

function renderNotes() {
  const root = document.getElementById("notesList");
  const search = document.getElementById("noteSearch").value.toLowerCase().trim();
  const countLabel = document.getElementById("noteCountLabel");

  const list = data.notes.filter(n =>
    n.title.toLowerCase().includes(search) ||
    n.content.toLowerCase().includes(search)
  );

  root.innerHTML = "";

  if (!list.length) {
    root.innerHTML =
      '<p class="muted" style="text-align:center;padding:20px;">No matching notes. Add a note or change your search.</p>';
  } else {
    list.forEach(n => {
      const card = document.createElement("article");
      card.className = "notecard";
      card.tabIndex = 0;
      card.innerHTML = `
        <h3></h3>
        <p></p>
        <div class="actions">
          <button class="edit" type="button">Edit</button>
          <button class="danger" type="button">Delete</button>
        </div>
      `;
      card.querySelector("h3").textContent = n.title;
      card.querySelector("p").textContent =
        n.content.length > 110 ? n.content.slice(0, 110) + "…" : n.content;

      card.addEventListener("click", e => {
        if (!e.target.closest(".actions")) openNote(n);
      });

      card.querySelector(".edit").addEventListener("click", e => {
        e.stopPropagation();
        document.getElementById("noteTitle").value = n.title;
        document.getElementById("noteContent").value = n.content;
        data.notes = data.notes.filter(x => x.id !== n.id);
        save();
        renderNotes();
        document.getElementById("noteTitle").focus();
      });

      card.querySelector(".danger").addEventListener("click", e => {
        e.stopPropagation();
        if (!confirm("Delete this note?")) return;
        data.notes = data.notes.filter(x => x.id !== n.id);
        save();
        renderNotes();
      });

      root.appendChild(card);
    });
  }

  if (countLabel) {
    countLabel.textContent =
      data.notes.length + (data.notes.length === 1 ? " note" : " notes");
  }
}

document.getElementById("noteSearch").addEventListener("input", renderNotes);


function stats() {
  const total = data.tasks.length;
  const completed = data.tasks.filter(t => t.done).length;
  const pending = total - completed;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("overviewPercent").textContent = pct + "%";

  document.getElementById("progressPercent").textContent = pct + "% completed";
  document.getElementById("progressCompleted").textContent = completed;
  document.getElementById("progressPending").textContent = pending;
  document.getElementById("progressTotal").textContent = total;

  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("donut").style.setProperty("--p", pct);
  document.getElementById("donutText").textContent = pct + "%";

  document.getElementById("progressHint").textContent = total
    ? "Keep going — every completed task counts!"
    : "Add a task to begin tracking your progress.";
}


const navAnchors = document.querySelectorAll(".nav-links a");
function setActiveNav() {
  const scrollY = window.scrollY + 120;
  let currentId = "dashboard";
  document.querySelectorAll("section[id], header[id]").forEach(sec => {
    if (sec.offsetTop <= scrollY) currentId = sec.id;
  });
  navAnchors.forEach(a =>
    a.classList.toggle("active", a.getAttribute("href") === "#" + currentId)
  );
}
window.addEventListener("scroll", setActiveNav);


load();
renderTasks();
renderUpcoming();
renderWeekGrid();
renderCalendar();
renderNotes();
stats();
setActiveNav();