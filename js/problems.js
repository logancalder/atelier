const PROBLEMS = [
  {
    id: 'two-sum-ii',
    title: 'Two Sum II - Input Array Is Sorted',
    difficulty: 'Medium',
    functionName: 'twoSum',
    description: [
      'Given an array of integers numbers sorted in non-decreasing order, return the indices (1-indexed) of two numbers that add up to target.',
      'You may not use the same element twice, and there is exactly one valid solution.',
      'Your solution should use constant extra space.'
    ],
    examples: [
      {
        input: 'numbers = [2,7,11,15], target = 9',
        output: '[1,2]'
      },
      {
        input: 'numbers = [2,3,4], target = 6',
        output: '[1,3]'
      },
      {
        input: 'numbers = [-1,0], target = -1',
        output: '[1,2]'
      }
    ],
    constraints: [
      '2 <= numbers.length <= 30000',
      '-1000 <= numbers[i] <= 1000',
      'numbers is sorted in non-decreasing order',
      '-1000 <= target <= 1000'
    ],
    starter: {
      python: [
        'class Solution:',
        '    def twoSum(self, numbers, target):',
        '        left, right = 0, len(numbers) - 1',
        '        while left < right:',
        '            total = numbers[left] + numbers[right]',
        '            if total == target:',
        '                return [left + 1, right + 1]',
        '            if total < target:',
        '                left += 1',
        '            else:',
        '                right -= 1'
      ].join('\n'),
      javascript: [
        'function twoSum(numbers, target) {',
        '  let left = 0;',
        '  let right = numbers.length - 1;',
        '',
        '  while (left < right) {',
        '    const total = numbers[left] + numbers[right];',
        '    if (total === target) return [left + 1, right + 1];',
        '    if (total < target) left += 1;',
        '    else right -= 1;',
        '  }',
        '}'
      ].join('\n')
    },
    tests: [
      { name: 'Example 1', input: { numbers: [2, 7, 11, 15], target: 9 }, expected: [1, 2], hidden: false },
      { name: 'Example 2', input: { numbers: [2, 3, 4], target: 6 }, expected: [1, 3], hidden: false },
      { name: 'Example 3', input: { numbers: [-1, 0], target: -1 }, expected: [1, 2], hidden: false },
      { name: 'Hidden A', input: { numbers: [1, 2, 3, 4, 6], target: 8 }, expected: [2, 5], hidden: true },
      { name: 'Hidden B', input: { numbers: [1, 5, 9, 14, 20], target: 23 }, expected: [2, 4], hidden: true }
    ]
  }
];

const state = {
  problemId: PROBLEMS[0].id,
  language: 'python',
  codeByProblem: {},
  pyodide: null,
  pyodideReady: false,
  running: false
};

const $ = (id) => document.getElementById(id);

function init() {
  hydrateProblemSelect();
  bindEvents();
  loadProblem(PROBLEMS[0].id);
}

function hydrateProblemSelect() {
  const select = $('problem-select');
  select.innerHTML = PROBLEMS.map((p) => `<option value="${p.id}">${p.title}</option>`).join('');
}

function bindEvents() {
  $('problem-select').addEventListener('change', (e) => {
    loadProblem(e.target.value);
  });

  $('language-select').addEventListener('change', (e) => {
    state.language = e.target.value;
    syncEditorWithState();
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('btn-run').addEventListener('click', async () => {
    await runTestSuite(false);
  });

  $('btn-submit').addEventListener('click', async () => {
    await runTestSuite(true);
  });

  $('btn-run-custom').addEventListener('click', async () => {
    await runCustom();
  });

  $('btn-reset').addEventListener('click', () => {
    const problem = getCurrentProblem();
    const key = getCodeKey(problem.id, state.language);
    state.codeByProblem[key] = problem.starter[state.language];
    $('code-editor').value = state.codeByProblem[key];
    updateStatus('Starter code restored');
  });

  $('code-editor').addEventListener('input', (e) => {
    const problem = getCurrentProblem();
    state.codeByProblem[getCodeKey(problem.id, state.language)] = e.target.value;
  });
}

function loadProblem(problemId) {
  state.problemId = problemId;
  const problem = getCurrentProblem();

  $('problem-select').value = problem.id;
  $('problem-title').textContent = problem.title;
  $('problem-difficulty').textContent = problem.difficulty;

  $('tab-description').innerHTML = problem.description.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  $('tab-examples').innerHTML = problem.examples.map((ex, i) => {
    return [
      `<div class="example-box">`,
      `<div>Example ${i + 1}</div>`,
      `<div>Input: ${escapeHtml(ex.input)}</div>`,
      `<div>Output: ${escapeHtml(ex.output)}</div>`,
      `</div>`
    ].join('');
  }).join('');
  $('tab-constraints').innerHTML = `<ul>${problem.constraints.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`;

  renderTestList(problem.tests.filter((t) => !t.hidden));
  switchTab('description');
  syncEditorWithState();
  updateStatus('Ready');
  $('output-panel').textContent = 'Run tests to see output...';
}

function syncEditorWithState() {
  const problem = getCurrentProblem();
  const key = getCodeKey(problem.id, state.language);
  if (!state.codeByProblem[key]) {
    state.codeByProblem[key] = problem.starter[state.language];
  }
  $('code-editor').value = state.codeByProblem[key];
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  ['description', 'examples', 'constraints'].forEach((name) => {
    $('tab-' + name).classList.toggle('hidden', name !== tabName);
  });
}

function renderTestList(tests) {
  const list = $('test-list');
  list.innerHTML = tests.map((t) => {
    return [
      '<div class="test-case-item" data-case="' + escapeHtml(t.name) + '">',
      '<div class="test-name">' + escapeHtml(t.name) + '</div>',
      '<div>input = ' + escapeHtml(JSON.stringify(t.input)) + '</div>',
      '<div>expected = ' + escapeHtml(JSON.stringify(t.expected)) + '</div>',
      '</div>'
    ].join('');
  }).join('');
  $('test-summary').textContent = `0 / ${tests.length} passed`;
}

async function runTestSuite(includeHidden) {
  if (state.running) return;

  const problem = getCurrentProblem();
  const tests = includeHidden ? problem.tests : problem.tests.filter((t) => !t.hidden);

  setRunning(true);
  updateStatus(includeHidden ? 'Submitting...' : 'Running tests...');

  const results = [];
  for (const test of tests) {
    const result = await executeUserCode(problem, test.input);
    const pass = result.ok && deepEqual(result.value, test.expected);

    results.push({
      name: test.name,
      hidden: test.hidden,
      pass,
      expected: test.expected,
      received: result.ok ? result.value : null,
      error: result.ok ? '' : result.error
    });
  }

  setRunning(false);
  renderSuiteResult(results, includeHidden);
}

function renderSuiteResult(results, includeHidden) {
  const visibleResults = results.filter((r) => !r.hidden);
  const passed = results.filter((r) => r.pass).length;

  $('test-summary').textContent = `${visibleResults.filter((r) => r.pass).length} / ${visibleResults.length} passed`;

  document.querySelectorAll('.test-case-item').forEach((el) => {
    const name = el.getAttribute('data-case');
    const match = visibleResults.find((r) => r.name === name);
    if (!match) return;

    el.classList.remove('pass', 'fail');
    el.classList.add(match.pass ? 'pass' : 'fail');
  });

  if (includeHidden) {
    if (passed === results.length) {
      $('output-panel').innerHTML = `<span class="output-good">Accepted: ${passed}/${results.length} tests passed.</span>`;
      updateStatus('Accepted');
    } else {
      const firstFail = results.find((r) => !r.pass);
      $('output-panel').innerHTML = [
        `<span class="output-bad">Wrong Answer: ${passed}/${results.length} tests passed.</span>`,
        firstFail && firstFail.error ? `\nError: ${escapeHtml(firstFail.error)}` : '',
        firstFail && !firstFail.error ? `\nExpected: ${escapeHtml(JSON.stringify(firstFail.expected))}` : '',
        firstFail && !firstFail.error ? `\nReceived: ${escapeHtml(JSON.stringify(firstFail.received))}` : ''
      ].join('');
      updateStatus('Try again');
    }
    return;
  }

  const firstFail = results.find((r) => !r.pass);
  if (firstFail) {
    const failMessage = firstFail.error
      ? `Error in ${firstFail.name}: ${firstFail.error}`
      : `${firstFail.name} failed. Expected ${JSON.stringify(firstFail.expected)} but got ${JSON.stringify(firstFail.received)}`;
    $('output-panel').innerHTML = `<span class="output-bad">${escapeHtml(failMessage)}</span>`;
    updateStatus('Test failed');
  } else {
    $('output-panel').innerHTML = `<span class="output-good">Nice. All visible tests passed.</span>`;
    updateStatus('Tests passed');
  }
}

async function runCustom() {
  const problem = getCurrentProblem();
  let payload;

  try {
    payload = JSON.parse($('custom-input').value);
  } catch {
    $('output-panel').innerHTML = '<span class="output-bad">Custom input must be valid JSON.</span>';
    return;
  }

  const result = await executeUserCode(problem, payload);

  if (!result.ok) {
    $('output-panel').innerHTML = `<span class="output-bad">Runtime error: ${escapeHtml(result.error)}</span>`;
    return;
  }

  $('output-panel').innerHTML = `<span class="output-good">Output:</span> ${escapeHtml(JSON.stringify(result.value))}`;
}

async function executeUserCode(problem, inputObject) {
  const code = $('code-editor').value;

  try {
    if (state.language === 'javascript') {
      const output = runJavaScript(code, problem.functionName, inputObject);
      return { ok: true, value: output };
    }

    const output = await runPython(code, problem.functionName, inputObject);
    return { ok: true, value: output };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

function runJavaScript(code, functionName, inputObject) {
  const runner = new Function(
    'input',
    [
      '"use strict";',
      code,
      'let callable = null;',
      `if (typeof ${functionName} === "function") callable = ${functionName};`,
      `else if (typeof Solution === "function" && typeof new Solution().${functionName} === "function") callable = new Solution().${functionName}.bind(new Solution());`,
      'if (!callable) throw new Error("Define function ' + functionName + '(...) or class Solution with that method.");',
      'return callable(input.numbers, input.target);'
    ].join('\n')
  );

  return runner(inputObject);
}

async function runPython(code, functionName, inputObject) {
  const pyodide = await ensurePyodide();
  pyodide.globals.set('__user_code', code);
  pyodide.globals.set('__input_obj', inputObject);
  pyodide.globals.set('__func_name', functionName);

  const outputText = await pyodide.runPythonAsync(`
import json

ns = {}
exec(__user_code, ns)

fn = None
if __func_name in ns and callable(ns[__func_name]):
    fn = ns[__func_name]
elif 'Solution' in ns:
    sol = ns['Solution']()
    if hasattr(sol, __func_name):
        fn = getattr(sol, __func_name)

if fn is None:
    raise Exception(f"Define function {__func_name}(...) or class Solution with that method.")

result = fn(__input_obj['numbers'], __input_obj['target'])
json.dumps(result)
`);

  return JSON.parse(outputText);
}

async function ensurePyodide() {
  if (state.pyodideReady) return state.pyodide;

  updateStatus('Loading Python runtime...');

  if (!window.loadPyodide) {
    await injectScript('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
  }

  state.pyodide = await window.loadPyodide();
  state.pyodideReady = true;
  updateStatus('Python runtime ready');
  return state.pyodide;
}

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load runtime script'));
    document.head.appendChild(script);
  });
}

function setRunning(isRunning) {
  state.running = isRunning;
  $('btn-run').disabled = isRunning;
  $('btn-submit').disabled = isRunning;
  $('btn-run-custom').disabled = isRunning;
}

function updateStatus(text) {
  $('status-text').textContent = text;
}

function getCurrentProblem() {
  return PROBLEMS.find((p) => p.id === state.problemId);
}

function getCodeKey(problemId, language) {
  return `${problemId}::${language}`;
}

function deepEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual(a[k], b[k]));
  }

  return a === b;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

init();
