const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const cfgPath = path.resolve(__dirname, '..', 'chatbot.config.yaml');
const txt = fs.readFileSync(cfgPath, 'utf8');
const cfg = yaml.load(txt);

function evaluateRules(text) {
  const rules = (cfg.personality && cfg.personality.rules) || [];
  const responseSets = cfg.response_sets || {};

  const results = { localReplies: [], injectedHints: [], calledEndpoint: true };

  for (const rule of rules) {
    try {
      let matched = false;
      if (rule.match_regex) {
        const re = new RegExp(rule.match_regex, 'i');
        matched = re.test(text);
      } else if (rule.match) {
        matched = text.toLowerCase().includes(String(rule.match).toLowerCase());
      }
      if (!matched) continue;

      const action = rule.action || 'reply';
      let responseText = null;
      if (rule.response) {
        if (typeof rule.response === 'string') responseText = rule.response;
        else if (rule.response.response_set) {
          const set = responseSets[rule.response.response_set] || [];
          if (Array.isArray(set) && set.length) responseText = set[Math.floor(Math.random() * set.length)];
        }
      }

      if (action === 'reply' && responseText) {
        results.localReplies.push(responseText);
        const stop = rule.stop_propagation !== false;
        if (stop) { results.calledEndpoint = false; }
      }

      if (action === 'inject') {
        if (responseText) results.injectedHints.push(responseText);
        else results.injectedHints.push(rule.match || rule.name || '');
      }
    } catch (e) {
      console.warn('Rule eval error', e);
    }
  }

  return results;
}

const tests = [
  'Architect',
  'projects',
  'Forge',
  'Tell me about the architect and the forge',
  'architectural planning',
  'How much do you charge for projects?',
  'archtect',            // typo (should fuzzy-match to architect if threshold lowered)
  'architctural',       // typo + longer form
  'forg',                // typo for forge
  "Architect please give me a long Wikipedia-style overview of the Architect and its history",
];

// test post processing
const longWiki = "According to Wikipedia, the Architect is a concept with a long history. " +
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
console.log('---');
console.log('Post-process sample (should be shortened + CTA):');
console.log(postProcessResponseSim(longWiki, cfg));


// small helper to test postProcessResponse behaviour mirrored from the client code
function postProcessResponseSim(text, cfg) {
  const maxLen = cfg.max_response_length || 300;
  const shorten = (cfg.shorten_policy !== undefined) ? cfg.shorten_policy : true;
  const ctaText = cfg.cta_text || '';
  const ctaUrl = cfg.cta_url || '';
  const cta = ctaText ? ('\n\n' + ctaText + ' ' + ctaUrl) : '';
  const epicRegex = /\b(Wikipedia|According to|In \d{4}|References|Source:|Citation:|For example)\b/i;
  if ((shorten && text.length > maxLen) || epicRegex.test(text)) {
    const short = text.slice(0, maxLen).trim();
    return short + '...' + cta;
  }
  return text;
}


for (const t of tests) {
  const r = evaluateRules(t);
  console.log('---');
  console.log('Input:', t);
  console.log('Local replies:', r.localReplies.length ? r.localReplies : '(none)');
  console.log('Injected hints:', r.injectedHints.length ? r.injectedHints : '(none)');
  console.log('Endpoint will be called?', r.calledEndpoint);
}
