const sourceCode = document.querySelector('#code');
const outputCode = document.querySelector('#encode');
const sourceLines = document.querySelector('#source-lines');
const outputLines = document.querySelector('#output-lines');
const sourceStats = document.querySelector('#source-stats');
const outputStats = document.querySelector('#output-stats');
const outputStatus = document.querySelector('#output-status');
const outputEmpty = document.querySelector('#output-empty');
const transformOverlay = document.querySelector('#transform-overlay');
const obfuscateButton = document.querySelector('#obfuscate');
const studioShell = document.querySelector('#studio-shell');
const moduleInputs = [...document.querySelectorAll('input[name="module"]')];
const presetButtons = [...document.querySelectorAll('[data-preset]')];
const pipelineSteps = [...document.querySelectorAll('.pipeline span')];
const toast = document.querySelector('#toast');
const toastMessage = document.querySelector('#toast-message');
let toastTimer;

const presets = {
  light: new Set(['stringUnicode', 'memberExpression', 'renameLocals']),
  balanced: new Set([
    'stringArray',
    'stringReverse',
    'stringUnicode',
    'memberExpression',
    'numericLiteral',
    'binaryExpression',
    'booleanLiteral',
    'assignmentJunk',
    'zombieCode',
    'renameLocals'
  ]),
  maximum: new Set([
    'stringArray',
    'stringReverse',
    'stringUnicode',
    'memberExpression',
    'numericLiteral',
    'binaryExpression',
    'booleanLiteral',
    'assignmentJunk',
    'zombieCode',
    'controlFlow',
    'eval',
    'renameGlobals',
    'renameLocals',
    'compact'
  ])
};

const lineMarkup = (value) => Array.from({ length: Math.max(1, value.split('\n').length) }, (_, index) => index + 1).join('<br>');

function updateSource() {
  const count = sourceCode.value.split('\n').length;
  sourceLines.innerHTML = lineMarkup(sourceCode.value);
  sourceStats.textContent = `${count} lines · ${sourceCode.value.length} chars`;
}

function activeModules() {
  return new Set(moduleInputs.filter((input) => input.checked).map((input) => input.value));
}

function bundleOptions() {
  const active = activeModules();
  return {
    stringArray: active.has('stringArray'),
    stringReverse: active.has('stringReverse'),
    stringUnicode: active.has('stringUnicode'),
    memberExpression: active.has('memberExpression'),
    numericLiteral: active.has('numericLiteral'),
    binaryExpression: active.has('binaryExpression'),
    booleanLiteral: active.has('booleanLiteral'),
    assignmentJunk: active.has('assignmentJunk'),
    zombieCode: active.has('zombieCode'),
    controlFlow: active.has('controlFlow'),
    eval: active.has('eval'),
    renameGlobals: active.has('renameGlobals'),
    renameLocals: active.has('renameLocals'),
    comments: active.has('comments'),
    compact: active.has('compact')
  };
}

function updateProfile(name) {
  const count = moduleInputs.filter((input) => input.checked).length;
  const score = Math.min(98, 36 + count * 3.4);
  const labels = { light: 'Light', balanced: 'Balanced', maximum: 'Maximum', custom: 'Custom' };
  document.querySelector('#module-count').textContent = `${count} / ${moduleInputs.length}`;
  document.querySelector('#strength-value').textContent = Math.round(score);
  document.querySelector('.strength-orb').style.background = `conic-gradient(var(--blue) 0 ${score}%, #dce1e9 ${score}%)`;
  document.querySelector('#strength-label').textContent = labels[name] || labels.custom;
  document.querySelector('#size-impact').textContent = `+${Math.round(count * 1.8)}%`;
  presetButtons.forEach((button) => button.classList.toggle('active', button.dataset.preset === name));
}

function applyPreset(name) {
  const preset = presets[name];
  moduleInputs.forEach((input) => {
    input.checked = preset.has(input.value);
  });
  updateProfile(name);
}

function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

window.alert = (message) => showToast(String(message));

sourceCode.addEventListener('input', updateSource);
sourceCode.addEventListener('scroll', () => { sourceLines.scrollTop = sourceCode.scrollTop; });
outputCode.addEventListener('scroll', () => { outputLines.scrollTop = outputCode.scrollTop; });

moduleInputs.forEach((input) => input.addEventListener('change', () => updateProfile('custom')));
presetButtons.forEach((button) => button.addEventListener('click', () => applyPreset(button.dataset.preset)));

document.querySelector('#clear-button').addEventListener('click', () => {
  sourceCode.value = '';
  updateSource();
  sourceCode.focus();
  showToast('Source cleared');
});

document.querySelector('#upload-button').addEventListener('click', () => document.querySelector('#file-input').click());
document.querySelector('#file-input').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return showToast('Choose a file smaller than 2 MB');
  sourceCode.value = await file.text();
  updateSource();
  showToast(`${file.name} imported`);
});

obfuscateButton.addEventListener('click', () => {
  const source = sourceCode.value.trim();
  if (!source) {
    sourceCode.focus();
    showToast('Add JavaScript source first');
    return;
  }
  studioShell.classList.remove('complete');
  studioShell.classList.add('processing');
  obfuscateButton.classList.add('processing');
  transformOverlay.classList.add('active');
  outputEmpty.classList.add('hidden');
  outputStatus.textContent = 'PROCESSING';
  pipelineSteps.forEach((step) => step.classList.remove('current'));
  pipelineSteps[1]?.classList.add('done');
  pipelineSteps[2]?.classList.add('current');

  setTimeout(() => {
    try {
      const engine = window.JavaScriptObfuscatorLite;
      if (!engine || typeof engine.obfuscate !== 'function') {
        throw new Error('The obfuscation engine did not load. Refresh the page and try again.');
      }
      const result = engine.obfuscate(source, bundleOptions());
      if (!result) throw new Error('The source could not be obfuscated. Check its syntax and try again.');
      outputCode.value = result;
      outputLines.innerHTML = lineMarkup(result);
      outputStats.textContent = `${result.split('\n').length} lines · ${result.length} chars`;
      outputStatus.textContent = 'COMPLETE';
      studioShell.classList.add('complete');
      pipelineSteps[2]?.classList.remove('current');
      pipelineSteps[2]?.classList.add('done');
      showToast('Obfuscated JavaScript generated');
      setTimeout(() => studioShell.classList.remove('complete'), 900);
    } catch (error) {
      outputStatus.textContent = 'ERROR';
      outputEmpty.classList.remove('hidden');
      pipelineSteps[2]?.classList.remove('current');
      showToast(error.message || 'Unable to obfuscate this source');
    } finally {
      transformOverlay.classList.remove('active');
      obfuscateButton.classList.remove('processing');
      studioShell.classList.remove('processing');
    }
  }, 520);
});

document.querySelector('#copy-button').addEventListener('click', async () => {
  if (!outputCode.value) return showToast('Generate an artifact first');
  try {
    await navigator.clipboard.writeText(outputCode.value);
  } catch {
    outputCode.select();
    document.execCommand('copy');
  }
  showToast('Artifact copied to clipboard');
});

document.querySelector('#download-button').addEventListener('click', () => {
  if (!outputCode.value) return showToast('Generate an artifact first');
  const blob = new Blob([outputCode.value], { type: 'text/javascript;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'protected.js';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('protected.js exported');
});

document.querySelector('#menu-toggle').addEventListener('click', (event) => {
  const navigation = document.querySelector('.site-header nav');
  const open = navigation.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.site-header nav a').forEach((link) => link.addEventListener('click', () => document.querySelector('.site-header nav').classList.remove('open')));

window.addEventListener('load', () => {
  const pageLoader = document.querySelector('#page-loader');
  window.setTimeout(() => {
    document.body.classList.remove('is-loading');
    pageLoader?.classList.add('is-complete');
  }, 320);
}, { once: true });

const cursorLight = document.querySelector('#cursor-light');
const prismStage = document.querySelector('#prism-stage');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion) {
  window.addEventListener('pointermove', (event) => {
    cursorLight.style.transform = `translate(${event.clientX - 210}px,${event.clientY - 210}px)`;
  }, { passive: true });
  prismStage.addEventListener('pointermove', (event) => {
    const bounds = prismStage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    prismStage.style.transform = `perspective(1000px) rotateX(${-y * 2.4}deg) rotateY(${x * 2.4}deg)`;
  }, { passive: true });
  prismStage.addEventListener('pointerleave', () => { prismStage.style.transform = ''; });
}

const revealItems = [...document.querySelectorAll('.section-heading, .studio-shell, .process-intro, .process-flow article, .trust-bar > div, .continuum-intro, .continuum-field, .anti-ai-card, .credit-rail')];
revealItems.forEach((item, index) => {
  item.dataset.reveal = '';
  item.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
});
if ('IntersectionObserver' in window && !reducedMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .08, rootMargin: '0px 0px -40px' });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#session-id').textContent = `JS—${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
const engine = window.JavaScriptObfuscatorLite;
const engineVersion = document.querySelector('#engine-version');
if (engine && engineVersion) engineVersion.textContent = `v${engine.version}`;
updateSource();
applyPreset('balanced');
