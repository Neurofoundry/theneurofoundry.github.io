const { EventEmitter } = require('events');
const { chromium } = require('playwright');

const MAX_EVENTS = 200;
const MAX_INTERACTIVE_ELEMENTS = 24;
const SUPPORTED_ORIGINS = ['http://127.0.0.1:3000', 'http://localhost:3000'];
const CANONICAL_LAUNCH_URL = 'http://127.0.0.1:3000/automation-console.html';
const KNOWN_DESTINATIONS = {
  google: 'https://www.google.com',
  github: 'https://github.com',
  youtube: 'https://www.youtube.com',
  gmail: 'https://mail.google.com',
  linkedin: 'https://www.linkedin.com',
  facebook: 'https://www.facebook.com',
  amazon: 'https://www.amazon.com'
};
const ACTION_LEXICON = {
  navigate: ['go to', 'navigate to', 'visit', 'open'],
  click: ['click', 'open', 'select', 'choose', 'press'],
  search: ['search for', 'search', 'find', 'look up'],
  login: ['sign in', 'log in', 'login'],
  signup: ['sign up', 'register', 'create account'],
  submit: ['submit', 'continue', 'save', 'done', 'finish', 'next']
};

class PlaywrightAutomationService {
  constructor() {
    this.browser = null;
    this.browserName = null;
    this.context = null;
    this.page = null;
    this.eventEmitter = new EventEmitter();
    this.queue = Promise.resolve();
    this.sessionState = 'idle';
    this.currentCommand = null;
    this.commandCounter = 0;
    this.events = [];
    this.lastPageAnalysis = null;
    this.lastPlan = [];
    this.lastError = null;
    this.deferredGoals = [];
    this.subgoals = [];
    this.lastCompletion = null;
    this.recoveringPage = false;
  }

  subscribe(listener) {
    this.eventEmitter.on('event', listener);
    return () => this.eventEmitter.off('event', listener);
  }

  emitEvent(type, data = {}) {
    const payload = {
      id: `${Date.now()}-${this.events.length + 1}`,
      type,
      timestamp: new Date().toISOString(),
      data
    };

    this.events.push(payload);
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }

    this.eventEmitter.emit('event', payload);
  }

  async getStatus() {
    const page = this.page;
    const url = page ? page.url() : null;

    return {
      sessionState: this.sessionState,
      hasBrowser: Boolean(this.browser),
      browserName: this.browserName,
      currentCommand: this.currentCommand,
      currentUrl: url,
      title: page ? await page.title().catch(() => '') : '',
      lastPlan: this.lastPlan,
      lastPageAnalysis: this.lastPageAnalysis,
      lastError: this.lastError,
      deferredGoals: this.deferredGoals,
      subgoals: this.subgoals,
      lastCompletion: this.lastCompletion,
      recentEvents: this.events.slice(-25)
    };
  }

  async getReadyState(origin) {
    const normalizedOrigin = origin || '';
    const currentOriginAccepted = !normalizedOrigin || SUPPORTED_ORIGINS.includes(normalizedOrigin);
    const browserLaunchAvailable = await this.checkBrowserLaunchAvailability();
    const canAcceptCommands = currentOriginAccepted
      && browserLaunchAvailable.available
      && ['ready', 'running'].includes(this.sessionState);

    return {
      backendReachable: true,
      supportedOrigin: CANONICAL_LAUNCH_URL,
      supportedOrigins: SUPPORTED_ORIGINS,
      currentOriginAccepted,
      sessionState: this.sessionState,
      browserName: this.browserName,
      browserLaunchAvailable: browserLaunchAvailable.available,
      canAcceptCommands,
      message: this.buildReadyMessage({
        currentOriginAccepted,
        browserLaunchAvailable,
        sessionState: this.sessionState
      })
    };
  }

  buildReadyMessage({ currentOriginAccepted, browserLaunchAvailable, sessionState }) {
    if (!currentOriginAccepted) {
      return `Console must be launched from ${CANONICAL_LAUNCH_URL}.`;
    }

    if (!browserLaunchAvailable.available) {
      return `Browser launch is unavailable: ${browserLaunchAvailable.reason}`;
    }

    if (sessionState === 'error') {
      return 'Automation service is in an error state. Relaunch the browser session.';
    }

    if (sessionState === 'idle') {
      return 'Backend is ready. Launch the browser session to accept commands.';
    }

    if (sessionState === 'launching') {
      return 'Browser session is launching.';
    }

    return 'Backend and browser session are ready.';
  }

  async checkBrowserLaunchAvailability() {
    try {
      const executable = chromium.executablePath();
      return {
        available: Boolean(executable),
        reason: executable ? '' : 'No Playwright Chromium executable found.'
      };
    } catch (error) {
      return {
        available: false,
        reason: error.message
      };
    }
  }

  async ensureSession() {
    if (this.page && !this.page.isClosed()) {
      this.sessionState = this.currentCommand ? 'running' : 'ready';
      return this.getStatus();
    }

    this.sessionState = 'launching';
    this.emitEvent('session', { status: 'launching', message: 'Launching headed browser session.' });

    const launched = await this.launchBrowser();
    this.browser = launched.browser;
    this.browserName = launched.browserName;

    this.context = await this.browser.newContext({
      viewport: { width: 1440, height: 960 }
    });

    this.bindBrowserLifecycle();
    this.page = await this.createManagedPage();

    this.lastPageAnalysis = await this.safeAnalyzePage();
    this.sessionState = 'ready';
    this.emitEvent('session', {
      status: 'ready',
      browserName: this.browserName,
      message: `${this.browserName} is open and waiting for commands.`
    });
    return this.getStatus();
  }

  async launchBrowser() {
    const launchOptions = {
      headless: false,
      slowMo: 120
    };

    try {
      const browser = await chromium.launch({
        ...launchOptions,
        channel: 'msedge'
      });

      return {
        browser,
        browserName: 'Microsoft Edge'
      };
    } catch (error) {
      this.emitEvent('session', {
        status: 'launch-fallback',
        browserName: 'Chromium',
        message: 'Microsoft Edge was unavailable. Falling back to Chromium.',
        detail: error.message
      });

      const browser = await chromium.launch(launchOptions);
      return {
        browser,
        browserName: 'Chromium'
      };
    }
  }

  bindBrowserLifecycle() {
    if (!this.browser) {
      return;
    }

    this.browser.on('disconnected', () => {
      this.emitEvent('session', {
        status: 'disconnected',
        browserName: this.browserName,
        message: 'Browser disconnected.'
      });
      this.resetSessionState();
    });
  }

  async createManagedPage() {
    const page = await this.context.newPage();

    page.on('framenavigated', async (frame) => {
      if (this.page !== page) {
        return;
      }

      if (frame === page.mainFrame()) {
        this.lastPageAnalysis = await this.safeAnalyzePage();
        this.emitEvent('navigation', {
          url: page.url(),
          title: await page.title().catch(() => '')
        });
      }
    });

    page.on('dialog', async (dialog) => {
      this.emitEvent('dialog', {
        type: dialog.type(),
        message: dialog.message()
      });
      await dialog.dismiss().catch(() => {});
    });

    page.on('close', async () => {
      if (this.page !== page) {
        return;
      }

      this.emitEvent('page', {
        status: 'closed',
        message: 'Active page closed.'
      });
      await this.recoverActivePage();
    });

    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    return page;
  }

  async recoverActivePage() {
    if (this.recoveringPage || !this.context || !this.browser || !this.browser.isConnected()) {
      return;
    }

    this.recoveringPage = true;
    try {
      this.emitEvent('page', {
        status: 'recovering',
        message: 'Recreating active page to keep the session alive.'
      });
      this.page = await this.createManagedPage();
      this.lastPageAnalysis = await this.safeAnalyzePage();
      this.sessionState = this.currentCommand ? 'running' : 'ready';
      this.emitEvent('page', {
        status: 'ready',
        message: 'Replacement page is ready.'
      });
    } catch (error) {
      this.lastError = error.message;
      this.sessionState = 'error';
      this.emitEvent('error', {
        message: `Failed to recover active page: ${error.message}`
      });
    } finally {
      this.recoveringPage = false;
    }
  }

  async stopSession() {
    if (this.page && !this.page.isClosed()) {
      await this.page.close().catch(() => {});
    }

    if (this.context) {
      await this.context.close().catch(() => {});
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
    }

    this.browser = null;
    this.browserName = null;
    this.context = null;
    this.page = null;
    this.lastPageAnalysis = null;
    this.lastPlan = [];
    this.currentCommand = null;
    this.lastError = null;
    this.deferredGoals = [];
    this.subgoals = [];
    this.lastCompletion = null;
    this.recoveringPage = false;
    this.sessionState = 'idle';
    this.emitEvent('session', { status: 'idle', message: 'Browser session closed.' });
    return this.getStatus();
  }

  resetSessionState() {
    this.browser = null;
    this.browserName = null;
    this.context = null;
    this.page = null;
    this.currentCommand = null;
    this.lastPageAnalysis = null;
    this.lastPlan = [];
    this.subgoals = [];
    this.lastCompletion = null;
    this.recoveringPage = false;
    this.sessionState = 'idle';
  }

  async enqueueCommand(command) {
    if (!command || typeof command !== 'string' || !command.trim()) {
      throw new Error('Command text is required.');
    }

    const commandRecord = {
      id: `cmd-${++this.commandCounter}`,
      command: command.trim(),
      acceptedAt: new Date().toISOString(),
      status: 'queued'
    };

    this.emitEvent('command', {
      status: 'queued',
      commandId: commandRecord.id,
      command: commandRecord.command
    });

    this.queue = this.queue
      .then(() => this.executeCommand(commandRecord))
      .catch((error) => {
        this.lastError = error.message;
        this.sessionState = 'error';
        this.emitEvent('error', {
          commandId: commandRecord.id,
          message: error.message
        });
      });

    return commandRecord;
  }

  async executeCommand(commandRecord) {
    await this.ensureSession();

    this.currentCommand = commandRecord;
    this.currentCommand.status = 'running';
    this.sessionState = 'running';
    this.lastError = null;

    this.emitEvent('command', {
      status: 'running',
      commandId: commandRecord.id,
      command: commandRecord.command
    });

    const parsed = this.parseCommand(commandRecord.command);
    this.deferredGoals = parsed.deferredGoals || [];
    this.subgoals = this.buildSubgoals(parsed);
    this.lastCompletion = null;
    const plan = await this.buildPlan(parsed);
    this.lastPlan = plan;

    this.emitEvent('plan', {
      commandId: commandRecord.id,
      parsed,
      plan
    });

    let blockedReason = '';
    for (const action of plan) {
      const beforeState = await this.captureExecutionState();
      const expectedOutcome = this.describeExpectedOutcome(action);

      await this.executeAction(action, parsed);

      const afterState = await this.captureExecutionState();
      const assessment = this.assessActionOutcome(action, expectedOutcome, beforeState, afterState);
      this.updateSubgoals(action, assessment, afterState);

      this.emitEvent('assessment', {
        commandId: commandRecord.id,
        action,
        expectedOutcome,
        assessment
      });

      if (!assessment.success) {
        blockedReason = assessment.reason || `Action "${action.type}" did not achieve its expected outcome.`;
        break;
      }
    }

    this.lastPageAnalysis = await this.safeAnalyzePage();
    this.lastCompletion = this.assessCompletion(parsed, blockedReason);
    this.currentCommand.status = this.lastCompletion.status;
    this.emitEvent('command', {
      status: this.lastCompletion.status,
      commandId: commandRecord.id,
      command: commandRecord.command,
      completion: this.lastCompletion
    });
    this.currentCommand = null;
    this.sessionState = this.lastCompletion.status === 'blocked' ? 'ready' : 'ready';
  }

  parseCommand(command) {
    const raw = command.trim();
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const clauses = this.extractClauses(normalized);
    const urls = [...normalized.matchAll(/https?:\/\/[^\s,]+/gi)].map((match) => match[0]);
    const fields = this.extractFields(normalized);
    const searchDirective = this.extractSearchDirective(clauses);
    const navigationTargets = this.extractNavigationTargets(clauses);
    const clickTargets = this.extractClickTargets(clauses);
    const intent = this.extractIntent(clauses, { fields, searchDirective, navigationTargets, clickTargets });

    for (const target of navigationTargets) {
      if (target.url) {
        urls.push(target.url);
      }
    }

    return {
      raw,
      normalized,
      clauses,
      urls,
      searchQuery: searchDirective.query,
      searchSite: searchDirective.site,
      fields: this.dedupeFields(fields),
      clickTargets: [...new Set(clickTargets)],
      navigationTargets,
      deferredGoals: this.extractDeferredGoals(clauses),
      intent
    };
  }

  extractClauses(normalized) {
    return normalized
      .split(/\b(?:and then|then click|then open|then go to|then navigate to|then search for|then search|then fill|then type|then enter|then submit|then continue)\b|[.;]/i)
      .map((clause) => clause.trim())
      .filter(Boolean);
  }

  extractFields(normalized) {
    const fields = [];
    const fieldPattern = /\b(?:fill|type|enter|put)\s+(?:the\s+)?([a-z0-9 _-]+?)\s+(?:with|as)\s+"?([^".,;\n]+)"?/gi;
    let fieldMatch;

    while ((fieldMatch = fieldPattern.exec(normalized))) {
      fields.push({
        field: fieldMatch[1].trim(),
        value: fieldMatch[2].trim()
      });
    }

    const shortcuts = [
      { key: 'email', pattern: /\bemail(?: address)?\s*(?:is|=|:)\s*"?([^",\n;]+)"?/i },
      { key: 'username', pattern: /\busername\s*(?:is|=|:)\s*"?([^",\n;]+)"?/i },
      { key: 'password', pattern: /\bpassword\s*(?:is|=|:)\s*"?([^",\n;]+)"?/i }
    ];

    for (const shortcut of shortcuts) {
      const match = normalized.match(shortcut.pattern);
      if (match) {
        fields.push({
          field: shortcut.key,
          value: match[1].trim()
        });
      }
    }

    return fields;
  }

  extractSearchDirective(clauses) {
    for (const clause of clauses) {
      if (!this.containsLexiconTerm(clause, ACTION_LEXICON.search)) {
        continue;
      }

      const match = clause.match(/\b(?:search(?: for)?|find|look up)\s+"?([^"]+?)"?(?:\s+on\s+([a-z0-9.-]+))?$/i);
      if (match) {
        return {
          query: match[1].trim(),
          site: match[2] ? match[2].trim() : ''
        };
      }
    }

    return { query: '', site: '' };
  }

  extractNavigationTargets(clauses) {
    const targets = [];

    for (const clause of clauses) {
      if (!this.containsLexiconTerm(clause, ACTION_LEXICON.navigate)) {
        continue;
      }

      const navigationSource = clause
        .replace(/\b(and\s+search(?:\s+for)?|and\s+click|and\s+open|and\s+fill|and\s+type|and\s+enter|and\s+submit|and\s+continue)\b.*$/i, '')
        .trim();

      const urlMatch = navigationSource.match(/\b(?:go to|navigate to|visit|open)\s+(https?:\/\/[^\s,]+|[a-z0-9.-]+\.[a-z]{2,}[^\s,]*)/i);
      if (urlMatch) {
        targets.push({
          raw: urlMatch[1],
          url: this.normalizeUrl(urlMatch[1])
        });
        continue;
      }

      const knownTargetMatch = navigationSource.match(/\b(?:go to|navigate to|visit|open)\s+([a-z0-9 _-]+)$/i);
      if (knownTargetMatch) {
        const key = this.normalizeText(knownTargetMatch[1]).replace(/\s+/g, ' ').trim();
        const mapped = KNOWN_DESTINATIONS[key];
        if (mapped) {
          targets.push({
            raw: knownTargetMatch[1].trim(),
            url: mapped
          });
        }
      }
    }

    return targets;
  }

  extractClickTargets(clauses) {
    const targets = [];

    for (const clause of clauses) {
      const clickMatch = clause.match(/\b(?:click|select|choose|press|open)\s+(?:the\s+)?([a-z0-9 _-]+?)(?=(?:\s+(?:button|link|tab|menu|option))?$)/i);
      if (!clickMatch) {
        continue;
      }

      const target = clickMatch[1].trim();
      if (!target || this.looksLikeNavigationTarget(clause, target)) {
        continue;
      }

      targets.push(target);
    }

    return targets;
  }

  extractIntent(clauses, context) {
    const wantsLogin = clauses.some((clause) => this.isExplicitActionClause(clause, ACTION_LEXICON.login));
    const wantsSignup = clauses.some((clause) => this.isExplicitActionClause(clause, ACTION_LEXICON.signup));
    const wantsSubmit = clauses.some((clause) => this.isExplicitActionClause(clause, ACTION_LEXICON.submit));

    return {
      wantsSearch: Boolean(context.searchDirective.query),
      wantsLogin,
      wantsSignup,
      wantsSubmit,
      wantsNavigate: context.navigationTargets.length > 0,
      hasExplicitClicks: context.clickTargets.length > 0,
      hasFieldData: context.fields.length > 0,
      hasDeferredGoals: clauses.some((clause) => /\byou will need to\b|\byou need to\b|\bmay need to\b|\bgoal is to\b|\btrying to\b/.test(this.normalizeText(clause)))
    };
  }

  extractDeferredGoals(clauses) {
    return clauses
      .filter((clause) => /\byou will need to\b|\byou need to\b|\bmay need to\b|\bgoal is to\b|\btrying to\b/.test(this.normalizeText(clause)))
      .map((clause) => clause.trim());
  }

  containsLexiconTerm(clause, terms) {
    const normalizedClause = this.normalizeText(clause);
    return terms.some((term) => normalizedClause.includes(this.normalizeText(term)));
  }

  isExplicitActionClause(clause, lexiconTerms) {
    const normalizedClause = this.normalizeText(clause);
    if (!lexiconTerms.some((term) => normalizedClause.includes(this.normalizeText(term)))) {
      return false;
    }

    if (/\byou will need to\b|\byou need to\b|\bmay need to\b|\bshould\b|\bprobably\b/.test(normalizedClause)) {
      return false;
    }

    return /^(please\s+)?(click|open|go|navigate|visit|search|find|look|fill|type|enter|put|sign|log|login|submit|continue|choose|select|press|register|create)\b/.test(normalizedClause)
      || /\b(?:click|open|go to|navigate to|visit|search for|find|look up|fill|type|enter|put|sign in|log in|login|submit|continue|choose|select|press|register|create account)\b/.test(normalizedClause);
  }

  looksLikeNavigationTarget(clause, target) {
    const normalizedClause = this.normalizeText(clause);
    const normalizedTarget = this.normalizeText(target);
    return ACTION_LEXICON.navigate.some((term) => normalizedClause.startsWith(this.normalizeText(term)))
      && Boolean(KNOWN_DESTINATIONS[normalizedTarget]);
  }

  dedupeFields(fields) {
    const seen = new Set();
    return fields.filter((entry) => {
      const key = `${entry.field.toLowerCase()}::${entry.value}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  normalizeUrl(value) {
    if (!value) {
      return value;
    }

    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  async buildPlan(parsed) {
    const plan = [];
    const currentUrl = this.page ? this.page.url() : 'about:blank';

    if (parsed.urls.length > 0) {
      const targetUrl = parsed.urls[0];
      if (currentUrl !== targetUrl) {
        plan.push({
          type: 'navigate',
          target: targetUrl,
          reason: 'Command includes a specific destination URL.'
        });
      }
    } else if (parsed.intent.wantsSearch && currentUrl === 'about:blank') {
      const searchHost = parsed.searchSite ? this.normalizeUrl(parsed.searchSite) : 'https://www.google.com';
      plan.push({
        type: 'navigate',
        target: searchHost,
        reason: 'Search requested without an active destination, defaulting to a search page.'
      });
    }

    for (const target of parsed.clickTargets) {
      plan.push({
        type: 'click',
        target,
        reason: 'Command explicitly asked to open or click this control.'
      });
    }

    for (const field of parsed.fields) {
      plan.push({
        type: 'fill',
        target: field.field,
        value: field.value,
        reason: 'Command provided a field/value pair.'
      });
    }

    if (parsed.searchQuery) {
      plan.push({
        type: 'search',
        target: parsed.searchQuery,
        reason: 'Command includes a search intent.'
      });
    }

    if (parsed.intent.wantsLogin && (parsed.intent.hasExplicitClicks || parsed.intent.hasFieldData || this.pageSuggestsAuth())) {
      plan.push({
        type: 'submit',
        target: 'sign in',
        alternatives: ['log in', 'login', 'continue'],
        reason: 'Command goal indicates an authentication flow.'
      });
    } else if (parsed.intent.wantsSignup && (parsed.intent.hasExplicitClicks || parsed.intent.hasFieldData || this.pageSuggestsAuth())) {
      plan.push({
        type: 'submit',
        target: 'sign up',
        alternatives: ['register', 'create account', 'continue'],
        reason: 'Command goal indicates an account creation flow.'
      });
    } else if (parsed.intent.wantsSearch) {
      plan.push({
        type: 'submit',
        target: 'search',
        alternatives: ['find', 'go'],
        reason: 'Search flows usually require a final submit action.'
      });
    } else if (parsed.intent.wantsSubmit || parsed.fields.length > 0) {
      plan.push({
        type: 'submit',
        target: 'submit',
        alternatives: ['continue', 'save', 'done'],
        reason: 'A final confirmation step is likely required.'
      });
    }

    if (!plan.length) {
      plan.push({
        type: 'analyze',
        target: parsed.raw,
        reason: 'No deterministic browser action could be extracted from the command.'
      });
    }

    return plan;
  }

  buildSubgoals(parsed) {
    const subgoals = [];

    if (parsed.urls[0]) {
      subgoals.push({ key: 'navigate', label: `Reach ${parsed.urls[0]}`, status: 'pending', evidence: '' });
    }
    if (parsed.searchQuery) {
      subgoals.push({ key: 'search', label: `Search for ${parsed.searchQuery}`, status: 'pending', evidence: '' });
    }
    for (const field of parsed.fields) {
      subgoals.push({ key: `fill:${field.field}`, label: `Fill ${field.field}`, status: 'pending', evidence: '' });
    }
    for (const target of parsed.clickTargets) {
      subgoals.push({ key: `click:${target}`, label: `Click ${target}`, status: 'pending', evidence: '' });
    }
    if (parsed.intent.wantsLogin) {
      subgoals.push({ key: 'login', label: 'Complete login transition', status: 'pending', evidence: '' });
    }
    if (parsed.intent.wantsSignup) {
      subgoals.push({ key: 'signup', label: 'Complete signup transition', status: 'pending', evidence: '' });
    }
    if (parsed.intent.wantsSubmit && !parsed.intent.wantsLogin && !parsed.intent.wantsSignup) {
      subgoals.push({ key: 'submit', label: 'Submit current flow', status: 'pending', evidence: '' });
    }

    return subgoals;
  }

  async captureExecutionState() {
    const pageAnalysis = await this.safeAnalyzePage();
    return {
      url: this.page ? this.page.url() : '',
      title: this.page ? await this.page.title().catch(() => '') : '',
      pageAnalysis,
      signature: this.pageSignature(pageAnalysis)
    };
  }

  pageSignature(pageAnalysis) {
    if (!pageAnalysis) {
      return '';
    }

    return JSON.stringify({
      url: pageAnalysis.url || '',
      title: pageAnalysis.title || '',
      elements: (pageAnalysis.elements || []).map((element) => `${element.role}|${element.name}|${element.text}|${element.selector}`)
    });
  }

  describeExpectedOutcome(action) {
    if (action.type === 'navigate') {
      return { type: 'url-contains', value: action.target };
    }
    if (action.type === 'search') {
      return { type: 'state-change', value: action.target };
    }
    if (action.type === 'fill') {
      return { type: 'field-visible', value: action.target };
    }
    if (action.type === 'click' || action.type === 'submit') {
      return { type: 'state-change', value: action.target };
    }
    return { type: 'analysis', value: action.target };
  }

  assessActionOutcome(action, expectedOutcome, beforeState, afterState) {
    const urlChanged = beforeState.url !== afterState.url || beforeState.title !== afterState.title;
    const domChanged = beforeState.signature !== afterState.signature;

    if (action.type === 'navigate') {
      const success = this.normalizeText(afterState.url).includes(this.normalizeText(action.target));
      return {
        success,
        observed: success ? 'target-url-reached' : 'target-url-not-reached',
        reason: success ? '' : `Navigation did not reach ${action.target}.`
      };
    }

    if (action.type === 'fill') {
      const fieldStillVisible = this.pageContainsText(afterState.pageAnalysis, action.target);
      return {
        success: fieldStillVisible || domChanged || urlChanged,
        observed: fieldStillVisible ? 'field-present-after-fill' : (domChanged ? 'dom-change' : 'no-change'),
        reason: fieldStillVisible || domChanged || urlChanged ? '' : `Fill did not produce an observable change for ${action.target}.`
      };
    }

    if (action.type === 'search' || action.type === 'click' || action.type === 'submit') {
      const success = urlChanged || domChanged;
      return {
        success,
        observed: urlChanged ? 'navigation-change' : (domChanged ? 'dom-change' : 'no-change'),
        reason: success ? '' : `${action.type} on "${action.target}" produced no observable page change.`
      };
    }

    return {
      success: true,
      observed: 'analysis-only',
      reason: ''
    };
  }

  pageContainsText(pageAnalysis, value) {
    if (!pageAnalysis || !value) {
      return false;
    }

    const normalized = this.normalizeText(value);
    return (pageAnalysis.elements || []).some((element) => {
      const haystack = this.normalizeText([element.name, element.label, element.text, element.placeholder].filter(Boolean).join(' '));
      return haystack.includes(normalized);
    });
  }

  updateSubgoals(action, assessment, afterState) {
    for (const subgoal of this.subgoals) {
      if (subgoal.status === 'done') {
        continue;
      }

      if (action.type === 'navigate' && subgoal.key === 'navigate' && assessment.success) {
        subgoal.status = 'done';
        subgoal.evidence = afterState.url;
      } else if (action.type === 'search' && subgoal.key === 'search' && assessment.success) {
        subgoal.status = 'done';
        subgoal.evidence = afterState.url || afterState.title;
      } else if (action.type === 'fill' && subgoal.key === `fill:${action.target}` && assessment.success) {
        subgoal.status = 'done';
        subgoal.evidence = `Filled ${action.target}`;
      } else if (action.type === 'click' && subgoal.key === `click:${action.target}` && assessment.success) {
        subgoal.status = 'done';
        subgoal.evidence = afterState.url || afterState.title;
      } else if (action.type === 'submit' && subgoal.key === 'login' && assessment.success) {
        subgoal.status = 'done';
        subgoal.evidence = afterState.url || afterState.title;
      } else if (action.type === 'submit' && subgoal.key === 'signup' && assessment.success) {
        subgoal.status = 'done';
        subgoal.evidence = afterState.url || afterState.title;
      } else if (action.type === 'submit' && subgoal.key === 'submit' && assessment.success) {
        subgoal.status = 'done';
        subgoal.evidence = afterState.url || afterState.title;
      }
    }
  }

  assessCompletion(parsed, blockedReason) {
    const pending = this.subgoals.filter((subgoal) => subgoal.status !== 'done');
    const completed = this.subgoals.filter((subgoal) => subgoal.status === 'done');

    if (blockedReason) {
      return {
        status: completed.length > 0 ? 'partial' : 'blocked',
        reason: blockedReason,
        completedSubgoals: completed.length,
        pendingSubgoals: pending.map((subgoal) => subgoal.label)
      };
    }

    if (pending.length > 0) {
      return {
        status: 'partial',
        reason: 'Command finished with unmet subgoals.',
        completedSubgoals: completed.length,
        pendingSubgoals: pending.map((subgoal) => subgoal.label)
      };
    }

    return {
      status: 'completed',
      reason: 'All explicit subgoals were satisfied.',
      completedSubgoals: completed.length,
      pendingSubgoals: []
    };
  }

  pageSuggestsAuth() {
    const url = (this.page ? this.page.url() : '').toLowerCase();
    return /login|signin|sign-in|auth|register|signup|sign-up/.test(url);
  }

  async executeAction(action, parsed) {
    switch (action.type) {
      case 'navigate':
        await this.performNavigate(action.target, action.reason);
        break;
      case 'click':
        await this.performClick(action.target, action.reason);
        break;
      case 'fill':
        await this.performFill(action.target, action.value, action.reason);
        break;
      case 'search':
        await this.performSearch(action.target, action.reason);
        break;
      case 'submit':
        await this.performSubmit(action.target, action.alternatives || [], action.reason, parsed);
        break;
      case 'analyze':
        this.lastPageAnalysis = await this.safeAnalyzePage();
        this.emitEvent('analysis', {
          message: 'Command was stored, but no deterministic browser action was obvious.',
          page: this.lastPageAnalysis
        });
        break;
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  async performNavigate(url, reason) {
    this.emitEvent('step', {
      action: 'navigate',
      target: url,
      reason
    });

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.humanDelay('navigate');
    this.lastPageAnalysis = await this.safeAnalyzePage();
  }

  async performClick(target, reason) {
    const resolved = await this.resolveClickTarget(target);
    if (!resolved) {
      throw new Error(`Could not find a clickable target for "${target}".`);
    }

    this.emitEvent('step', {
      action: 'click',
      target,
      reason,
      using: resolved.description
    });

    await this.performDeterministicClick(resolved.locator, {
      action: 'click',
      target,
      description: resolved.description
    });
    await this.humanDelay('click');
    this.lastPageAnalysis = await this.safeAnalyzePage();
  }

  async performFill(field, value, reason) {
    const resolved = await this.resolveFieldTarget(field);
    if (!resolved) {
      throw new Error(`Could not find an input for "${field}".`);
    }

    this.emitEvent('step', {
      action: 'fill',
      target: field,
      value,
      reason,
      using: resolved.description
    });

    await this.prepareLocatorForInteraction(resolved.locator);
    await this.performDeterministicClick(resolved.locator, {
      action: 'focus',
      target: field,
      description: resolved.description,
      verifyNavigation: false
    });
    await this.humanDelay('focus');
    await resolved.locator.fill(value, { timeout: 10000 });
    await this.humanDelay('fill');
    this.lastPageAnalysis = await this.safeAnalyzePage();
  }

  async performSearch(query, reason) {
    const resolved = await this.resolveFieldTarget('search');
    if (!resolved) {
      throw new Error('Could not find a search field on the current page.');
    }

    this.emitEvent('step', {
      action: 'search',
      target: query,
      reason,
      using: resolved.description
    });

    await resolved.locator.click({ timeout: 10000 });
    await this.humanDelay('focus');
    await resolved.locator.fill(query, { timeout: 10000 });
    await this.humanDelay('fill');
    this.lastPageAnalysis = await this.safeAnalyzePage();
  }

  async performSubmit(primaryTarget, alternatives, reason, parsed) {
    if (primaryTarget.toLowerCase() === 'search' && parsed.searchQuery) {
      const searchResolved = await this.resolveFieldTarget('search');
      if (searchResolved) {
        this.emitEvent('step', {
          action: 'submit',
          target: 'search',
          reason,
          using: `${searchResolved.description} via search semantics`
        });

        await this.prepareLocatorForInteraction(searchResolved.locator);
        await searchResolved.locator.focus({ timeout: 5000 }).catch(() => {});

        const submittedByEnter = await this.submitClosestFormOrEnter(searchResolved.locator);
        await this.humanDelay('submit');
        this.lastPageAnalysis = await this.safeAnalyzePage();

        this.emitEvent('interaction', {
          action: 'submit',
          target: 'search',
          using: searchResolved.description,
          mode: submittedByEnter
        });
        return;
      }
    }

    const candidates = [primaryTarget, ...alternatives];

    for (const candidate of candidates) {
      const resolved = await this.resolveClickTarget(candidate, { submitOnly: true });
      if (resolved) {
        this.emitEvent('step', {
          action: 'submit',
          target: candidate,
          reason,
          using: resolved.description
        });

        await this.performDeterministicClick(resolved.locator, {
          action: 'submit',
          target: candidate,
          description: resolved.description
        });
        await this.humanDelay('submit');
        this.lastPageAnalysis = await this.safeAnalyzePage();
        return;
      }
    }

    if (parsed.searchQuery) {
      await this.page.keyboard.press('Enter');
      await this.humanDelay('submit');
      this.lastPageAnalysis = await this.safeAnalyzePage();
      this.emitEvent('step', {
        action: 'submit',
        target: 'keyboard-enter',
        reason,
        using: 'keyboard fallback'
      });
      return;
    }

    throw new Error(`Could not find a submit control for "${primaryTarget}".`);
  }

  async submitClosestFormOrEnter(locator) {
    const submitted = await locator.evaluate((element) => {
      const form = element.closest('form');
      if (form && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
        return 'form-requestSubmit';
      }

      if (form && typeof form.submit === 'function') {
        form.submit();
        return 'form-submit';
      }

      return '';
    }).catch(() => '');

    if (submitted) {
      return submitted;
    }

    await this.page.keyboard.press('Enter');
    return 'keyboard-enter';
  }

  async resolveClickTarget(target, options = {}) {
    const analysis = await this.safeAnalyzePage();
    const pageContext = this.inferPageContext(analysis);
    const semanticProfile = this.buildTargetSemanticProfile(target, options, pageContext);
    const regex = this.buildNameRegex(target);
    const candidates = [
      { description: `button role "${target}"`, locator: this.page.getByRole('button', { name: regex }) },
      { description: `link role "${target}"`, locator: this.page.getByRole('link', { name: regex }) },
      { description: `tab role "${target}"`, locator: this.page.getByRole('tab', { name: regex }) },
      { description: `menuitem role "${target}"`, locator: this.page.getByRole('menuitem', { name: regex }) },
      { description: `text match "${target}"`, locator: this.page.locator(`text=/${this.escapeRegex(target)}/i`) },
      { description: `aria-label contains "${target}"`, locator: this.page.locator(`[aria-label*="${this.escapeAttribute(target)}" i]`) }
    ];

    if (options.submitOnly) {
      candidates.unshift({
        description: `submit button "${target}"`,
        locator: this.page.locator('button[type="submit"], input[type="submit"], input[type="image"]')
      });
    }

    if (!options.submitOnly) {
      candidates.push({
        description: `summary text "${target}"`,
        locator: this.page.locator(`summary:has-text("${target}")`)
      });
    }

    for (const candidate of candidates) {
      const match = await this.firstVisible(candidate.locator);
      if (match) {
        return {
          locator: match,
          description: candidate.description
        };
      }
    }

    const element = this.pickBestAnalysisElement(analysis?.elements || [], target, ['button', 'link', 'tab'], {
      submitOnly: options.submitOnly,
      pageContext,
      semanticProfile
    });
    if (element?.selector) {
      return {
        locator: this.page.locator(element.selector).first(),
        description: `analysis selector ${element.selector}`
      };
    }

    return null;
  }

  async resolveFieldTarget(field) {
    const regex = this.buildNameRegex(field);
    const candidates = [
      { description: `label "${field}"`, locator: this.page.getByLabel(regex) },
      { description: `placeholder "${field}"`, locator: this.page.getByPlaceholder(regex) },
      { description: `textbox role "${field}"`, locator: this.page.getByRole('textbox', { name: regex }) },
      { description: `combobox role "${field}"`, locator: this.page.getByRole('combobox', { name: regex }) },
      { description: `name contains "${field}"`, locator: this.page.locator(`[name*="${this.escapeAttribute(field)}" i]`) },
      { description: `id contains "${field}"`, locator: this.page.locator(`[id*="${this.escapeAttribute(field)}" i]`) }
    ];

    if (field.toLowerCase() === 'search') {
      candidates.unshift({
        description: 'searchbox role',
        locator: this.page.getByRole('searchbox')
      });
      candidates.push({
        description: 'input[type="search"]',
        locator: this.page.locator('input[type="search"]')
      });
    }

    for (const candidate of candidates) {
      const match = await this.firstEditable(candidate.locator);
      if (match) {
        return {
          locator: match,
          description: candidate.description
        };
      }
    }

    const analysis = await this.safeAnalyzePage();
    const element = this.pickBestAnalysisElement(analysis?.elements || [], field, ['textbox', 'combobox', 'searchbox']);
    if (element?.selector) {
      return {
        locator: this.page.locator(element.selector).first(),
        description: `analysis selector ${element.selector}`
      };
    }

    return null;
  }

  inferPageContext(pageAnalysis) {
    const elements = pageAnalysis?.elements || [];
    const url = this.normalizeText(pageAnalysis?.url || '');
    const title = this.normalizeText(pageAnalysis?.title || '');
    const authSignals = ['login', 'log in', 'sign in', 'signin', 'password', 'register', 'signup', 'sign up', 'auth'];
    const searchSignals = ['search', 'find', 'look up'];

    const hasPasswordField = elements.some((element) => {
      const haystack = this.normalizeText([element.name, element.label, element.placeholder, element.type].filter(Boolean).join(' '));
      return haystack.includes('password');
    });

    const hasSearchField = elements.some((element) => {
      if (element.role === 'searchbox') {
        return true;
      }

      const haystack = this.normalizeText([element.name, element.label, element.placeholder, element.type].filter(Boolean).join(' '));
      return searchSignals.some((signal) => haystack.includes(this.normalizeText(signal)));
    });

    const hasAuthSignals = hasPasswordField
      || authSignals.some((signal) => url.includes(this.normalizeText(signal)) || title.includes(this.normalizeText(signal)))
      || elements.some((element) => {
        const haystack = this.normalizeText([
          element.name,
          element.label,
          element.placeholder,
          element.text,
          element.containerText
        ].filter(Boolean).join(' '));
        return authSignals.some((signal) => haystack.includes(this.normalizeText(signal)));
      });

    return {
      hasPasswordField,
      hasSearchField,
      hasAuthSignals
    };
  }

  buildTargetSemanticProfile(target, options = {}, pageContext = {}) {
    const normalizedTarget = this.normalizeText(target);
    const authTerms = ['sign in', 'log in', 'login', 'continue', 'verify', 'submit'];
    const signupTerms = ['sign up', 'register', 'create account', 'join'];
    const searchTerms = ['search', 'find', 'go'];

    return {
      isSubmit: Boolean(options.submitOnly),
      isAuthLike: authTerms.some((term) => normalizedTarget.includes(this.normalizeText(term)))
        || (pageContext.hasAuthSignals && normalizedTarget === 'submit'),
      isSignupLike: signupTerms.some((term) => normalizedTarget.includes(this.normalizeText(term))),
      isSearchLike: searchTerms.some((term) => normalizedTarget.includes(this.normalizeText(term)))
    };
  }

  pickBestAnalysisElement(elements, query, allowedRoles, options = {}) {
    const normalizedQuery = this.normalizeText(query);
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const scored = [];
    const semanticProfile = options.semanticProfile || {};
    const pageContext = options.pageContext || {};

    for (const element of elements) {
      if (allowedRoles.length && !allowedRoles.includes(element.role)) {
        continue;
      }

      const haystack = this.normalizeText([
        element.name,
        element.label,
        element.placeholder,
        element.text,
        element.href,
        element.containerText
      ].filter(Boolean).join(' '));

      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += 2;
        }
      }

      if (haystack.includes(normalizedQuery)) {
        score += 4;
      }

      if (element.role === 'button') {
        score += 2;
      }

      if (element.tag === 'button') {
        score += 2;
      }

      if (options.submitOnly) {
        if (element.type === 'submit') {
          score += 6;
        }

        if (element.tag === 'input' && ['submit', 'image', 'button'].includes(element.type)) {
          score += 4;
        }

        if (element.role === 'link') {
          score -= 2;
        }

        if (semanticProfile.isAuthLike) {
          if (pageContext.hasAuthSignals) {
            score += 3;
          }

          if (this.normalizeText(element.containerText).includes('password')) {
            score += 3;
          }
        }

        if (semanticProfile.isSignupLike && this.normalizeText(element.containerText).includes('account')) {
          score += 2;
        }

        if (semanticProfile.isSearchLike && this.normalizeText(element.containerText).includes('search')) {
          score += 2;
        }
      }

      scored.push({ ...element, score });
    }

    scored.sort((left, right) => right.score - left.score);
    const best = scored[0];
    const second = scored[1];

    if (!best || best.score <= 0) {
      return null;
    }

    if (second && best.score < 8 && (best.score - second.score) < 2) {
      return null;
    }

    return best;
  }

  normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  buildNameRegex(value) {
    const tokens = this.normalizeText(value).split(' ').filter(Boolean);
    if (!tokens.length) {
      return /.*/i;
    }

    return new RegExp(tokens.map((token) => this.escapeRegex(token)).join('.*'), 'i');
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  escapeAttribute(value) {
    return String(value).replace(/["\\]/g, '\\$&');
  }

  async firstVisible(locator) {
    try {
      const count = await locator.count();
      for (let index = 0; index < Math.min(count, 5); index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible().catch(() => false)) {
          return candidate;
        }
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  async firstEditable(locator) {
    try {
      const count = await locator.count();
      for (let index = 0; index < Math.min(count, 5); index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        const editable = await candidate.isEditable().catch(() => false);
        if (visible && editable) {
          return candidate;
        }
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  async prepareLocatorForInteraction(locator) {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.waitForTimeout(150);
  }

  async performDeterministicClick(locator, metadata = {}) {
    const beforeUrl = this.page.url();
    const beforeTitle = await this.page.title().catch(() => '');
    const methods = [
      async () => {
        await this.prepareLocatorForInteraction(locator);
        await locator.click({ timeout: 10000, trial: true });
        await locator.click({ timeout: 10000 });
        return 'locator-click';
      },
      async () => {
        await this.prepareLocatorForInteraction(locator);
        const box = await locator.boundingBox();
        if (!box) {
          throw new Error('No bounding box available for mouse click fallback.');
        }

        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await this.page.waitForTimeout(100);
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        return 'mouse-click';
      },
      async () => {
        await this.prepareLocatorForInteraction(locator);
        await locator.focus({ timeout: 5000 }).catch(() => {});
        await this.page.keyboard.press('Enter');
        return 'keyboard-enter';
      },
      async () => {
        await this.prepareLocatorForInteraction(locator);
        await locator.focus({ timeout: 5000 }).catch(() => {});
        await this.page.keyboard.press('Space');
        return 'keyboard-space';
      }
    ];

    let lastError = null;

    for (const method of methods) {
      try {
        const mode = await method();
        const verified = await this.verifyInteractionResult(locator, {
          beforeUrl,
          beforeTitle,
          verifyNavigation: metadata.verifyNavigation !== false
        });

        this.emitEvent('interaction', {
          action: metadata.action || 'click',
          target: metadata.target || '',
          using: metadata.description || '',
          mode,
          verified
        });

        return;
      } catch (error) {
        lastError = error;
        this.emitEvent('interaction', {
          action: metadata.action || 'click',
          target: metadata.target || '',
          using: metadata.description || '',
          mode: 'retry',
          error: error.message
        });
      }
    }

    throw new Error(`Deterministic click failed for "${metadata.target || 'target'}": ${lastError ? lastError.message : 'Unknown click failure.'}`);
  }

  async verifyInteractionResult(locator, options = {}) {
    await this.page.waitForTimeout(250);

    const afterUrl = this.page.url();
    const afterTitle = await this.page.title().catch(() => '');
    if (options.verifyNavigation !== false && (afterUrl !== options.beforeUrl || afterTitle !== options.beforeTitle)) {
      return {
        changed: 'navigation',
        beforeUrl: options.beforeUrl,
        afterUrl
      };
    }

    const focused = await locator.evaluate((element) => document.activeElement === element).catch(() => false);
    if (focused) {
      return {
        changed: 'focus'
      };
    }

    const ariaPressed = await locator.getAttribute('aria-pressed').catch(() => null);
    if (ariaPressed !== null) {
      return {
        changed: 'aria-pressed',
        value: ariaPressed
      };
    }

    const disabled = await locator.isDisabled().catch(() => false);
    return {
      changed: disabled ? 'state-change' : 'no-obvious-change'
    };
  }

  async safeAnalyzePage() {
    if (!this.page || this.page.isClosed()) {
      return null;
    }

    try {
      return await this.page.evaluate((limit) => {
        const roleMap = {
          A: 'link',
          BUTTON: 'button',
          INPUT: 'textbox',
          SELECT: 'combobox',
          TEXTAREA: 'textbox'
        };

        const labelFor = (element) => {
          if (!element) {
            return '';
          }

          if (element.labels && element.labels.length > 0) {
            return Array.from(element.labels).map((label) => label.innerText.trim()).join(' ');
          }

          if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            return label ? label.innerText.trim() : '';
          }

          return '';
        };

        const containerText = (element) => {
          if (!element || !element.closest) {
            return '';
          }

          const container = element.closest('form, dialog, [role="dialog"], nav, header, main, section, article');
          if (!container) {
            return '';
          }

          return (container.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 160);
        };

        const cssPath = (element) => {
          if (!element || !element.tagName) {
            return '';
          }

          if (element.id) {
            return `#${CSS.escape(element.id)}`;
          }

          if (element.getAttribute('name')) {
            return `${element.tagName.toLowerCase()}[name="${CSS.escape(element.getAttribute('name'))}"]`;
          }

          const classes = Array.from(element.classList || []).slice(0, 2).map((item) => `.${CSS.escape(item)}`).join('');
          return `${element.tagName.toLowerCase()}${classes}`;
        };

        const nodes = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role], summary, [contenteditable="true"]'));
        const elements = [];

        for (const node of nodes) {
          if (elements.length >= limit) {
            break;
          }

          const rect = node.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          if (!visible) {
            continue;
          }

          const role = (node.getAttribute('role') || roleMap[node.tagName] || '').toLowerCase() || (node.type === 'search' ? 'searchbox' : '');
          elements.push({
            role: role || 'generic',
            tag: node.tagName.toLowerCase(),
            type: (node.getAttribute('type') || '').toLowerCase(),
            name: (node.getAttribute('aria-label') || node.innerText || node.value || '').trim().slice(0, 100),
            label: labelFor(node).slice(0, 100),
            placeholder: (node.getAttribute('placeholder') || '').trim().slice(0, 100),
            text: (node.innerText || '').trim().slice(0, 100),
            containerText: containerText(node),
            href: node.href || '',
            selector: cssPath(node)
          });
        }

        return {
          url: window.location.href,
          title: document.title,
          elements
        };
      }, MAX_INTERACTIVE_ELEMENTS);
    } catch (error) {
      return {
        url: this.page.url(),
        title: await this.page.title().catch(() => ''),
        elements: [],
        error: error.message
      };
    }
  }

  async humanDelay(kind) {
    const delayMap = {
      navigate: 1400,
      click: 900,
      focus: 500,
      fill: 850,
      submit: 1300
    };

    const duration = delayMap[kind] || 800;
    this.emitEvent('delay', {
      kind,
      durationMs: duration
    });
    await this.page.waitForTimeout(duration);
  }
}

module.exports = new PlaywrightAutomationService();
