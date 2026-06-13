(function () {
  const storageKey = 'nf_resume_builder_v1';
  const defaults = {
    template: 1,
    name: 'John Doe',
    role: 'Professional Title',
    location: 'City, State',
    phone: '555-123-4567',
    email: 'john.doe@email.com',
    linkedin: 'linkedin.com/in/johndoe',
    summary: 'Motivated professional with experience supporting daily operations, coordinating tasks, and contributing to team goals. Known for dependable follow-through, clear communication, and organized work habits.',
    positions: [
      {
        title: 'Job Title One',
        dates: '2023 - Present',
        org: 'Company Name, City, ST',
        bullets: 'Supported daily department needs while maintaining accurate records and timely follow-through.\nCoordinated tasks across team members and stakeholders to keep work moving smoothly.\nImproved repeatable workflows, documentation, and handoff procedures.'
      },
      {
        title: 'Job Title Two',
        dates: '2020 - 2023',
        org: 'Company Name, City, ST',
        bullets: 'Managed assigned responsibilities in a fast-paced environment with attention to detail.\nPrepared reports, tracked priorities, and helped resolve day-to-day operational issues.'
      }
    ],
    skills: 'Core capability, Team coordination, Documentation, Scheduling, Reporting, Customer service, Microsoft Office',
    education: [
      {
        title: 'Certificate or Degree',
        school: 'Example Institute, 2025'
      }
    ]
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
  const positionsList = document.getElementById('positionsList');
  const educationList = document.getElementById('educationList');
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
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const hasOldStarterLocation = saved.location === 'Tampa, FL'
        && (!saved.name || saved.name === 'John Doe')
        && (!saved.email || saved.email === 'john.doe@email.com');
      if (hasOldStarterLocation) saved.location = defaults.location;
      const positions = Array.isArray(saved.positions) ? saved.positions : [
        {
          title: saved.job1Title,
          dates: saved.job1Dates,
          org: saved.job1Org,
          bullets: saved.job1Bullets
        },
        {
          title: saved.job2Title,
          dates: saved.job2Dates,
          org: saved.job2Org,
          bullets: saved.job2Bullets
        }
      ].filter((position) => Object.values(position).some(Boolean));
      const education = Array.isArray(saved.education) ? saved.education : [
        {
          title: saved.educationTitle,
          school: saved.educationSchool
        }
      ].filter((item) => Object.values(item).some(Boolean));
      return {
        ...defaults,
        ...saved,
        positions: positions.length ? positions : structuredClone(defaults.positions),
        education: education.length ? education : structuredClone(defaults.education)
      };
    } catch (_) {
      return structuredClone(defaults);
    }
  }

  function hydrateForm() {
    Object.entries(state).forEach(([key, value]) => {
      if (!Array.isArray(value) && form.elements[key]) form.elements[key].value = value;
    });
    renderEntryEditors();
  }

  function positionEditor(position, index) {
    const number = String(index + 1).padStart(2, '0');
    return `
      <div class="repeat-card" data-position-index="${index}">
        <div class="repeat-card-head">
          <span class="repeat-label">Position ${number}</span>
          <button class="remove-entry" type="button" data-remove-position="${index}"${state.positions.length === 1 ? ' disabled' : ''}>Remove</button>
        </div>
        <div class="field-grid two">
          <label>Job title<input data-position-field="title" value="${escapeHtml(position.title)}" placeholder="Job Title"></label>
          <label>Dates<input data-position-field="dates" value="${escapeHtml(position.dates)}" placeholder="2023 - Present"></label>
        </div>
        <label>Company and location<input data-position-field="org" value="${escapeHtml(position.org)}" placeholder="Company Name, City, ST"></label>
        <label>Achievements, one per line<textarea data-position-field="bullets" rows="4" placeholder="Improved a measurable result by taking a specific action.&#10;Coordinated work across teams to deliver an outcome.">${escapeHtml(position.bullets)}</textarea></label>
      </div>`;
  }

  function educationEditor(item, index) {
    const number = String(index + 1).padStart(2, '0');
    return `
      <div class="repeat-card" data-education-index="${index}">
        <div class="repeat-card-head">
          <span class="repeat-label">Education ${number}</span>
          <button class="remove-entry" type="button" data-remove-education="${index}"${state.education.length === 1 ? ' disabled' : ''}>Remove</button>
        </div>
        <div class="field-grid two">
          <label>Degree or certificate<input data-education-field="title" value="${escapeHtml(item.title)}" placeholder="Certificate or Degree"></label>
          <label>School and year<input data-education-field="school" value="${escapeHtml(item.school)}" placeholder="Example Institute, 2025"></label>
        </div>
      </div>`;
  }

  function renderEntryEditors() {
    positionsList.innerHTML = state.positions.map(positionEditor).join('');
    educationList.innerHTML = state.education.map(educationEditor).join('');
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

  function setJob(job, position) {
    if (!job) return;
    const { title, dates, org } = position;
    const bullets = lines(position.bullets);
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

    const workSection = Array.from(doc.querySelectorAll('.section')).find((section) => (
      section.querySelector('.section-title')?.textContent.trim() === 'Work Experience'
    ));
    const originalJobs = Array.from(workSection?.querySelectorAll('.job') || []);
    const jobTemplate = originalJobs[1] || originalJobs[0];
    originalJobs.forEach((job) => job.remove());
    state.positions.forEach((position, index) => {
      if (!jobTemplate || !workSection) return;
      const job = jobTemplate.cloneNode(true);
      job.hidden = false;
      job.classList.toggle('job-break', index > 0);
      setJob(job, position);
      workSection.appendChild(job);
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

    const educationSection = Array.from(doc.querySelectorAll('.section')).find((section) => (
      section.querySelector('.section-title')?.textContent.trim() === 'Education'
    ));
    const originalEducation = Array.from(educationSection?.querySelectorAll('.sidebar-item') || []);
    const educationTemplate = originalEducation[0];
    originalEducation.forEach((item) => item.remove());
    state.education.forEach((education) => {
      if (!educationTemplate || !educationSection) return;
      const item = educationTemplate.cloneNode(true);
      item.hidden = false;
      item.replaceChildren();
      const strong = doc.createElement('strong');
      strong.textContent = education.title || 'Degree or certificate';
      item.append(strong, doc.createTextNode(education.school || ''));
      educationSection.appendChild(item);
    });

    const previewStyle = doc.createElement('style');
    previewStyle.textContent = `
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
    const required = [state.name, state.role, state.email, state.summary, state.positions[0]?.title, state.positions[0]?.org, state.positions[0]?.bullets, state.skills, state.education[0]?.title];
    const complete = required.filter((value) => String(value || '').trim()).length;
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
  positionsList.addEventListener('input', (event) => {
    const card = event.target.closest('[data-position-index]');
    const field = event.target.dataset.positionField;
    if (!card || !field) return;
    state.positions[Number(card.dataset.positionIndex)][field] = event.target.value;
    renderPreview();
    scheduleSave();
  });
  educationList.addEventListener('input', (event) => {
    const card = event.target.closest('[data-education-index]');
    const field = event.target.dataset.educationField;
    if (!card || !field) return;
    state.education[Number(card.dataset.educationIndex)][field] = event.target.value;
    renderPreview();
    scheduleSave();
  });
  positionsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-position]');
    if (!button || state.positions.length === 1) return;
    state.positions.splice(Number(button.dataset.removePosition), 1);
    renderEntryEditors();
    renderPreview();
    scheduleSave();
  });
  educationList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-education]');
    if (!button || state.education.length === 1) return;
    state.education.splice(Number(button.dataset.removeEducation), 1);
    renderEntryEditors();
    renderPreview();
    scheduleSave();
  });
  document.getElementById('addPositionButton').addEventListener('click', () => {
    state.positions.push({ title: '', dates: '', org: '', bullets: '' });
    renderEntryEditors();
    renderPreview();
    scheduleSave();
  });
  document.getElementById('addEducationButton').addEventListener('click', () => {
    state.education.push({ title: '', school: '' });
    renderEntryEditors();
    renderPreview();
    scheduleSave();
  });
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-template]');
    if (!button) return;
    state.template = Number(button.dataset.template);
    render();
    scheduleSave();
  });

  document.getElementById('clearButton').addEventListener('click', () => {
    if (!window.confirm('Clear this resume and restore the starter content?')) return;
    state = structuredClone(defaults);
    hydrateForm();
    render();
    save();
  });

  const printHelpDialog = document.getElementById('printHelpDialog');

  document.getElementById('printHelpButton').addEventListener('click', () => {
    printHelpDialog.showModal();
  });

  printHelpDialog.querySelector('[data-close-print-help]').addEventListener('click', () => {
    printHelpDialog.close();
  });

  printHelpDialog.addEventListener('click', (event) => {
    if (event.target === printHelpDialog) printHelpDialog.close();
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
