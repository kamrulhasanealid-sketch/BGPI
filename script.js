
// ===== BGPI Student Routine =====

// 1. Get HTML Elements

const todayDay = document.getElementById("today-day");
const currentDate = document.getElementById("current-date");
const countdown = document.getElementById("countdown");
const countdownMessage = document.getElementById("countdown-message");
const classCount = document.getElementById("class-count");
const todayClassList = document.getElementById("today-class-list");

// 2. Class period starting and ending times

const periods = [
    ["08:00", "08:45"],
    ["08:45", "09:30"],
    ["09:30", "10:15"],
    ["10:15", "11:00"],
    ["11:00", "11:45"],
    ["11:45", "12:30"],
    ["12:30", "13:15"]
];

// Convert time into minutes

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
}

// Format countdown

function formatCountdown(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const seconds = 59 - new Date().getSeconds();

    return `${hours}h ${remainingMinutes}m ${seconds}s`;
}

// 3. Get today's classes from HTML table

function getTodayClasses(day) {

    const row = document.querySelector(
        `.routine-table tr[data-day="${day}"]`
    );

    if (!row) return [];

    const cells = [...row.querySelectorAll("td")];

    let periodIndex = 0;
    const classes = [];

    cells.forEach(cell => {

        const span = cell.colSpan;
        const subject = cell.querySelector(".subject-card");

        if (subject) {

            const code = subject.querySelector(".subject-code").textContent;
            const name = subject.querySelector("strong").textContent;
            const room = subject.querySelector("small").textContent;

            const startTime = periods[periodIndex][0];
            const endTime = periods[periodIndex + span - 1][1];

            classes.push({
                code,
                name,
                room,
                startTime,
                endTime,
                start: timeToMinutes(startTime),
                end: timeToMinutes(endTime)
            });
        }

        periodIndex += span;

    });

    return classes;
}

// 4. Show today's classes

function showTodayClasses() {

    const now = new Date();

    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    const today = days[now.getDay()];

    todayDay.textContent = today;

    currentDate.textContent = now.toLocaleDateString(
        "en-GB",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

    // Remove previous highlight

    document.querySelectorAll(".routine-table tr").forEach(row => {
        row.classList.remove("today-highlight");
    });

    // Highlight today's row

    const todayRow = document.querySelector(
        `.routine-table tr[data-day="${today}"]`
    );

    if (todayRow) {
        todayRow.classList.add("today-highlight");
    }

    // Get today's schedule

    const classes = getTodayClasses(today);

    classCount.textContent = String(classes.length).padStart(2, "0");

    todayClassList.innerHTML = "";

    if (classes.length === 0) {

        todayClassList.innerHTML = `
            <div class="no-classes">
                <h3>No Classes Today 🎉</h3>
                <p>Enjoy your day! Take some rest and study.</p>
            </div>
        `;

        countdown.textContent = "Holiday";
        countdownMessage.textContent = "No scheduled classes today.";

        return;
    }

    // Display each class

    classes.forEach(item => {

        const card = document.createElement("div");

        card.className = "today-class-item";

        card.innerHTML = `
            <span class="class-time">
                ${item.startTime} – ${item.endTime}
            </span>

            <h3>${item.code} · ${item.name}</h3>

            <p>📍 ${item.room}</p>
        `;

        todayClassList.appendChild(card);

    });

    // 5. Find next class or current class

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const activeClass = classes.find(item =>
        currentMinutes >= item.start &&
        currentMinutes < item.end
    );

    const nextClass = classes.find(item =>
        item.start > currentMinutes
    );

    if (activeClass) {

        countdown.textContent = "In Progress";

        countdownMessage.textContent =
            `${activeClass.name} is happening now. Ends at ${activeClass.endTime}.`;

        return;
    }

    if (nextClass) {

        const remaining = nextClass.start - currentMinutes;

        countdown.textContent = formatCountdown(remaining);

        countdownMessage.textContent =
            `Next: ${nextClass.name} · ${nextClass.startTime}`;

        return;
    }

    countdown.textContent = "Completed!";

    countdownMessage.textContent =
        "All today's classes are finished. Great job!";

}

// 6. Run every second

showTodayClasses();

setInterval(showTodayClasses, 1000);

// ===== Dark / Light Mode =====

const themeToggle = document.getElementById("theme-toggle");

// Check previously saved theme

const savedTheme = localStorage.getItem("website-theme");

// Apply saved theme

if (savedTheme === "light") {
    document.body.classList.add("light-theme");
}

// Update button text

function updateThemeButton() {

    if (document.body.classList.contains("light-theme")) {
        themeToggle.textContent = "🌙 Dark Mode";
    } else {
        themeToggle.textContent = "☀️ Light Mode";
    }

}

updateThemeButton();

// Toggle theme on click

themeToggle.addEventListener("click", function () {

    document.body.classList.toggle("light-theme");

    const currentTheme = document.body.classList.contains("light-theme")
        ? "light"
        : "dark";

    localStorage.setItem("website-theme", currentTheme);

    updateThemeButton();

});
// const SUPABASE_URL = 'https://xojkjgvlmlclsazpelkx.supabase.co';
// const SUPABASE_KEY = 'sb_publishable_qPQaxDnXEiKJEhQnn20-Xg_JzlNzHPi';

// const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// // test supabase connection
// async function testConnection() {
//   const { data, error } = await supabaseClient.from('tasks').select('*');
//   if (error) {
//     console.log('Error:', error.message);
//   } else {
//     console.log('Connected! Tasks:', data);
//   }
// }
// testConnection();
const SUPABASE_URL = 'https://xojkjgvlmlclsazpelkx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qPQaxDnXEiKJEhQnn20-Xg_JzlNzHPi';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const noticeList = document.getElementById('notice-list');
const adminPanel = document.getElementById('admin-panel');
const loginBtn = document.getElementById('admin-login-btn');
const logoutBtn = document.getElementById('admin-logout-btn');

// Sobai dekhbe
async function loadNotices() {
  const { data, error } = await supabaseClient
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    noticeList.textContent = 'Load korte problem hoyeche.';
    console.log(error.message);
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  noticeList.innerHTML = '';

  if (data.length === 0) {
    noticeList.textContent = 'Ekhono kono notice nai.';
    return;
  }

  data.forEach(item => {
    const div = document.createElement('div');
    const h3 = document.createElement('h3');
    const p = document.createElement('p');
    h3.textContent = item.title;
    p.textContent = item.description || '';
    div.append(h3, p);

    if (session) {
      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.onclick = () => deleteNotice(item.id);
      div.appendChild(del);
    }
    noticeList.appendChild(div);
  });
}

// Admin UI on/off
async function updateAdminUI() {
    document.getElementById('routine-admin').style.display = session ? 'block' : 'none';
loadRoutine();
  const { data: { session } } = await supabaseClient.auth.getSession();
  adminPanel.style.display = session ? 'block' : 'none';
  logoutBtn.style.display = session ? 'inline-block' : 'none';
  loginBtn.style.display = session ? 'none' : 'inline-block';
  loadNotices();
}

// Login
loginBtn.addEventListener('click', async () => {
  const email = prompt('Admin email:');
  const password = prompt('Password:');
  if (!email || !password) return;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) alert('Login hoy nai: ' + error.message);
  updateAdminUI();
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  updateAdminUI();
});

// Notice add
document.getElementById('add-notice-btn').addEventListener('click', async () => {
  const title = document.getElementById('notice-title').value.trim();
  const description = document.getElementById('notice-desc').value.trim();
  if (!title) return alert('Title dao');

  const { error } = await supabaseClient.from('notices').insert({ title, description });
  if (error) return alert('Save hoy nai: ' + error.message);

  document.getElementById('notice-title').value = '';
  document.getElementById('notice-desc').value = '';
  loadNotices();
});

// Delete
async function deleteNotice(id) {
  if (!confirm('Delete korbe?')) return;
  const { error } = await supabaseClient.from('notices').delete().eq('id', id);
  if (error) alert(error.message);
  loadNotices();
}

updateAdminUI();
// new section for notices
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday'];

async function loadRoutine() {
  const { data, error } = await supabaseClient.from('routine').select('*');
  if (error) return console.log(error.message);

  const { data: { session } } = await supabaseClient.auth.getSession();
  const body = document.getElementById('routine-body');
  body.innerHTML = '';

  DAYS.forEach(day => {
    const tr = document.createElement('tr');
    tr.dataset.day = day;

    const th = document.createElement('th');
    th.textContent = day;
    tr.appendChild(th);

    const items = data.filter(r => r.day === day);
    let p = 1;
    while (p <= 7) {
      const item = items.find(r => r.start_period === p);
      const td = document.createElement('td');

      if (item) {
        td.colSpan = item.span;
        td.innerHTML = `
          <div class="subject-card">
            <span class="subject-code"></span>
            <strong></strong>
            <small></small>
            <em class="teacher"></em>
          </div>`;
        td.querySelector('.subject-code').textContent = item.code;
        td.querySelector('strong').textContent = item.name;
        td.querySelector('small').textContent = item.room || '';
        td.querySelector('.teacher').textContent = item.teacher || '';

        if (session) {
          td.style.cursor = 'pointer';
          td.onclick = () => fillForm(item);
        }
        p += item.span;
      } else {
        p += 1;
      }
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
}

// Admin click korle form e data boshe jabe
function fillForm(item) {
  document.getElementById('r-day').value = item.day;
  document.getElementById('r-period').value = item.start_period;
  document.getElementById('r-span').value = item.span;
  document.getElementById('r-code').value = item.code;
  document.getElementById('r-name').value = item.name;
  document.getElementById('r-teacher').value = item.teacher || '';
  document.getElementById('r-room').value = item.room || '';
}

document.getElementById('r-save').addEventListener('click', async () => {
  const row = {
    day: document.getElementById('r-day').value,
    start_period: Number(document.getElementById('r-period').value),
    span: Number(document.getElementById('r-span').value) || 1,
    code: document.getElementById('r-code').value.trim(),
    name: document.getElementById('r-name').value.trim(),
    teacher: document.getElementById('r-teacher').value.trim(),
    room: document.getElementById('r-room').value.trim()
  };
  if (!row.start_period || !row.code || !row.name) return alert('Period, code, name dao');

  const { error } = await supabaseClient
    .from('routine')
    .upsert(row, { onConflict: 'day,start_period' });
  if (error) return alert('Save hoy nai: ' + error.message);
  loadRoutine();
});

document.getElementById('r-delete').addEventListener('click', async () => {
  const day = document.getElementById('r-day').value;
  const start_period = Number(document.getElementById('r-period').value);
  if (!confirm('Ei class delete korbe?')) return;

  const { error } = await supabaseClient
    .from('routine').delete().eq('day', day).eq('start_period', start_period);
  if (error) return alert(error.message);
  loadRoutine();
});

loadRoutine();