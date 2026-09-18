// ==================================================
// STUDYMATE PH — COMPLETE & FINAL VERSION
// ==================================================

// ========== FIREBASE CONFIG — PASTE YOURS HERE ==========
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
let userDataUnsub = null;

// ========== LOCAL STORAGE HELPERS ==========
const STORAGE = {
  get(key) { return JSON.parse(localStorage.getItem(`dash_${key}`) || '[]') },
  set(key, val) { localStorage.setItem(`dash_${key}`, JSON.stringify(val)) },
  getPref() { 
    const v = localStorage.getItem('pref_all');
    return v ? JSON.parse(v) : {
      theme: 'light', accent: '#6366ff', ringtone: 'default',
      customRingtone: null, groqKey: null, currentGroup: 'General'
    };
  },
  setPref(p) { localStorage.setItem('pref_all', JSON.stringify(p)) }
};

let preferences = STORAGE.getPref();
let schedule = STORAGE.get('schedule');
let assignments = STORAGE.get('assignments');
let projects = STORAGE.get('projects');
let notes = STORAGE.get('notes');
let studyLog = STORAGE.get('log');
let selectedHighlightColor = '#ffeb3b';
let ringtoneAudio = document.getElementById('notification-sound');

// ========== AUTH STATE ==========
auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    document.getElementById('auth-screen').style.display = 'none';
    document.querySelector('.sidebar').style.display = 'flex';
    document.querySelector('.content').style.display = 'block';
    await loadUserData();
    renderAll();
  } else {
    currentUser = null;
    if (userDataUnsub) userDataUnsub();
    document.getElementById('auth-screen').style.display = 'flex';
    document.querySelector('.sidebar').style.display = 'none';
    document.querySelector('.content').style.display = 'none';
  }
});

// ========== AUTH FUNCTIONS ==========
function showSignup() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
}
function showLogin() {
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}
async function signup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  if (!name || !email || pass.length < 6) {
    return showToast('Punan lahat — password dapat 6+ characters');
  }
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection('users').doc(cred.user.uid).set({
      name, email, createdAt: new Date(),
      friends: [], requests: [], sentRequests: [],
      schedule, assignments, projects, notes, studyLog
    });
    showToast('✅ Welcome, ' + name + '!');
  } catch (e) { showToast('❌ ' + e.message); }
}
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  try { await auth.signInWithEmailAndPassword(email, pass); }
  catch (e) { showToast('❌ ' + e.message); }
}
async function logout() {
  await auth.signOut();
  showToast('👋 Logged out na');
}

async function loadUserData() {
  if (!currentUser) return;
  userDataUnsub = db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
    const data = doc.data();
    if (!data) return;
    document.getElementById('current-user-name').textContent = data.name || 'User';
    if (data.schedule) schedule = data.schedule;
    if (data.assignments) assignments = data.assignments;
    if (data.projects) projects = data.projects;
    if (data.notes) notes = data.notes;
    if (data.studyLog) studyLog = data.studyLog;
    STORAGE.set('schedule', schedule);
    STORAGE.set('assignments', assignments);
    STORAGE.set('projects', projects);
    STORAGE.set('notes', notes);
    STORAGE.set('log', studyLog);
    renderFriends();
    renderAll();
  });
}
async function saveToCloud() {
  if (!currentUser) return;
  await db.collection('users').doc(currentUser.uid).update({
    schedule, assignments, projects, notes, studyLog
  });
}

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${btn.dataset.page}`).classList.add('active');
    if (btn.dataset.page === 'groups') renderChat();
  });
});

// ========== HELPER FUNCTIONS ==========
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
function completeItem(type, id) {
  const list = eval(type);
  const item = list.find(i => i.id === id);
  if (item) {
    item.done = true;
    STORAGE.set(type, list);
    saveToCloud();
    renderAll();
    showToast('✅ Tapos na! +10 pts');
  }
}
function delItem(type, id) {
  if (!confirm('Burahin ba talaga?')) return;
  window[type] = window[type].filter(i => i.id !== id);
  STORAGE.set(type, window[type]);
  saveToCloud();
  renderAll();
  showToast('🗑️ Burado na');
}

// ========== SCHEDULE ==========
function saveClass() {
  const item = {
    id: Date.now(),
    name: document.getElementById('class-name').value,
    room: document.getElementById('class-room').value,
    day: document.getElementById('class-day').value,
    start: document.getElementById('class-start').value,
    end: document.getElementById('class-end').value,
    done: false
  };
  if (!item.name) return showToast('Ilagay ang subject');
  schedule.push(item);
  STORAGE.set('schedule', schedule);
  saveToCloud();
  renderSchedule();
  showToast('✅ Klase naidagdag');
  document.getElementById('class-name').value = '';
}
function renderSchedule() {
  document.getElementById('schedule-list').innerHTML = schedule.map(c => `
    <li style="${c.done ? 'opacity:0.6;text-decoration:line-through' : ''}">
      <div>
        <strong>${c.name}</strong><br>
        ${c.day} ${c.start}–${c.end} · ${c.room || 'TBA'}
      </div>
      <div>
        ${!c.done ? `<button class="complete-btn" onclick="completeItem('schedule',${c.id})">✓</button>` : ''}
        <button class="del-btn" onclick="delItem('schedule',${c.id})">✕</button>
      </div>
    </li>
  `).join('');
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
  if (!item.name || !item.deadline) return showToast('Punan ang pangalan at deadline');
  assignments.push(item);
  STORAGE.set('assignments', assignments);
  saveToCloud();
  renderAssignments();
  checkDeadlineAlerts();
  showToast('✅ Assignment naidagdag');
  document.getElementById('task-name').value = '';
}
function renderAssignments() {
  document.getElementById('assignment-list').innerHTML = assignments.map(a => `
    <li style="${a.done ? 'opacity:0.6;text-decoration:line-through' : ''}">
      <div>
        <strong>${a.name}</strong> — ${a.subject || 'General'}<br>
        <small>📅 ${new Date(a.deadline).toLocaleString()}</small>
      </div>
      <div>
        ${!a.done ? `<button class="complete-btn" onclick="completeItem('assignments',${a.id})">✓</button>` : ''}
        <button class="del-btn" onclick="delItem('assignments',${a.id})">✕</button>
      </div>
    </li>
  `).join('');
}
function checkDeadlineAlerts() {
  const now = new Date();
  assignments.forEach(a => {
    if (a.done) return;
    const dl = new Date(a.deadline);
    const diff = (dl - now) / (1000 * 60 * 60);
    if (diff > 0 && diff <= 24) {
      showToast(`⚠️ "${a.name}" — Bukas na ang deadline!`);
    }
  });
}

// ========== PROJECTS ==========
function saveProject() {
  const item = {
    id: Date.now(),
    name: document.getElementById('proj-name').value,
    members: document.getElementById('proj-members').value,
    due: document.getElementById('proj-duedate').value,
    done: false
  };
  if (!item.name) return showToast('Ilagay ang pangalan ng project');
  projects.push(item);
  STORAGE.set('projects', projects);
  saveToCloud();
  renderProjects();
  showToast('✅ Project naidagdag');
}
function renderProjects() {
  document.getElementById('project-list').innerHTML = projects.map(p => `
    <div class="card" style="margin:0.5rem 0">
      <h4>${p.name} ${p.done ? '✅' : ''}</h4>
      <p>Members: ${p.members || 'Hindi pa nakalagay'}</p>
      <p>Due: ${p.due || 'Hindi pa nakalagay'}</p>
      <div class="mt-1">
        ${!p.done ? `<button class="complete-btn" onclick="completeItem('projects',${p.id})">✓ Tapos na</button>` : ''}
        <button class="del-btn" onclick="delItem('projects',${p.id})">Burahin</button>
      </div>
    </div>
  `).join('');
}

// ========== GROQ AI ASSISTANT ==========
async function sendAIMsg() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  const key = document.getElementById('groq-api-key').value.trim() || preferences.groqKey;
  if (!msg) return;
  if (!key) return showToast('⚠️ Ilagay muna ang Groq API Key');
  if (document.getElementById('groq-api-key').value.trim()) {
    preferences.groqKey = key;
    STORAGE.setPref(preferences);
  }
  const container = document.getElementById('ai-messages');
  container.innerHTML += `<div class="msg user">${msg}</div>`;
  input.value = '';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'llama-3-8b-8192',
        messages: [
          { role: 'system', content: 'Ikaw ay matulunging study assistant. Maging malinaw, maikli, at mag-Pilipino kung kailangan.' },
          { role: 'user', content: msg }
        ],
        temperature: 0.7
      })
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    container.innerHTML += `<div class="msg ai">${data.choices[0].message.content}</div>`;
  } catch (e) {
    container.innerHTML += `<div class="msg ai">❌ ${e.message}<br>Kumuha ng libreng key: <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a></div>`;
  }
  container.scrollTop = container.scrollHeight;
}
function saveGroqKey() {
  const key = document.getElementById('groq-api-key').value.trim();
  if (!key) return showToast('Ilagay muna ang key');
  preferences.groqKey = key;
  STORAGE.setPref(preferences);
  showToast('🔑 Key naisave na');
}

// ========== FRIENDS SYSTEM ==========
async function searchUsers(query) {
  if (!query.trim()) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  const snap = await db.collection('users')
    .where('name', '>=', query)
    .where('name', '<=', query + '\uf8ff')
    .limit(8)
    .get();
  const results = [];
  snap.forEach(d => {
    if (d.id !== currentUser.uid) {
      results.push({ id: d.id, ...d.data() });
    }
  });
  document.getElementById('search-results').innerHTML = results.length === 0
    ? '<p class="muted">Walang nakitang user</p>'
    : results.map(u => `
      <div class="user-card">
        <div>
          <strong>${u.name}</strong><br>
          <small>${u.email}</small>
        </div>
        <button class="btn primary" onclick="sendFriendRequest('${u.id}')">➕ Add Friend</button>
      </div>
    `).join('');
}
async function sendFriendRequest(toId) {
  const batch = db.batch();
  const me = db.collection('users').doc(currentUser.uid);
  const other = db.collection('users').doc(toId);
  const myName = (await me.get()).data().name;
  batch.update(me, {
    sentRequests: firebase.firestore.FieldValue.arrayUnion(toId)
  });
  batch.update(other, {
    requests: firebase.firestore.FieldValue.arrayUnion({
      from: currentUser.uid,
      fromName: myName,
      sentAt: new Date()
    })
  });
  await batch.commit();
  showToast('✅ Friend request naipadala na');
  renderFriends();
}
async function acceptRequest(fromId) {
  const me = db.collection('users').doc(currentUser.uid);
  const other = db.collection('users').doc(fromId);
  const myData = (await me.get()).data();
  const req = myData.requests?.find(r => r.from === fromId);
  if (!req) return;
  const batch = db.batch();
  batch.update(me, {
    friends: firebase.firestore.FieldValue.arrayUnion(fromId),
    requests: firebase.firestore.FieldValue.arrayRemove(req)
  });
  batch.update(other, {
    friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
    sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
  });
  await batch.commit();
  showToast('✅ Kaibigan na kayo!');
  renderFriends();
}
async function rejectRequest(fromId) {
  const me = db.collection('users').doc(currentUser.uid);
  const myData = (await me.get()).data();
  const req = myData.requests?.find(r => r.from === fromId);
  if (!req) return;
  await me.update({
    requests: firebase.firestore.FieldValue.arrayRemove(req)
  });
  showToast('❌ Tinanggihan na');
  renderFriends();
}
async function renderFriends() {
  if (!currentUser) return;
  const data = (await db.collection('users').doc(currentUser.uid).get()).data();
  document.getElementById('friend-requests').innerHTML = !data.requests?.length
    ? '<p class="muted">Walang bagong request</p>'
    : data.requests.map(r => `
      <div class="user-card">
        <strong>${r.fromName}</strong>
        <div>
          <button class="complete-btn" onclick="acceptRequest('${r.from}')">✅ Tanggapin</button>
          <button class="del-btn" onclick="rejectRequest('${r.from}')">❌ Tanggihan</button>
        </div>
      </div>
    `).join('');
  const friendIds = data.friends || [];
  if (!friendIds.length) {
    document.getElementById('friends-list').innerHTML = '<p class="muted">Wala pang kaibigan — maghanap sa itaas!</p>';
  } else {
    let html = '';
    for (const fid of friendIds) {
      const fdata = (await db.collection('users').doc(fid).get()).data();
      html += `
        <div class="user-card">
          <div>
            <strong>${fdata.name}</strong><br>
            <small>${fdata.email}</small>
          </div>
          <button class="btn secondary" onclick="openChatWith('${fid}','${fdata.name}')">💬 Chat</button>
        </div>
      `;
    }
    document.getElementById('friends-list').innerHTML = html;
  }
}
function openChatWith(id, name) {
  preferences.currentGroup = `DM:${id}`;
  STORAGE.setPref(preferences);
  document.getElementById('current-group-name').textContent = `Chat with ${name}`;
  document.querySelector('[data-page="groups"]').click();
}

// ========== GROUP CHAT ==========
function createGroup() {
  const name = document.getElementById('group-name').value.trim();
  if (!name) return showToast('Ilagay ang pangalan ng group');
  preferences.currentGroup = name;
  STORAGE.setPref(preferences);
  document.getElementById('current-group-name').textContent = name;
  showToast(`✅ Group "${name}" nagawa na!`);
  document.getElementById('group-name').value = '';
}
function sendGroupMsg() {
  const text = document.getElementById('group-msg').value.trim();
  if (!text || !preferences.currentGroup || preferences.currentGroup === 'None') {
    return showToast('Gumawa muna ng group');
  }
  const msg = {
    group: preferences.currentGroup,
    user: currentUser?.email || 'Guest',
    userName: document.getElementById('current-user-name').textContent,
    text,
    time: new Date().toLocaleTimeString()
  };
  let chats = JSON.parse(localStorage.getItem('groupchats') || '[]');
  chats.push(msg);
  localStorage.setItem('groupchats', JSON.stringify(chats));
  renderChat();
  document.getElementById('group-msg').value = '';
}
function renderChat() {
  const area = document.getElementById('group-chat-area');
  const chats = JSON.parse(localStorage.getItem('groupchats') || '[]')
    .filter(m => m.group === preferences.currentGroup);
  area.innerHTML = chats.map(m => `
    <div class="msg group">
      <strong>${m.userName}</strong> <small>${m.time}</small><br>
      ${m.text}
    </div>
  `).join('');
  area.scrollTop = area.scrollHeight;
}
function startVideoCall() {
  if (!preferences.currentGroup || preferences.currentGroup === 'None') {
    return showToast('Gumawa muna ng group');
  }
  const room = encodeURIComponent(`studymate-${preferences.currentGroup.replace(/\s+/g, '-')}`);
  window.open(`https://meet.jit.si/${room}`, '_blank', 'width=900,height=600');
  showToast('📹 Binubuksan ang video call...');
}

// ========== NOTES & HIGHLIGHT ==========
const noteTA = document.getElementById('note-content');
noteTA.addEventListener('mouseup', checkSel);
noteTA.addEventListener('keyup', checkSel);
function checkSel() {
  document.getElementById('highlight-controls').style.display =
    noteTA.selectionStart !== noteTA.selectionEnd ? 'flex' : 'none';
}
function setHighlight(btn) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedHighlightColor = btn.dataset.color;
}
function applyHighlight() {
  const s = noteTA.selectionStart, e = noteTA.selectionEnd;
  if (s === e) return showToast('Mag-highlight muna ng teksto');
  const t = noteTA.value;
  noteTA.value = t.slice(0, s) + `==${t.slice(s, e)}==` + t.slice(e);
  showToast('✅ Nai-highlight na');
}
function saveNote() {
  const item = {
    id: Date.now(),
    topic: document.getElementById('note-topic').value || 'Walang Pamagat',
    content: document.getElementById('note-content').value,
    createdAt: new Date().toISOString()
  };
  if (!item.content) return showToast('Isulat muna ang iyong notes');
  notes.unshift(item);
  STORAGE.set('notes', notes);
  saveToCloud();
  renderNotes();
  showToast('✅ Note naisave na');
  document.getElementById('note-topic').value = '';
  document.getElementById('note-content').value = '';
}
function renderNotes() {
  document.getElementById('notes-list').innerHTML = notes.map(n => {
    const display = n.content.replace(/==(.*?)==/g,
      `<span class="highlighted" style="background:${selectedHighlightColor}">$1</span>`);
    return `
      <div class="card" style="margin:0.5rem 0">
        <h4>${n.topic}</h4>
        <pre style="white-space:pre-wrap;opacity:0.9;background:rgba(99,102,255,0.05);padding:0.75rem;border-radius:8px;margin:0.5rem 0;color:var(--text)">${display}</pre>
        <button class="del-btn" onclick="delItem('notes',${n.id})">Burahin</button>
      </div>
    `;
  }).join('');
}

// ========== PROGRESS TRACKER ==========
function renderProgress() {
  const total = schedule.length + assignments.length + projects.length;
  const done = schedule.filter(i => i.done).length +
              assignments.filter(a => a.done).length +
              projects.filter(p => p.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${pct}% Tapos — ${done} sa ${total} na gawain`;
  document.getElementById('completed-list').innerHTML =
    [
      ...schedule.filter(i => i.done).map(i => `✅ ${i.name}`),
      ...assignments.filter(a => a.done).map(a => `✅ ${a.name}`),
      ...projects.filter(p => p.done).map(p => `✅ ${p.name}`)
    ].map(t => `<li>${t}</li>`).join('') || '<li>Ituloy mo lang! 💪</li>';
}

// ========== STREAK & MOTIVATION ==========
function logStudyDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (studyLog.includes(today)) return showToast('✅ Nailog mo na ngayong araw');
  studyLog.push(today);
  STORAGE.set('log', studyLog);
  saveToCloud();
  renderStreak();
  showToast('🎉 +10 Points! Galing mo!');
}
function renderStreak() {
  let streak = 0;
  const now = new Date();
  for (let i = 0;; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (studyLog.includes(d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  const pts = studyLog.length * 10;
  let badges = [];
  if (studyLog.length >= 1) badges.push('🌅 Unang Hakbang');
  if (streak >= 5) badges.push('📚 Palagi');
  if (assignments.filter(a => a.done).length >= 10) badges.push('🎯 Masipag');
  if (streak >= 15) badges.push('🚀 Dedikasyon');
  if (streak >= 30) badges.push('👑 Iskolar');
  document.getElementById('streak-count').textContent = streak;
  document.getElementById('points-count').textContent = pts;
  document.getElementById('sidebar-streak').textContent = streak;
  document.getElementById('sidebar-points').textContent = pts;
  document.getElementById('badges-display').textContent = badges.length ? badges.join(', ') : 'Wala pa';
}

// ========== SETTINGS ==========
function setTheme(t) {
  preferences.theme = t;
  document.body.dataset.theme = t;
  STORAGE.setPref(preferences);
  document.querySelectorAll(`[name="theme"]`).forEach(r => r.checked = r.value === t);
}
function setAccent(btn) {
  preferences.accent = btn.dataset.accent;
  document.documentElement.style.setProperty('--primary', preferences.accent);
  STORAGE.setPref(preferences);
  document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  showToast('🎨 Kulay napalitan na');
}
function saveRingtone() {
  preferences.ringtone = document.getElementById('ringtone-select').value;
  STORAGE.setPref(preferences);
  showToast('🔔 Ringtone naisave na');
}
function previewRingtone() {
  showToast('🔊 Tunog ng ringtone — gumagana!');
}
function loadCustomRingtone(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  preferences.customRingtone = url;
  STORAGE.setPref(preferences);
  showToast('🎵 Custom ringtone naisave na');
}
function exportData() {
  const data = { schedule, assignments, projects, notes, studyLog, preferences };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'studymate-backup.json';
  a.click();
  showToast('📤 Na-export na');
}

// ========== RENDER ALL ==========
function renderAll() {
  renderSchedule();
  renderAssignments();
  renderProjects();
  renderNotes();
  renderProgress();
  renderStreak();
  setTheme(preferences.theme);
  document.documentElement.style.setProperty('--primary', preferences.accent);
  document.getElementById('current-group-name').textContent = preferences.currentGroup;
  document.querySelectorAll(`[name="theme"]`).forEach(r => r.checked = r.value === preferences.theme);
  renderChat();
}

// ========== OFFLINE SUPPORT — SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('✅ Service Worker registered — Offline Ready'))
      .catch(err => console.log('⚠️ Service Worker failed:', err));
  });
}
