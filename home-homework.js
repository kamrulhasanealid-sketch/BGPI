// ===== Home page: "Homework Due Soon" (next 5 days) =====
// index.html e script.js er PORE load korte hobe.

(function () {

    const section = document.getElementById('upcoming-homework');
    if (!section) return;

    // script.js er supabaseClient thakle seta use kore, na thakle notun client banay
    const sb = (typeof supabaseClient !== 'undefined')
        ? supabaseClient
        : window.supabase.createClient(
            'https://xojkjgvlmlclsazpelkx.supabase.co',
            'sb_publishable_qPQaxDnXEiKJEhQnn20-Xg_JzlNzHPi'
        );

    const KIND = { daily: 'Daily Sessional', job: 'Job Homework' };
    const WINDOW_DAYS = 5;

    // ===== Card background picture =====
    // Image gulo repo te "images" folder e rakhun.
    // daily = Daily Sessional Homework card, job = Job Homework card
    // Photo na chaile "" likhe din (tahole simple card thakbe)
    const CATEGORY_IMAGES = {
        daily: "image/note.webp",
        job: "image/job.jpg"
    };

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function toDateStr(d) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function parseDate(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function daysLeft(str) {
        const t = new Date();
        const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
        return Math.round((parseDate(str) - today) / 86400000);
    }

    function dueText(n) {
        if (n === 0) return { text: 'Due today', cls: 'today' };
        if (n === 1) return { text: 'Due tomorrow', cls: 'soon' };
        return { text: `${n} days left`, cls: 'soon' };
    }

    async function loadDueSoon() {
        const today = new Date();
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + WINDOW_DAYS);

        const { data, error } = await sb
            .from('homework')
            .select('id, category, subject, serial, title, due_date')
            .gte('due_date', toDateStr(today))
            .lte('due_date', toDateStr(end))
            .order('due_date', { ascending: true })
            .order('serial', { ascending: true });

        if (error) {
            console.log(error.message);
            return;
        }

        if (!data || data.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.innerHTML = '';

        const heading = document.createElement('div');
        heading.className = 'section-heading';
        heading.innerHTML = `
            <div>
                <span class="eyebrow">DON'T MISS</span>
                <h2>Homework <span class="gradient-text">Due Soon.</span></h2>
            </div>
            <span class="live-badge"></span>
        `;
        heading.querySelector('.live-badge').textContent = `● ${data.length} PENDING`;
        section.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'hw-soon-grid';

        data.forEach((item) => {
            const a = document.createElement('a');
            a.className = 'hw-soon-card glass-card';
            a.href = 'homework.html#' + (item.category === 'job' ? 'job' : 'daily');

            const bg = CATEGORY_IMAGES[item.category === 'job' ? 'job' : 'daily'];
            if (bg) {
                a.classList.add('has-bg');
                a.style.setProperty('--hw-bg', 'url("' + bg + '")');
            }

            const kind = document.createElement('span');
            kind.className = 'hw-kind';
            kind.textContent = `${item.subject || 'General'} · ${KIND[item.category] || 'Homework'} #${pad(item.serial)}`;

            const title = document.createElement('h3');
            title.textContent = item.title;

            const meta = document.createElement('div');
            meta.className = 'hw-soon-meta';

            const date = document.createElement('span');
            date.textContent = '📅 ' + parseDate(item.due_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
            });

            const info = dueText(daysLeft(item.due_date));
            const chip = document.createElement('span');
            chip.className = 'hw-chip hw-chip-' + info.cls;
            chip.textContent = info.text;

            meta.append(date, chip);
            a.append(kind, title, meta);
            grid.appendChild(a);
        });

        section.appendChild(grid);
        section.style.display = 'block';
    }

    loadDueSoon();

})();