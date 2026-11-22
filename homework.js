// ===== BGPI Homework page =====

(function () {

    const SUPABASE_URL = 'https://xojkjgvlmlclsazpelkx.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_qPQaxDnXEiKJEhQnn20-Xg_JzlNzHPi';
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const BUCKET = 'homework-files';
    const MAX_PDF_BYTES = 20 * 1024 * 1024;
    const DEFAULT_SUBJECT = 'General';

    let currentTab = 'daily';
    let items = [];
    let session = null;
    let editingItem = null;

    const $ = (id) => document.getElementById(id);

    // ---------- Helpers ----------

    function parseDate(str) {
        if (!str) return null;
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function daysLeft(str) {
        const due = parseDate(str);
        if (!due) return null;
        const t = new Date();
        const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
        return Math.round((due - today) / 86400000);
    }

    function dueInfo(str) {
        const n = daysLeft(str);
        if (n === null) return { text: 'No deadline', cls: 'none' };
        if (n < 0) return { text: 'Deadline over', cls: 'overdue' };
        if (n === 0) return { text: 'Due today', cls: 'today' };
        if (n === 1) return { text: 'Due tomorrow', cls: 'soon' };
        if (n <= 5) return { text: `${n} days left`, cls: 'soon' };
        return { text: `${n} days left`, cls: 'normal' };
    }

    function formatDate(str) {
        const d = parseDate(str);
        if (!d) return '';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function youtubeId(url) {
        try {
            const u = new URL(url);
            const host = u.hostname.replace(/^www\./, '');
            let id = '';
            if (host === 'youtu.be') {
                id = u.pathname.slice(1);
            } else if (host === 'youtube.com' || host === 'm.youtube.com') {
                if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
                else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
                else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
            }
            return /^[\w-]{11}$/.test(id) ? id : null;
        } catch (e) {
            return null;
        }
    }

    function isHttps(url) {
        return typeof url === 'string' && url.startsWith('https://');
    }

    function subjectOf(item) {
        return (item.subject || DEFAULT_SUBJECT).trim() || DEFAULT_SUBJECT;
    }

    // Serial prottek subject er moddhe alada cholbe
    function nextSerial(category, subject) {
        const sub = (subject || '').trim() || DEFAULT_SUBJECT;
        const nums = items
            .filter((i) => i.category === category && subjectOf(i) === sub)
            .map((i) => i.serial);
        return (nums.length ? Math.max(...nums) : 0) + 1;
    }

    function refreshSubjectList() {
        const list = $('hw-subject-list');
        list.innerHTML = '';
        const subjects = [...new Set(items.map(subjectOf))].sort((a, b) => a.localeCompare(b));
        subjects.forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s;
            list.appendChild(opt);
        });
    }

    // ---------- Load + render ----------

    async function loadHomework() {
        const { data, error } = await sb
            .from('homework')
            .select('*')
            .order('serial', { ascending: true });

        if (error) {
            $('hw-list').textContent = 'Homework load korte problem hoyeche.';
            console.log(error.message);
            return;
        }
        items = data || [];
        refreshSubjectList();
        render();
    }

    function render() {
        const list = $('hw-list');
        list.innerHTML = '';

        const dailyCount = items.filter((i) => i.category === 'daily').length;
        const jobCount = items.filter((i) => i.category === 'job').length;
        $('count-daily').textContent = dailyCount;
        $('count-job').textContent = jobCount;
        $('hw-total').textContent = `● ${items.length} HOMEWORK`;

        const shown = items.filter((i) => i.category === currentTab);

        if (shown.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'hw-empty glass-card';
            empty.textContent = 'Ei section e ekhono kono homework nei.';
            list.appendChild(empty);
            return;
        }

        // Subject onujayi group
        const groups = new Map();
        shown.forEach((item) => {
            const key = subjectOf(item);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        });

        [...groups.keys()]
            .sort((a, b) => a.localeCompare(b))
            .forEach((subject) => {
                list.appendChild(buildSubjectCard(subject, groups.get(subject)));
            });
    }

    // ---------- Subject card ----------

    function buildSubjectCard(subject, subjectItems) {
        subjectItems.sort((a, b) => a.serial - b.serial);

        const card = document.createElement('section');
        card.className = 'hw-card hw-subject-card glass-card';

        const head = document.createElement('div');
        head.className = 'hw-subject-head';

        const titleWrap = document.createElement('div');

        const h2 = document.createElement('h2');
        h2.textContent = subject;

        const count = document.createElement('span');
        count.className = 'hw-subject-count';
        count.textContent = `${subjectItems.length} ${currentTab === 'job' ? 'job' : 'homework'}`;

        titleWrap.append(h2, count);
        head.appendChild(titleWrap);

        // Sobcheye kachher upcoming deadline
        const upcoming = subjectItems
            .filter((i) => i.due_date && daysLeft(i.due_date) >= 0)
            .sort((a, b) => daysLeft(a.due_date) - daysLeft(b.due_date))[0];

        if (upcoming) {
            const info = dueInfo(upcoming.due_date);
            const chip = document.createElement('span');
            chip.className = 'hw-chip hw-chip-' + info.cls;
            chip.textContent = 'Next: ' + info.text;
            head.appendChild(chip);
        }

        card.appendChild(head);

        const body = document.createElement('div');
        body.className = 'hw-items';
        subjectItems.forEach((item) => body.appendChild(buildItem(item)));
        card.appendChild(body);

        return card;
    }

    // ---------- Single homework (click korle khole) ----------

    function buildItem(item) {
        const details = document.createElement('details');
        details.className = 'hw-item';

        // Summary: serial + title + due
        const summary = document.createElement('summary');

        const serial = document.createElement('span');
        serial.className = 'hw-serial';
        serial.textContent = String(item.serial).padStart(2, '0');

        const titleWrap = document.createElement('div');
        titleWrap.className = 'hw-title-wrap';

        const title = document.createElement('h3');
        title.textContent = item.title;
        titleWrap.appendChild(title);

        if (item.due_date) {
            const sub = document.createElement('span');
            sub.className = 'hw-due-date';
            sub.textContent = 'Submit by ' + formatDate(item.due_date);
            titleWrap.appendChild(sub);
        }

        const info = dueInfo(item.due_date);
        const chip = document.createElement('span');
        chip.className = 'hw-chip hw-chip-' + info.cls;
        chip.textContent = info.text;

        const arrow = document.createElement('span');
        arrow.className = 'hw-arrow';
        arrow.textContent = '▾';

        summary.append(serial, titleWrap, chip, arrow);
        details.appendChild(summary);

        // Body
        const body = document.createElement('div');
        body.className = 'hw-item-body';

        if (item.description) {
            const p = document.createElement('p');
            p.className = 'hw-desc';
            p.textContent = item.description;
            body.appendChild(p);
        }

        const files = document.createElement('div');
        files.className = 'hw-files';

        // Video: YouTube link e notun tab e (ba YouTube app e) khulbe
        const vid = item.video_url ? youtubeId(item.video_url) : null;
        if (vid) {
            const v = document.createElement('a');
            v.className = 'hw-btn hw-video-btn';
            v.href = 'https://www.youtube.com/watch?v=' + vid;
            v.target = '_blank';
            v.rel = 'noopener noreferrer';
            v.textContent = '▶ Watch Video';
            files.appendChild(v);
        }

        // PDF: click korle shorashori download hobe
        if (item.pdf_path) {
            const fileName = (item.title || 'homework').replace(/[^\w\- ]+/g, '').trim() + '.pdf';
            const dl = sb.storage.from(BUCKET).getPublicUrl(item.pdf_path, { download: fileName });

            const a = document.createElement('a');
            a.className = 'hw-btn hw-pdf-btn';
            a.href = dl.data.publicUrl;
            a.rel = 'noopener noreferrer';
            a.textContent = '⬇ Download PDF';
            files.appendChild(a);
        }

        if (files.children.length) body.appendChild(files);

        if (!item.description && !files.children.length) {
            const none = document.createElement('p');
            none.className = 'hw-desc';
            none.textContent = 'Kono extra file ba description nei.';
            body.appendChild(none);
        }

        // Admin buttons
        if (session) {
            const actions = document.createElement('div');
            actions.className = 'hw-actions';

            const edit = document.createElement('button');
            edit.className = 'hw-btn';
            edit.textContent = 'Edit';
            edit.onclick = () => startEdit(item);

            const del = document.createElement('button');
            del.className = 'hw-btn hw-danger';
            del.textContent = 'Delete';
            del.onclick = () => deleteHomework(item);

            actions.append(edit, del);
            body.appendChild(actions);
        }

        details.appendChild(body);
        return details;
    }

    // ---------- Tabs ----------

    function setTab(tab) {
        currentTab = tab === 'job' ? 'job' : 'daily';
        document.querySelectorAll('.hw-tab').forEach((b) => {
            b.classList.toggle('active', b.dataset.tab === currentTab);
        });
        if (!editingItem) {
            $('hw-category').value = currentTab;
            $('hw-serial').value = nextSerial(currentTab, $('hw-subject').value);
        }
        render();
    }

    document.querySelectorAll('.hw-tab').forEach((b) => {
        b.addEventListener('click', () => {
            history.replaceState(null, '', '#' + b.dataset.tab);
            setTab(b.dataset.tab);
        });
    });

    // ---------- Admin: form ----------

    function resetForm() {
        editingItem = null;
        $('hw-form').reset();
        $('hw-category').value = currentTab;
        $('hw-serial').value = nextSerial(currentTab, '');
        $('hw-form-title').textContent = 'Add Homework';
        $('hw-cancel').style.display = 'none';
        $('hw-remove-pdf-wrap').style.display = 'none';
    }

    function startEdit(item) {
        editingItem = item;
        $('hw-category').value = item.category;
        $('hw-subject').value = subjectOf(item);
        $('hw-serial').value = item.serial;
        $('hw-title').value = item.title;
        $('hw-desc').value = item.description || '';
        $('hw-video').value = item.video_url || '';
        $('hw-due').value = item.due_date || '';
        $('hw-pdf').value = '';
        $('hw-remove-pdf').checked = false;
        $('hw-remove-pdf-wrap').style.display = item.pdf_path ? 'flex' : 'none';
        $('hw-form-title').textContent = 'Edit Homework';
        $('hw-cancel').style.display = 'inline-block';
        $('hw-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    $('hw-cancel').addEventListener('click', resetForm);

    function updateSerialSuggestion() {
        if (!editingItem) {
            $('hw-serial').value = nextSerial($('hw-category').value, $('hw-subject').value);
        }
    }

    $('hw-category').addEventListener('change', updateSerialSuggestion);
    $('hw-subject').addEventListener('input', updateSerialSuggestion);

    $('hw-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = $('hw-category').value;
        const subject = $('hw-subject').value.trim();
        const serial = Number($('hw-serial').value);
        const title = $('hw-title').value.trim();
        const description = $('hw-desc').value.trim();
        const video = $('hw-video').value.trim();
        const due = $('hw-due').value;
        const file = $('hw-pdf').files[0];

        if (!subject) return alert('Subject er name dao');
        if (!title) return alert('Title dao');
        if (!serial || serial < 1) return alert('Serial number dao');
        if (video && !youtubeId(video)) return alert('YouTube link ta thik na');
        if (file) {
            if (file.type !== 'application/pdf') return alert('Shudhu PDF file dewa jabe');
            if (file.size > MAX_PDF_BYTES) return alert('PDF 20 MB er beshi hoyeche');
        }

        const saveBtn = $('hw-save');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            let pdf_url = editingItem ? editingItem.pdf_url : null;
            let pdf_path = editingItem ? editingItem.pdf_path : null;
            let oldPathToRemove = null;

            if (editingItem && editingItem.pdf_path && $('hw-remove-pdf').checked) {
                oldPathToRemove = editingItem.pdf_path;
                pdf_url = null;
                pdf_path = null;
            }

            if (file) {
                const safeName = file.name.replace(/[^\w.\-]+/g, '_');
                const path = `${Date.now()}-${safeName}`;
                const up = await sb.storage.from(BUCKET).upload(path, file, {
                    contentType: 'application/pdf',
                    upsert: false
                });
                if (up.error) throw up.error;

                const pub = sb.storage.from(BUCKET).getPublicUrl(path);
                if (editingItem && editingItem.pdf_path) oldPathToRemove = editingItem.pdf_path;
                pdf_url = pub.data.publicUrl;
                pdf_path = path;
            }

            const row = {
                category,
                subject,
                serial,
                title,
                description: description || null,
                video_url: video || null,
                due_date: due || null,
                pdf_url,
                pdf_path
            };

            const result = editingItem
                ? await sb.from('homework').update(row).eq('id', editingItem.id)
                : await sb.from('homework').insert(row);

            if (result.error) throw result.error;

            if (oldPathToRemove) {
                await sb.storage.from(BUCKET).remove([oldPathToRemove]);
            }

            currentTab = category;
            resetForm();
            await loadHomework();
            setTab(category);
        } catch (err) {
            alert('Save hoy nai: ' + (err.message || err));
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });

    async function deleteHomework(item) {
        if (!confirm('Ei homework delete korbe?')) return;

        const { error } = await sb.from('homework').delete().eq('id', item.id);
        if (error) return alert(error.message);

        if (item.pdf_path) {
            await sb.storage.from(BUCKET).remove([item.pdf_path]);
        }
        if (editingItem && editingItem.id === item.id) resetForm();
        loadHomework();
    }

    // ---------- Admin: login / logout ----------

    async function updateAdminUI() {
        const { data } = await sb.auth.getSession();
        session = data.session;

        $('hw-form').style.display = session ? 'block' : 'none';
        $('hw-logout-btn').style.display = session ? 'inline-block' : 'none';
        $('hw-login-btn').style.display = session ? 'none' : 'inline-block';

        render();
    }

    $('hw-login-btn').addEventListener('click', async () => {
        const email = prompt('Admin email:');
        const password = prompt('Password:');
        if (!email || !password) return;

        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) alert('Login hoy nai: ' + error.message);
        updateAdminUI();
    });

    $('hw-logout-btn').addEventListener('click', async () => {
        await sb.auth.signOut();
        updateAdminUI();
    });

    // ---------- Dark / Light mode ----------

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

    (async function init() {
        const hash = location.hash.replace('#', '');
        currentTab = hash === 'job' ? 'job' : 'daily';
        document.querySelectorAll('.hw-tab').forEach((b) => {
            b.classList.toggle('active', b.dataset.tab === currentTab);
        });
        await loadHomework();
        await updateAdminUI();
        resetForm();
    })();

})();