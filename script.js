// Set the year automatically in the footer
document.getElementById('year').textContent = new Date().getFullYear();

// Ambient snow effect
(function snow(){
  const layer = document.getElementById('snow');
  const count = window.innerWidth < 480 ? 22 : 40;
  for (let i = 0; i < count; i++) {
    const flake = document.createElement('span');
    const size = (Math.random() * 3 + 1.5).toFixed(1);
    const duration = (Math.random() * 10 + 10).toFixed(1);
    const delay = (Math.random() * -20).toFixed(1);
    const drift = (Math.random() * 80 - 40).toFixed(0);
    
    flake.className = 'flake';
    flake.style.left = Math.random() * 100 + 'vw';
    flake.style.width = size + 'px';
    flake.style.height = size + 'px';
    flake.style.setProperty('--drift', drift + 'px');
    flake.style.animationDuration = duration + 's';
    flake.style.animationDelay = delay + 's';
    
    layer.appendChild(flake);
  }
})();

// Toast notifications
const toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(html) {
  toastEl.innerHTML = html;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// Discord tag copy-to-clipboard
const DISCORD_TAG = 'whaledone';
document.getElementById('discord-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(DISCORD_TAG);
  } catch (e) {
    // Fallback for older browsers
    const tmp = document.createElement('textarea');
    tmp.value = DISCORD_TAG;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    document.body.removeChild(tmp);
  }
  showToast(`Discord copied — <strong>${DISCORD_TAG}</strong>`);
});

// Coming soon buttons
function comingSoon(label) {
  showToast(`<strong>${label}</strong> — coming soon`);
}
document.getElementById('instagram-btn').addEventListener('click', () => comingSoon('Instagram'));
document.getElementById('ebay-btn').addEventListener('click', () => comingSoon('eBay'));
document.getElementById('site-btn').addEventListener('click', () => showToast('New site incoming — stay tuned'));

// Footer buttons (email & github)
document.getElementById('email-btn').addEventListener('click', () => {
  showToast('no email yet');
});

document.getElementById('github-btn-text').addEventListener('click', () => {
  window.open('https://github.com/ItsWhaleDone', '_blank', 'noopener');
});

// Audio player
(function audioPlayer(){
  const audio = document.getElementById('audio-player');
  const playBtn = document.getElementById('play-btn');
  const waveform = document.getElementById('waveform');
  if (!audio || !playBtn || !waveform) return;

  const iconPlay = playBtn.querySelector('.icon-play');
  const iconPause = playBtn.querySelector('.icon-pause');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');

  // Generate waveform bars
  const BAR_COUNT = 56;
  const bars = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('span');
    bar.className = 'bar';
    
    // Taller bars in the middle, shorter on the edges for a natural look
    const mid = BAR_COUNT / 2;
    const distFromMid = Math.abs(i - mid) / mid;
    const base = 30 + Math.random() * 70;
    const height = Math.max(15, base * (1 - distFromMid * 0.4));
    
    bar.style.height = height.toFixed(0) + '%';
    waveform.appendChild(bar);
    bars.push(bar);
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function setPlayingUI(isPlaying) {
    iconPlay.hidden = isPlaying;
    iconPause.hidden = !isPlaying;
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  }

  function updateWaveform(ratio) {
    const activeCount = Math.round(ratio * BAR_COUNT);
    bars.forEach((bar, i) => bar.classList.toggle('played', i < activeCount));
  }

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      const playPromise = audio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch((err) => {
          console.error('Audio play failed:', err);
          showToast('Impossible de lire le morceau — vérifie assets/musique.mp3');
        });
      }
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', () => setPlayingUI(true));
  audio.addEventListener('pause', () => setPlayingUI(false));

  audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    timeCurrent.textContent = formatTime(audio.currentTime);
    if (audio.duration) updateWaveform(audio.currentTime / audio.duration);
  });

  audio.addEventListener('error', () => {
    showToast('Fichier audio introuvable — vérifie assets/musique.mp3');
  });

  // Seeking functionality
  function seek(e) {
    const rect = waveform.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    if (audio.duration) audio.currentTime = ratio * audio.duration;
    updateWaveform(ratio);
  }
  waveform.addEventListener('click', seek);
})();

// Terminal emulator
(function terminal(){
  const outputEl = document.getElementById('term-output');
  const inputEl = document.getElementById('term-input');
  const typedEl = document.getElementById('term-typed');
  const bodyEl = document.getElementById('term-body');
  if (!inputEl) return;

  const PROMPT = 'root@whaledone:~$';
  const history = [];
  let historyIndex = -1;

  // Command queue to prevent freezing when spamming input
  const cmdQueue = [];
  let isProcessing = false;
  const MAX_QUEUE = 25;

  function enqueue(raw) {
    if (cmdQueue.length >= MAX_QUEUE) return;
    cmdQueue.push(raw);
    processQueue();
  }

  async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;
    while (cmdQueue.length) {
      const next = cmdQueue.shift();
      await run(next);
    }
    isProcessing = false;
  }

  // File contents
  const files = {
    'about.txt': 'Building things, Catching Pokemons, Eating sushis.\nRepeating the process. \nSegfaulting my way to success.',
    'links.txt': 'discord   -> run: discord\nsteam     -> run: steam\ninstagram -> coming soon\nebay      -> coming soon',
    'music.txt': 'PNL - La Misere Est Si Belle (on repeat, obviously)'
  };

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  const MAX_LINES = 300;

  function trimOutput() {
    while (outputEl.children.length > MAX_LINES) {
      outputEl.removeChild(outputEl.firstChild);
    }
  }

  function makeLine() {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.style.color = 'var(--frost-dim)';
    outputEl.appendChild(line);
    trimOutput();
    return line;
  }

  function scrollDown() { bodyEl.scrollTop = bodyEl.scrollHeight; }

  function typeInto(el, text, speed) {
    return new Promise((resolve) => {
      let i = 0;
      const timer = setInterval(() => {
        i++;
        el.textContent = text.slice(0, i);
        scrollDown();
        if (i >= text.length) { clearInterval(timer); resolve(); }
      }, speed);
    });
  }

  function deleteFrom(el, speed) {
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const cur = el.textContent;
        if (cur.length === 0) { clearInterval(timer); resolve(); return; }
        el.textContent = cur.slice(0, -1);
        scrollDown();
      }, speed);
    });
  }

  function printCommand(cmd) {
    const line = document.createElement('div');
    line.className = 'term-line';
    const promptSpan = document.createElement('span');
    promptSpan.className = 'term-prompt';
    promptSpan.textContent = PROMPT;
    line.appendChild(promptSpan);
    line.appendChild(document.createTextNode(cmd));
    outputEl.appendChild(line);
    trimOutput();
    scrollDown();
  }

  // Command definitions
  const commands = {
    help() {
      return [
        'available commands:',
        '  help            show this list',
        '  whoami          who runs this terminal',
        '  about           quick bio',
        '  ls              list files',
        '  cat <file>      read a file',
        '  discord         copy discord id',
        '  steam           open steam profile',
        '  neofetch        system info, terminal-style',
        '  date            current date and time',
        '  clear           clear the screen'
      ].join('\n');
    },
    about() { return files['about.txt']; },
    ls() { return Object.keys(files).join('   '); },
    cat(arg) {
      if (!arg) return 'usage: cat <file>';
      if (files[arg]) return files[arg];
      return `cat: ${arg}: No such file or directory`;
    },
    discord() {
      navigator.clipboard?.writeText('whaledone.').catch(() => {});
      showToast('Discord copied — <strong>whaledone.</strong>');
      return 'discord id copied to clipboard -> whaledone.';
    },
    steam() {
      window.open('https://steamcommunity.com/id/IfYouKnowMeYouKnowMeBro/', '_blank', 'noopener');
      return 'opening steam profile...';
    },
    date() { return new Date().toString(); },
    neofetch() {
      return [
        'bcarpent@whaledone',
        '---------------',
        'OS: Ubuntu',
        'Host: Github.io',
        'Shell: Zsh 5.x',
        'Focus: Low-level dev / web',
        'Status: Turning coffee into questionable code.'
      ].join('\n');
    },
    sudo() { return 'nice try.'; }
  };

  async function whoamiEasterEgg() {
    const line = makeLine();
    await typeInto(line, 'Mr.Gollo', 65);
    await sleep(650);
    await deleteFrom(line, 45);
    await sleep(200);
    await typeInto(line, 'WhaleDone', 65);
  }

  async function run(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    
    printCommand(raw);
    history.push(raw);
    historyIndex = history.length;

    // Easter eggs
    if (trimmed.toLowerCase() === 'hakka no togame') {
      await typeInto(makeLine(), 'coming soon', 8);
      return;
    }

    const [cmd, ...rest] = trimmed.split(' ');
    const key = cmd.toLowerCase();

    if (key === 'clear') { outputEl.innerHTML = ''; return; }
    if (key === 'whoami') { await whoamiEasterEgg(); return; }

    const fn = commands[key];
    if (!fn) {
      await typeInto(makeLine(), `command not found: ${cmd} (try 'help')`, 10);
      return;
    }
    
    const text = fn(rest.join(' '));
    if (text) await typeInto(makeLine(), text, 8);
  }

  inputEl.addEventListener('input', () => {
    typedEl.textContent = inputEl.value;
    scrollDown();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = inputEl.value;
      inputEl.value = '';
      typedEl.textContent = '';
      enqueue(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        inputEl.value = history[historyIndex] || '';
        typedEl.textContent = inputEl.value;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        inputEl.value = history[historyIndex] || '';
      } else {
        historyIndex = history.length;
        inputEl.value = '';
      }
      typedEl.textContent = inputEl.value;
    }
  });

  bodyEl.addEventListener('click', () => inputEl.focus());
})();
