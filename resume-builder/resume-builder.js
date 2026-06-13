(function () {
  const storageKey = 'nf_resume_builder_v1';
  const defaults = {
    template: 1,
    name: 'John Doe',
    role: 'Professional Title',
    location: 'Tampa, FL',
    phone: '555-123-4567',
    email: 'john.doe@email.com',
    linkedin: 'linkedin.com/in/johndoe',
    summary: 'Motivated professional with experience supporting daily operations, coordinating tasks, and contributing to team goals. Known for dependable follow-through, clear communication, and organized work habits.',
    job1Title: 'Job Title One',
    job1Dates: '2023 - Present',
    job1Org: 'Company Name, City, ST',
    job1Bullets: 'Supported daily department needs while maintaining accurate records and timely follow-through.\nCoordinated tasks across team members and stakeholders to keep work moving smoothly.\nImproved repeatable workflows, documentation, and handoff procedures.',
    job2Title: 'Job Title Two',
    job2Dates: '2020 - 2023',
    job2Org: 'Company Name, City, ST',
    job2Bullets: 'Managed assigned responsibilities in a fast-paced environment with attention to detail.\nPrepared reports, tracked priorities, and helped resolve day-to-day operational issues.',
    skills: 'Core capability, Team coordination, Documentation, Scheduling, Reporting, Customer service, Microsoft Office',
    educationTitle: 'Certificate or Degree',
    educationSchool: 'Example Institute, 2025'
  };
  const templates = [
    ['Balanced Blue', 'Template1-balanced-blue.html'],
    ['Warm Sidebar', 'Template2-warm-sidebar.html'],
    ['Slate Compact', 'Template3-slate-compact.html'],
    ['Serif Editorial', 'Template4-serif-editorial.html'],
    ['Clean Band', 'Template5-clean-band.html'],
    ['Executive', 'Template6-monochrome-executive.html'],
    ['Navy Rail', 'Template7-navy-rail.html'],
    ['Forest Minimal', 'Template8-forest-minimal.html'],
    ['Burgundy', 'Template9-burgundy-timeline.html'],
    ['Charcoal Grid', 'Template10-charcoal-grid.html']
  ];
  const form = document.getElementById('resumeForm');
  const preview = document.getElementById('resumePreview');
  const grid = document.getElementById('templateGrid');
  const status = document.getElementById('saveStatus');
  const completion = document.getElementById('completion');
  const workspace = document.querySelector('.builder-workspace');
  const templateCache = new Map();
  let state = loadState();
  let saveTimer;
  let renderToken = 0;
  let currentDocumentHtml = '';

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function lines(value) {
    return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  function loadState() {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
    } catch (_) {
      return { ...defaults };
    }
  }

  function hydrateForm() {
    Object.entries(state).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
  }

  function renderTemplates() {
    grid.innerHTML = templates.map(([name], index) => {
      const number = index + 1;
      const active = state.template === number;
      return `<button class="template-choice${active ? ' is-active' : ''}" type="button" data-template="${number}" style="--preview-image:url('template-previews/template-${number}.jpg')" aria-pressed="${active}">${number}<span class="sr-only"> ${escapeHtml(name)}</span></button>`;
    }).join('');
  }

  async function getTemplateSource(number) {
    if (templateCache.has(number)) return templateCache.get(number);
    const file = templates[number - 1][1];
    const response = await fetch(`templates/${file}`);
    if (!response.ok) throw new Error(`Unable to load resume template ${number}`);
    const source = await response.text();
    templateCache.set(number, source);
    return source;
  }

  function setContact(item, label, value) {
    if (!item) return;
    item.replaceChildren();
    const strong = item.ownerDocument.createElement('strong');
    strong.textContent = label;
    const span = item.ownerDocument.createElement('span');
    span.textContent = value || '';
    item.append(strong, span);
  }

  function setJob(job, number) {
    if (!job) return;
    const title = state[`job${number}Title`];
    const dates = state[`job${number}Dates`];
    const org = state[`job${number}Org`];
    const bullets = lines(state[`job${number}Bullets`]);
    const hasContent = [title, dates, org, ...bullets].some(Boolean);
    job.hidden = !hasContent;
    if (!hasContent) return;
    const titleNode = job.querySelector('.job-title');
    const dateNode = job.querySelector('.job-dates');
    const orgNode = job.querySelector('.job-org');
    const list = job.querySelector('ul');
    if (titleNode) titleNode.textContent = title || 'Job title';
    if (dateNode) dateNode.textContent = dates || '';
    if (orgNode) orgNode.textContent = org || '';
    if (list) {
      list.replaceChildren(...bullets.map((text) => {
        const item = job.ownerDocument.createElement('li');
        item.textContent = text;
        return item;
      }));
    }
  }

  function applyResumeData(doc) {
    doc.title = `${state.name || 'Resume'} Resume`;
    const name = doc.querySelector('.name');
    const role = doc.querySelector('.role');
    const summary = doc.querySelector('.summary');
    if (name) name.textContent = state.name || 'Your Name';
    if (role) role.textContent = state.role || 'Professional Title';
    if (summary) summary.textContent = state.summary || 'Add a concise professional summary.';

    const contactItems = Array.from(doc.querySelectorAll('.contact-item'));
    [
      ['Location', state.location],
      ['Phone', state.phone],
      ['Email', state.email],
      ['LinkedIn', state.linkedin]
    ].forEach(([label, value], index) => setContact(contactItems[index], label, value));

    const jobs = Array.from(doc.querySelectorAll('.job'));
    setJob(jobs[0], 1);
    setJob(jobs[1], 2);
    jobs.slice(2).forEach((job) => {
      job.hidden = true;
    });

    const skillGroups = Array.from(doc.querySelectorAll('.skill-group'));
    const skillText = String(state.skills || '').split(',').map((item) => item.trim()).filter(Boolean).join(', ');
    skillGroups.forEach((group, index) => {
      group.hidden = index > 0;
      if (index > 0) return;
      const heading = group.querySelector('strong');
      const content = group.querySelector('p');
      if (heading) heading.textContent = 'Core Skills';
      if (content) content.textContent = skillText || 'Add your strongest skills.';
    });

    const educationItems = Array.from(doc.querySelectorAll('.sidebar-item'));
    educationItems.forEach((item, index) => {
      item.hidden = index > 0;
      if (index > 0) return;
      item.replaceChildren();
      const strong = doc.createElement('strong');
      strong.textContent = state.educationTitle || 'Degree or certificate';
      item.append(strong, doc.createTextNode(state.educationSchool || ''));
    });

    const previewStyle = doc.createElement('style');
    previewStyle.textContent = `
      html, body { width: 8.5in !important; min-height: 11in !important; overflow: hidden !important; background: #fff !important; }
      .document { padding: 0 !important; }
      .page { margin: 0 !important; box-shadow: none !important; }
      [hidden] { display: none !important; }
    `;
    doc.head.appendChild(previewStyle);
  }

  async function buildDocumentHtml(number) {
    const source = await getTemplateSource(number);
    const doc = new DOMParser().parseFromString(source, 'text/html');
    applyResumeData(doc);
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  }

  async function renderPreview() {
    const token = ++renderToken;
    const selectedTemplate = state.template;
    status.textContent = 'Rendering...';
    try {
      const html = await buildDocumentHtml(selectedTemplate);
      if (token !== renderToken) return;
      currentDocumentHtml = html;
      preview.srcdoc = html;
      status.textContent = 'Saved locally';
    } catch (error) {
      if (token !== renderToken) return;
      status.textContent = 'Preview unavailable';
      preview.srcdoc = `<p style="font:16px Arial;padding:30px">The selected template could not be loaded.</p>`;
      console.error(error);
    }
  }

  function render() {
    renderTemplates();
    renderPreview();
    const required = ['name', 'role', 'email', 'summary', 'job1Title', 'job1Org', 'job1Bullets', 'skills', 'educationTitle'];
    const complete = required.filter((key) => String(state[key] || '').trim()).length;
    completion.textContent = `${Math.round((complete / required.length) * 100)}% complete`;
  }

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    status.textContent = 'Saved locally';
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 300);
  }

  function syncState() {
    new FormData(form).forEach((value, key) => {
      state[key] = value;
    });
    renderPreview();
    scheduleSave();
  }

  form.addEventListener('input', syncState);
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-template]');
    if (!button) return;
    state.template = Number(button.dataset.template);
    render();
    scheduleSave();
  });

  document.getElementById('clearButton').addEventListener('click', () => {
    if (!window.confirm('Clear this resume and restore the starter content?')) return;
    state = { ...defaults };
    hydrateForm();
    render();
    save();
  });

  document.getElementById('printButton').addEventListener('click', async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Allow pop-ups for this page to save your resume as a PDF.');
      return;
    }
    printWindow.document.write('<!doctype html><title>Preparing resume...</title><p style="font:16px Arial;padding:30px">Preparing your resume...</p>');
    try {
      const html = currentDocumentHtml || await buildDocumentHtml(state.template);
      printWindow.document.open();
      printWindow.document.write(html.replace('</body>', '<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\\/script></body>'));
      printWindow.document.close();
    } catch (error) {
      printWindow.document.body.textContent = 'The resume could not be prepared for printing.';
      console.error(error);
    }
  });

  document.querySelectorAll('[data-mobile-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const previewMode = button.dataset.mobileView === 'preview';
      workspace.classList.toggle('mobile-preview', previewMode);
      document.querySelectorAll('[data-mobile-view]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
    });
  });

  hydrateForm();
  render();
})();
