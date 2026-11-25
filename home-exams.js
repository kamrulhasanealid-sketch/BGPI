// ===== Home page: "Coming Up Soon" exams (next 2 days) =====
// script.js er pore load korte hobe (supabaseClient oi file theke ashe)

(function () {
  const section = document.getElementById('upcoming-exams');
  if (!section || typeof supabaseClient === 'undefined') return;

  // Koy din age theke dekhabe (0 = ajke, 2 = ajke + agami 2 din)
  const WINDOW_DAYS = 2;

  const TYPES = {
    class_test: { label: 'Class Test', icon: '📝' },
    job_file: { label: 'Job File Submission', icon: '📁' },
    mid_term: { label: 'Mid-Term Exam', icon: '🎓' }
  };
  
  // Card background photo (exams.js er moto-i same path din)
  const TYPE_IMAGES = {
    class_test: 'image/exam.jpg',
    job_file: 'image/job.jpg',
    mid_term: 'image/exam.jpg'
  };

  function pad(n) { return String(n).padStart(2, '0'); }
  function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function todayStr() { return toDateStr(new Date()); }
  function shiftDate(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return toDateStr(d); }
  function daysFromToday(s) { return Math.round((parseDate(s) - parseDate(todayStr())) / 86400000); }

  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  function countdownText(days) {
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

  // Ajker exam jodi already shesh hoye jay, ar dekhabe na
  function alreadyFinished(item) {
    if (daysFromToday(item.exam_date) !== 0) return false;
    const t = item.end_time || item.start_time;
    if (!t) return false;
    const [h, m] = t.split(':').map(Number);
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
  }

  function buildCard(item) {
    const days = daysFromToday(item.exam_date);
    const type = TYPES[item.type] || { label: 'Exam', icon: '📌' };

    const card = el('div', 'exam-card type-' + item.type);
    card.addEventListener('click', e => {
      if (e.target.closest('.file-tile')) return; // icon click = download only
      window.location.href = 'exams.html';
    });
    if (days <= 1) card.classList.add('urgent');
    else card.classList.add('soon');
    
    const bg = TYPE_IMAGES[item.type];
    if (bg) {
      card.classList.add('has-bg');
      card.style.setProperty('--ex-bg', 'url("' + bg + '")');
    }

    const d = parseDate(item.exam_date);
    const box = el('div', 'exam-date-box');
    box.append(
      el('strong', '', pad(d.getDate())),
      el('span', '', d.toLocaleDateString('en-GB', { month: 'short' })),
      el('small', '', d.toLocaleDateString('en-GB', { weekday: 'short' }))
    );

    const body = el('div', 'exam-body');
    body.appendChild(el('span', 'exam-type', type.icon + ' ' + type.label));
    body.appendChild(el('h3', '', item.title));

    if (item.subject_code) body.appendChild(el('span', 'exam-code', 'Code: ' + item.subject_code));

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

    const files = buildAttachments(item.attachments);
    if (files) body.appendChild(files);

    const foot = el('div', 'exam-foot');
    if (item.is_cancelled) {
      card.classList.add('cancelled');
      foot.appendChild(el('span', 'exam-pill cancel-pill', '❌ Cancelled'));
    } else {
      foot.appendChild(el('span', 'exam-pill', countdownText(days)));
    }
    if (item.rescheduled_from) {
      foot.appendChild(el('span', 'exam-pill resched-pill', '🔁 Rescheduled'));
    }
    body.appendChild(foot);

    card.append(box, body);
    return card;
  }

  function render(items) {
    const list = items.filter(x => !alreadyFinished(x));

    if (list.length === 0) {
      section.style.display = 'none';
      section.innerHTML = '';
      return;
    }

    section.innerHTML = `
      <div class="section-heading">
        <div>
          <span class="eyebrow">⚠ HEADS UP</span>
          <h2>Coming <span class="gradient-text">Up Soon.</span></h2>
        </div>
        <a class="live-badge" href="exams.html">View all ↗</a>
      </div>
    `;

    const grid = el('div', 'home-exam-grid');
    list.forEach(item => grid.appendChild(buildCard(item)));
    section.appendChild(grid);
    section.style.display = '';
  }

  async function loadUpcoming() {
    const today = todayStr();
    const last = shiftDate(today, WINDOW_DAYS);

    const { data, error } = await supabaseClient
      .from('exams')
      .select('*')
      .gte('exam_date', today)
      .lte('exam_date', last)
      .lte('show_from', today)
      .order('exam_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.log('Upcoming exams error:', error.message);
      section.style.display = 'none';
      return;
    }

    render(data);
  }

  loadUpcoming();
  setInterval(loadUpcoming, 5 * 60 * 1000); // 5 minute por por refresh
})();