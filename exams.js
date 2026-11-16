// ===== BGPI Exams Page =====
// attachments.js ke AGE load korte hobe (exams.html e kora ache)

const SUPABASE_URL = 'https://xojkjgvlmlclsazpelkx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qPQaxDnXEiKJEhQnn20-Xg_JzlNzHPi';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'exam-files';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

const TYPES = {
  class_test: 'Weekly Class Test',
  job_file: 'Job File Submission',
  mid_term: 'Mid-Term Exam'
};

const TYPE_ICON = {
  class_test: '📝',
  job_file: '📁',
  mid_term: '🎓'
};

let allExams = [];
let isAdmin = false;
let activeFilter = 'all';
let showPast = false;

// Form er attachment state
let formFiles = [];      // already uploaded (edit korar shomoy)
let pendingRemove = [];  // save korle storage theke muchbe

const $ = id => document.getElementById(id);

// ---------- Date helpers (local time, safe for Bangladesh) ----------

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayStr() {
  return toDateStr(new Date());
}

function daysFromToday(dateStr) {
  const diff = parseDate(dateStr) - parseDate(todayStr());
  return Math.round(diff / 86400000);
}

function shiftDate(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function fmtDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ap}`;
}

function countdownText(days) {
  if (days < 0) return 'Finished';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Storage key e shudhu safe character
function safeName(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'file';
}

// ---------- Load data ----------

async function loadExams() {
  const { data, error } = await supabaseClient
    .from('exams')
    .select('*')
    .order('exam_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.log(error.message);
    $('next-title').textContent = 'Could not load data';
    return;
  }

  allExams = data;
  render();
}

// ---------- Build one card ----------

function buildCard(item) {
  const days = daysFromToday(item.exam_date);
  const scheduled = item.show_from > todayStr();

  const card = el('div', 'exam-card type-' + item.type);
  if (days < 0) card.classList.add('past');
  else if (days <= 1) card.classList.add('urgent');
  else if (days <= 3) card.classList.add('soon');
  if (scheduled) card.classList.add('scheduled');

  // date box
  const d = parseDate(item.exam_date);
  const box = el('div', 'exam-date-box');
  box.append(
    el('strong', '', pad(d.getDate())),
    el('span', '', d.toLocaleDateString('en-GB', { month: 'short' })),
    el('small', '', d.toLocaleDateString('en-GB', { weekday: 'short' }))
  );

  // body
  const body = el('div', 'exam-body');
  body.appendChild(el('h3', '', item.title));

  if (item.subject_code) {
    body.appendChild(el('span', 'exam-code', 'Code: ' + item.subject_code));
  }

  const meta = el('div', 'exam-meta');
  if (item.start_time) {
    const range = item.end_time
      ? `${fmtTime(item.start_time)} – ${fmtTime(item.end_time)}`
      : fmtTime(item.start_time);
    meta.appendChild(el('span', '', '🕐 ' + range));
  }
  if (item.room) meta.appendChild(el('span', '', '📍 ' + item.room));
  if (meta.children.length) body.appendChild(meta);

  if (item.details) body.appendChild(el('p', 'exam-details', item.details));

  // PDF / image icons (click korle download hoy)
  const files = buildAttachments(item.attachments);
  if (files) body.appendChild(files);

  const foot = el('div', 'exam-foot');
  foot.appendChild(el('span', 'exam-pill', countdownText(days)));
  if (scheduled) {
    foot.appendChild(el('span', 'exam-pill hidden-pill', '🔒 Hidden until ' + fmtDate(item.show_from)));
  }
  body.appendChild(foot);

  card.append(box, body);

  if (isAdmin) {
    card.classList.add('editable');
    card.addEventListener('click', e => {
      if (e.target.closest('.file-tile')) return; // icon click = download only
      fillForm(item);
    });
  }

  return card;
}

// ---------- Render everything ----------

function render() {
  const today = todayStr();

  // Summary uses only what students can see
  const upcomingPublic = allExams.filter(
    x => daysFromToday(x.exam_date) >= 0 && x.show_from <= today
  );

  Object.keys(TYPES).forEach(type => {
    $('stat-' + type).textContent =
      upcomingPublic.filter(x => x.type === type).length;
  });

  const next = upcomingPublic[0];
  const nextTitle = $('next-title');
  const nextMeta = $('next-meta');
  const nextPill = $('next-pill');

  if (next) {
    nextTitle.textContent = next.title;
    const time = next.start_time ? ' · ' + fmtTime(next.start_time) : '';
    nextMeta.textContent = `${TYPE_ICON[next.type]} ${TYPES[next.type]} · ${fmtDate(next.exam_date)}${time}`;
    nextPill.textContent = countdownText(daysFromToday(next.exam_date));
    nextPill.style.display = 'inline-block';
  } else {
    nextTitle.textContent = 'All clear 🎉';
    nextMeta.textContent = 'No upcoming exams or deadlines right now.';
    nextPill.style.display = 'none';
  }

  // Sections
  const visible = allExams.filter(x => showPast || daysFromToday(x.exam_date) >= 0);

  Object.keys(TYPES).forEach(type => {
    const section = $('section-' + type);
    const list = $('list-' + type);

    section.style.display = (activeFilter === 'all' || activeFilter === type) ? '' : 'none';
    list.innerHTML = '';

    const items = visible.filter(x => x.type === type);

    if (items.length === 0) {
      list.appendChild(el('div', 'exam-empty', 'Nothing scheduled right now 🎉'));
    } else {
      items.forEach(item => list.appendChild(buildCard(item)));
    }
  });
}

// ---------- Filters ----------

$('exam-tabs').addEventListener('click', e => {
  const btn = e.target.closest('.exam-tab');
  if (!btn) return;

  document.querySelectorAll('.exam-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  render();
});

$('show-past').addEventListener('change', e => {
  showPast = e.target.checked;
  render();
});

// ---------- Admin ----------

const loginBtn = $('admin-login-btn');
const logoutBtn = $('admin-logout-btn');
const examForm = $('exam-form');

async function updateAdminUI() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  isAdmin = !!session;

  examForm.style.display = isAdmin ? 'block' : 'none';
  logoutBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  loginBtn.style.display = isAdmin ? 'none' : 'inline-flex';

  // Admin ke hidden (scheduled) item o dekhte hobe, tai abar load
  loadExams();
}

loginBtn.addEventListener('click', async () => {
  const email = prompt('Admin email:');
  const password = prompt('Password:');
  if (!email || !password) return;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) alert('Login failed: ' + error.message);
  updateAdminUI();
});

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  clearForm();
  updateAdminUI();
});

// ----- Form er attachment list (edit korar shomoy) -----

function renderFormFiles() {
  const box = $('e-file-list');
  box.innerHTML = '';

  formFiles.forEach((att, index) => {
    const row = el('div', 'ex-file-item');

    const label = el('span', '', (att.type === 'application/pdf' ? '📄 ' : '🖼 ') + att.name);
    const size = humanSize(att.size);
    if (size) label.appendChild(el('small', '', size));

    const remove = el('button', '', '✕');
    remove.type = 'button';
    remove.title = 'Remove this file';
    remove.addEventListener('click', () => {
      pendingRemove.push(att.path);
      formFiles.splice(index, 1);
      renderFormFiles();
    });

    row.append(label, remove);
    box.appendChild(row);
  });
}

function fillForm(item) {
  $('e-id').value = item.id;
  $('e-type').value = item.type;
  $('e-title').value = item.title;
  $('e-code').value = item.subject_code || '';
  $('e-date').value = item.exam_date;
  $('e-start').value = (item.start_time || '').slice(0, 5);
  $('e-end').value = (item.end_time || '').slice(0, 5);
  $('e-room').value = item.room || '';
  $('e-details').value = item.details || '';

  const diff = Math.round((parseDate(item.exam_date) - parseDate(item.show_from)) / 86400000);
  $('e-visible').value = ['14', '7', '3', '1'].includes(String(diff)) ? String(diff) : 'now';

  formFiles = Array.isArray(item.attachments) ? [...item.attachments] : [];
  pendingRemove = [];
  $('e-files').value = '';
  renderFormFiles();

  $('e-save').textContent = '💾 Update';
  $('exam-admin-section').scrollIntoView({ behavior: 'smooth' });
}

function clearForm() {
  ['e-id', 'e-title', 'e-code', 'e-date', 'e-start', 'e-end', 'e-room', 'e-details']
    .forEach(id => { $(id).value = ''; });
  $('e-type').value = 'class_test';
  $('e-visible').value = 'now';
  $('e-files').value = '';
  formFiles = [];
  pendingRemove = [];
  renderFormFiles();
  $('e-save').textContent = '💾 Save';
}

$('e-clear').addEventListener('click', clearForm);

// ----- Save (insert / update + file upload) -----

$('e-save').addEventListener('click', async () => {
  const saveBtn = $('e-save');
  const id = $('e-id').value;
  const type = $('e-type').value;
  const title = $('e-title').value.trim();
  const exam_date = $('e-date').value;
  const visible = $('e-visible').value;

  if (!title || !exam_date) return alert('Title and date are required.');

  // File check
  const files = [...$('e-files').files];
  for (const f of files) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return alert(`"${f.name}" is not allowed. Only PDF, PNG, JPG or WEBP.`);
    }
    if (f.size > MAX_FILE_SIZE) {
      return alert(`"${f.name}" is too large. Max 10 MB per file.`);
    }
  }

  const show_from = visible === 'now'
    ? todayStr()
    : shiftDate(exam_date, -Number(visible));

  const originalLabel = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = files.length ? 'Uploading...' : 'Saving...';

  const uploaded = [];

  try {
    // 1) Upload notun file
    for (const f of files) {
      const path = `${crypto.randomUUID()}/${safeName(f.name)}`;
      const { error } = await supabaseClient.storage
        .from(BUCKET)
        .upload(path, f, { contentType: f.type, upsert: false });

      if (error) throw new Error(`Upload failed for "${f.name}": ${error.message}`);
      uploaded.push({ name: f.name, path, type: f.type, size: f.size });
    }

    // 2) Database e save
    const row = {
      type,
      title,
      subject_code: $('e-code').value.trim() || null,
      exam_date,
      start_time: $('e-start').value || null,
      end_time: $('e-end').value || null,
      room: $('e-room').value.trim() || null,
      details: $('e-details').value.trim() || null,
      show_from,
      attachments: [...formFiles, ...uploaded]
    };

    const query = id
      ? supabaseClient.from('exams').update(row).eq('id', id)
      : supabaseClient.from('exams').insert(row);

    const { error } = await query;
    if (error) throw new Error(error.message);

    // 3) Admin je file ✕ diyeche, storage theke muche felo
    if (pendingRemove.length) {
      await supabaseClient.storage.from(BUCKET).remove(pendingRemove);
    }

    clearForm();
    loadExams();
  } catch (err) {
    // Save fail hole upload kora file gulo muche dao
    if (uploaded.length) {
      await supabaseClient.storage.from(BUCKET).remove(uploaded.map(u => u.path));
    }
    alert('Save failed: ' + err.message);
    saveBtn.textContent = originalLabel;
  } finally {
    saveBtn.disabled = false;
  }
});

// ----- Delete -----

$('e-delete').addEventListener('click', async () => {
  const id = $('e-id').value;
  if (!id) return alert('Click a card first to choose what to delete.');
  if (!confirm('Delete this item (and its files)?')) return;

  const item = allExams.find(x => x.id === id);

  const { error } = await supabaseClient.from('exams').delete().eq('id', id);
  if (error) return alert('Delete failed: ' + error.message);

  // Oi item er file gulo o storage theke muche dao
  const paths = [
    ...(item && Array.isArray(item.attachments) ? item.attachments.map(a => a.path) : []),
    ...pendingRemove
  ];
  if (paths.length) {
    await supabaseClient.storage.from(BUCKET).remove(paths);
  }

  clearForm();
  loadExams();
});

// ---------- Dark / Light mode (same as home page) ----------

const themeToggle = $('theme-toggle');

if (localStorage.getItem('website-theme') === 'light') {
  document.body.classList.add('light-theme');
}

function updateThemeButton() {
  themeToggle.textContent = document.body.classList.contains('light-theme')
    ? '🌙 Dark Mode'
    : '☀️ Light Mode';
}

updateThemeButton();

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  localStorage.setItem(
    'website-theme',
    document.body.classList.contains('light-theme') ? 'light' : 'dark'
  );
  updateThemeButton();
});

// ---------- Start ----------

updateAdminUI();