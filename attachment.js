// ===== Attachment helpers (shared by exams.html and index.html) =====
// exams.js / home-exams.js er AGE load korte hobe

const ATT_BASE = 'https://xojkjgvlmlclsazpelkx.supabase.co/storage/v1/object/public/exam-files/';

// "?download=" dile browser file ta download kore (open kore na)
function attUrl(att) {
  const path = att.path.split('/').map(encodeURIComponent).join('/');
  return ATT_BASE + path + '?download=' + encodeURIComponent(att.name);
}

function humanSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Card er bhetore je icon row ta dekhay (student click korle download hoy)
function buildAttachments(list) {
  if (!Array.isArray(list) || list.length === 0) return null;

  const row = document.createElement('div');
  row.className = 'file-row';

  list.forEach(att => {
    const isPdf = att.type === 'application/pdf';

    const a = document.createElement('a');
    a.className = 'file-tile ' + (isPdf ? 'pdf' : 'img');
    a.href = attUrl(att);
    a.setAttribute('download', att.name);
    a.rel = 'noopener';
    a.title = 'Download: ' + att.name;

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.innerHTML =
      '<svg viewBox="0 0 40 48" aria-hidden="true">' +
      '<path d="M6 2h20l10 10v32a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" ' +
      'fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M26 2v10h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '</svg>';

    const ext = document.createElement('span');
    ext.className = 'file-ext';
    ext.textContent = isPdf ? 'PDF' : (att.name.split('.').pop() || 'IMG').toUpperCase().slice(0, 4);
    icon.appendChild(ext);

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = att.name;

    const dl = document.createElement('span');
    dl.className = 'file-dl';
    dl.textContent = '⬇ ' + (humanSize(att.size) || 'Download');

    a.append(icon, name, dl);
    row.appendChild(a);
  });

  return row;
}