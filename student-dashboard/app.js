// ========== DATA STORAGE ==========
const STORAGE = {
  get(key) { return JSON.parse(localStorage.getItem(`dash_${key}`) || '[]') },
  set(key, val) { localStorage.setItem(`dash_${key}`, JSON.stringify(val)) },
  getPref(key, def) { return JSON.parse(localStorage.getItem(`pref_${key}`)) ?? def },
  setPref(key, val) { localStorage.setItem(`pref_${key}`, JSON.stringify(val)) }
};

// ========== STATE ==========
let schedule = STORAGE.get('schedule');
let assignments = STORAGE.get('assignments');
let projects = STORAGE.get('projects');
let notes = STORAGE.get('notes');
let chatMessages = STORAGE.get('chat');
let studyLog = STORAGE.get('log');
let preferences = STORAGE.getPrefs ? STORAGE.getPrefs('all', { theme:'light', accent:'#6366ff', ringtone:'default' }) : { theme:'light', accent:'#6366ff', ringtone:'default' };
let selectedHighlightColor = '#ffeb3b';

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${btn.dataset.page}`).classList.add('active');
  });
});

// ========== SCHEDULE ==========
function saveClass() {
  const item = {
    id: Date.now(),
    name: document.getElementById('class-name').value,
    room: document.getElementById('class-room').value,
    day: document.getElementById('class-day').value,
    start: document.getElementById('class-start').value,
    end: document.getElementById('class-end').value
  };
  if(!item.name) return showToast('Enter subject name');
  schedule.push(item);
  STORAGE.set('schedule', schedule);
  renderSchedule();
  markStudyActivity();
  showToast('Class added ✅');
  document.getElementById('class-name').value='';
}
function renderSchedule() {
  const list = document.getElementById('schedule-list');
  list.innerHTML = schedule.map(c => `
    <li>
      <div><strong>${c.name}</strong><br>${c.day} ${c.start}–${c.end} · ${c.room||'TBA'}</div>
      <button class="del-btn" onclick="delItem('schedule',${c.id})">✕</button>
    </li>`).join('');
}

// ========== ASSIGNMENTS ==========
function saveAssignment() {
  const item = {
    id: Date.now(),
    name: document.getElementById('task-name').value,
    subject: document.getElementById('task-subject').value,
    deadline: document.getElementById('task-deadline').value,
    done: false
  };
  if(!item.name||!item.deadline) return showToast('Fill task & deadline');
  assignments.push(item);
  STORAGE.set('assignments', assignments);
  renderAssignments();
  markStudyActivity();
  showToast('Assignment added ✅');
  checkDeadlineAlerts();
  document.getElementById('task-name').value='';
}
function renderAssignments() {
  const list = document.getElementById('assignment-list');
  list.innerHTML = assignments.map(a => `
    <li style="${a.done?'opacity:0.6;text-decoration:line-through':''}">
      <div>
        <strong>${a.name}</strong> — ${a.subject||'General'}<br>
        <small>📅 ${new Date(a.deadline).toLocaleString()}</small>
      </div>
      <div>
        ${!a.done?`<button class="complete-btn" onclick="completeItem('assignments',${a.id})">✓</button>`:''}
        <button class="del-btn" onclick="delItem('assignments',${a.id})">✕</button>
      </div>
    </li>`).join('');
}

// ========== PROJECTS ==========
function saveProject() {
  const item = {
    id: Date.now(),
    name: document.getElementById('proj-name').value,
    members: document.getElementById('proj-members').value,
    due: document.getElementById('proj-duedate').value,
    tasks: [],
    done: false
  };
  if(!item.name) return showToast('Enter project name');
  projects.push(item);
  STORAGE.set('projects', projects);
  renderProjects();
  markStudyActivity();
  showToast('Project added ✅');
}
function renderProjects() {
  const list = document.getElementById('project-list');
  list.innerHTML = projects.map(p => `
    <div class="card" style="margin:0.5rem 0">
      <h4>${p.name} ${p.done?'✅':''}</h4>
      <p>Members: ${p.members||'Not set'}</p>
      <p>Due: ${p.due||'Not set'}</p>
      <button class="complete-btn" onclick="completeItem('projects',${p.id})">Mark Done</button>
      <button class="del-btn" onclick="delItem('projects',${p.id})">Delete</button>
    </div>`).join('');
}

// ========== NOTES & REVIEWER ==========
function setHighlight(btn) {
  document.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedHighlightColor = btn.dataset.color;
}
function applyHighlight() {
  const ta = document.getElementById('note-content');
  const start = ta.selectionStart, end = ta.selectionEnd;
  if(start===end) return showToast('Select text first');
  const text = ta.value;
  const selected = text.slice(start,end);
  ta.value = text.slice(0,start) + `==${selected}==` + text.slice(end);
  showToast('Marked for reviewer ✏️');
}
function saveNote() {
  const item = {
    id: Date.now(),
    topic: document.getElementById('note-topic').value || 'Untitled',
    content: document.getElementById('note-content').value,
    createdAt: new Date().toISOString()
  };
  if(!item.content) return showToast('Write something first');
  notes.unshift(item);
  STORAGE.set('notes', notes);
  renderNotes();
  markStudyActivity();
  showToast('Note saved 📝');
  document.getElementById('note-topic').value='';
  document.getElementById('note-content').value='';
}
function renderNotes() {
  const list = document.getElementById('notes-list');
  list.innerHTML = notes.map(n => `
    <div class="card" style="margin:0.5rem 0">
      <h4>${n.topic}</h4>
      <pre style="white-space:pre-wrap;opacity:0.8;background:rgba(99,102,255,0.05);padding:0.75rem;border-radius:8px;margin:0.5rem 0">${n.content.replace(/==(.*?)==/g,'<mark style="background:'+selectedHighlightColor+';padding:0 3px;border-radius:3px">$1</mark>')}</pre>
      <button class="del-btn" onclick="delItem('notes',${n.id})">Delete</button>
    </div>`).join('');
}

// ========== AI ASSISTANT ==========
function sendAIMsg() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if(!msg) return;
  const container = document.getElementById('ai-messages');
  container.innerHTML += `<div class="msg user">${msg}</div>`;
  input.value='';
  setTimeout(() => {
    const reply = `🔍 Search result for: "${msg}"\n\n💡 Study Tip: Review this topic within 24h for better memory retention!\n📖 Suggestion: Break this into 3 parts: Understand → Practice → Review.\n🌐 External search: https://google.com/search?q=${encodeURIComponent(msg)}`;
    container.innerHTML += `<div class="msg ai">${reply}</div>`;
    container.scrollTop = container.scrollHeight;
  }, 600);
  container.scrollTop = container.scrollHeight;
}

// ========== STUDY GROUP CHAT ==========
function createGroup() {
  const name = document.getElementById('group-name').value.trim();
  if(!name) return showToast('Enter group name');
  showToast(`Group "${name}" created!`);
  document.getElementById('group-name').value='';
}
function sendGroupMsg() {
  const input = document.getElementById('group-msg');
  const text = input.value.trim();
  if(!text) return;
  const msg = { time: new Date().toLocaleTimeString(), text };
  chatMessages.push(msg);
  STORAGE.set('chat', chatMessages);
  renderChat();
  input.value='';
}
function renderChat() {
  const area = document.getElementById('group-chat-area');
  area.innerHTML = chatMessages.map(m => `<div class="msg group"><small>${m.time}</small><br>${m.text}</div>`).join('');
  area.scrollTop = area.scrollHeight;
}

// ========== PROGRESS TRACKER ==========
function renderProgress() {
  const total = assignments.length + projects.length;
  const completed = assignments.filter(a=>a.done).length + projects.filter(p=>p.done).length;
  const pct = total ? Math.round((completed/total)*100) : 0;
  document.getElementById('progress-fill').style.width = pct+'%';
  document.getElementById('progress-text').textContent = `${pct}% Complete — ${completed} of ${total} items finished`;
  document.getElementById('completed-list').innerHTML =
    [...assignments.filter(a=>a.done).map(a=>`✅ ${a.name}`),
     ...projects.filter(p=>p.done).map(p=>`✅ ${p.name}`)]
    .map(t=>`<li>${t}</li>`).join('') || '<li>No completed tasks yet — keep going! 💪</li>';
}

// ========== STREAK & MOTIVATION ==========
function logStudyDay() {
  const today = new Date().toISOString().slice(0,10);
  if(studyLog.includes(today)) return showToast('Already logged today! ✅');
  studyLog.push(today);
  STORAGE.set('log', studyLog);
  markStudyActivity();
  showToast('Study day logged! +10 points 🎉');
  renderStreak();
}
function renderStreak() {
  let streak=0;
  const now = new Date();
  for(let i=0;;i++){
    const d = new Date(now); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    if(studyLog.includes(key)) streak++; else break;
  }
  const points = studyLog.length * 10;
  let badges = [];
  if(studyLog.length>=1) badges.push('🌅 First Step');
  if(streak>=5) badges.push('📚 Consistent');
  if(assignments.filter(a=>a.done).length>=10) badges.push('🎯 Focus Master');
  if(streak>=15) badges.push('🚀 Dedication');
  if(streak>=30) badges.push('👑 Scholar');
  
  document.getElementById('streak-count').textContent = streak;
  document.getElementById('points-count').textContent = points;
  document.getElementById('sidebar-streak').textContent = streak;
  document.getElementById('sidebar-points').textContent = points;
  document.getElementById('badges-display').textContent = badges.length?badges.join(', '):'None yet';
}

// ========== SETTINGS ==========
function setTheme(t) {
  preferences.theme = t;
  document.body.dataset.theme = t;
  STORAGE.setPref('theme', t);
  document.querySelectorAll(`[name="theme"]`).forEach(r => r.checked = (r.value===t));
}
function setAccent(btn) {
  preferences.accent = btn.dataset.accent;
  document.documentElement.style.setProperty('--primary', btn.dataset.accent);
  STORAGE.setPref('accent', btn.dataset.accent);
  document.querySelectorAll('.accent-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}
function saveRingtone() {
  preferences.ringtone = document.getElementById('ringtone-select').value;
  STORAGE.setPref('ringtone', preferences.ringtone);
  showToast('Ringtone saved 🔔');
}
function previewRingtone() {
  const a = new AudioContext();
  const o = a.createOscillator(); o.connect(a.destination);
  o.frequency.value = 440; o.start(); o.stop(a.currentTime+0.3);
}
function exportData() {
  const payload = { schedule, assignments, projects, notes, studyLog, preferences, chatMessages };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='dashboard-backup.json'; a.click();
}

// ========== HELPERS ==========
function delItem(listName, id) {
  if(!confirm('Delete this item?')) return;
  window[listName] = window[listName].filter(i => i.id !== id);
  STORAGE.set(listName, window[listName]);
  renderAll();
}
function completeItem(listName, id) {
  const item = window[listName].find(i => i.id === id);
  if(item) { item.done = true; STORAGE.set(listName, window[listName]); }
  markStudyActivity();
  renderAll();
  showToast('Marked complete! 🎉 +5 pts');
}
function markStudyActivity() {
  // Award points via streak system
}
function checkDeadlineAlerts() {
  const now = new Date();
  assignments.forEach(a => {
    if(!a.done) {
      const due = new Date(a.deadline);
      const diff = (due-now)/(1000*60*60);
      if(diff>0 && diff<24) showToast(`⏰ Reminder: "${a.name}" due in ${Math.round(diff)}h`);
    }
  });
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}
function renderAll() {
  renderSchedule(); renderAssignments(); renderProjects(); renderNotes(); renderChat(); renderProgress(); renderStreak();
}
function loadPrefs() {
  if(preferences.theme) {
    document.body.dataset.theme = preferences.theme;
    document.querySelector(`[name="theme"][value="${preferences.theme}"]`).checked = true;
  }
  if(preferences.accent) {
    document.documentElement.style.setProperty('--primary', preferences.accent);
    document.querySelectorAll('.accent-btn').forEach(b=>{
      if(b.dataset.accent===preferences.accent) b.classList.add('selected');
    });
  }
  if(preferences.ringtone) document.getElementById('ringtone-select').value = preferences.ringtone;
}

// ========== SERVICE WORKER FOR OFFLINE ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('✅ Offline Ready — Service Worker registered', reg.scope))
      .catch(err => console.log('⚠️ SW registration failed:', err));
  });
}

// ========== INITIALIZE ==========
loadPrefs();
renderAll();
setInterval(checkDeadlineAlerts, 60*60*1000); // Check every hour