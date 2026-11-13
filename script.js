
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
const SUPABASE_URL = 'https://xojkjgvlmlclsazpelkx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qPQaxDnXEiKJEhQnn20-Xg_JzlNzHPi';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// test supabase connection
async function testConnection() {
  const { data, error } = await supabaseClient.from('tasks').select('*');
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Connected! Tasks:', data);
  }
}
testConnection();