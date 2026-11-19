const input = document.querySelector('.search input');
const games = document.querySelectorAll('#games img');

input.addEventListener('input', () => {
  const searchTerm = input.value.toLowerCase();
  games.forEach(game => {
    if (game.alt.toLowerCase().includes(searchTerm)) {
      game.style.display = 'block';
    } else {
      game.style.display = 'none';
    }
  });
});

const themeSelect = document.querySelector('#theme-select');
const compactLayoutToggle = document.querySelector('#compact-layout');
const siteNameHeading = document.querySelector('#site-name');
const appNameInput = document.querySelector('#app-name-input');
const applyAppNameButton = document.querySelector('#apply-app-name');
const resetAppNameButton = document.querySelector('#reset-app-name');
const appNameStatus = document.querySelector('#app-name-status');
const siteLogo = document.querySelector('#site-logo');
const faviconLink = document.querySelector('#site-favicon');
const logoUrlInput = document.querySelector('#logo-url');
const logoPreview = document.querySelector('#logo-preview');
const applyLogoButton = document.querySelector('#apply-logo');
const resetLogoButton = document.querySelector('#reset-logo');
const logoFileInput = document.querySelector('#logo-file');
const logoStatus = document.querySelector('#logo-status');
const tabIconPreview = document.querySelector('#tab-icon-preview');
const tabIconFileInput = document.querySelector('#tab-icon-file');
const resetTabIconButton = document.querySelector('#reset-tab-icon');
const tabIconStatus = document.querySelector('#tab-icon-status');
const gameDialog = document.querySelector('#game-dialog');
const gameFrame = document.querySelector('#game-frame');
const gamePlayerTitle = document.querySelector('#game-player-title');
const gamePlayerMessage = document.querySelector('#game-player-message');
const gamePlayerCloseButton = document.querySelector('#game-player-close');
const gamePlayerCompactButton = document.querySelector('#game-player-compact');
gamePlayerCompactButton?.remove();
const gamePlayerFullscreenButton = document.querySelector('#game-player-fullscreen');
const settingsStorageKey = 'riverbed-settings';
const availableThemes = ['riverbed', 'dark', 'light'];
const defaultAppName = 'Riverbed';
const defaultLogoUrl = siteLogo.getAttribute('src');
const defaultFaviconUrl = faviconLink.getAttribute('href');
const defaultFaviconType = faviconLink.getAttribute('type') || 'image/png';
const maxLogoFileSize = 1024 * 1024;
const maxTabIconFileSize = 512 * 1024;
const maxLogoDataUrlLength = Math.ceil(maxLogoFileSize / 3) * 4 + 128;
const supportedLogoMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const mimeTypeByExtension = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif'
};

function normalizeLogoUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

function normalizeLogoDataUrl(value) {
  if (typeof value !== 'string' || value.length > maxLogoDataUrlLength) return '';
  return /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
}

function normalizeAppName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 40);
}

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(settingsStorageKey) || '{}');
    const logoDataUrl = normalizeLogoDataUrl(savedSettings.logoDataUrl);
    const tabIconDataUrl = normalizeLogoDataUrl(savedSettings.tabIconDataUrl);
    return {
      appName: normalizeAppName(savedSettings.appName) || defaultAppName,
      theme: availableThemes.includes(savedSettings.theme) ? savedSettings.theme : 'riverbed',
      compactLayout: savedSettings.compactLayout === true,
      logoUrl: logoDataUrl ? '' : normalizeLogoUrl(savedSettings.logoUrl),
      logoDataUrl,
      tabIconDataUrl
    };
  } catch (error) {
    console.warn('Could not read saved appearance settings.', error);
    return { appName: defaultAppName, theme: 'riverbed', compactLayout: false, logoUrl: '', logoDataUrl: '', tabIconDataUrl: '' };
  }
}

let settings = loadSettings();

function applyTabIconToPage(dataUrl) {
  if (dataUrl) {
    faviconLink.href = dataUrl;
    faviconLink.type = dataUrl.slice(5, dataUrl.indexOf(';'));
    tabIconPreview.src = dataUrl;
    return;
  }
  faviconLink.href = defaultFaviconUrl;
  faviconLink.type = defaultFaviconType;
  tabIconPreview.src = defaultFaviconUrl;
}

function applySettings(syncAppNameInput = true) {
  document.body.dataset.theme = settings.theme;
  document.body.classList.toggle('compact-layout', settings.compactLayout);
  siteNameHeading.textContent = settings.appName;
  document.title = settings.appName;
  if (syncAppNameInput) appNameInput.value = settings.appName;
  siteLogo.alt = `${settings.appName} logo`;
  themeSelect.value = settings.theme;
  compactLayoutToggle.checked = settings.compactLayout;
  logoUrlInput.value = settings.logoUrl;
  applyTabIconToPage(settings.tabIconDataUrl);
}

function saveSettings() {
  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.warn('Could not save appearance settings.', error);
    return false;
  }
}

applySettings();

let logoLoadToken = 0;
let logoFileReadToken = 0;
let tabIconRequestToken = 0;
let activeGameLink = null;

function setLogoStatus(message, state = '') {
  logoStatus.textContent = message;
  logoStatus.dataset.state = state;
}

function setTabIconStatus(message, state = '') {
  tabIconStatus.textContent = message;
  tabIconStatus.dataset.state = state;
}

function setAppNameStatus(message, state = '') {
  appNameStatus.textContent = message;
  appNameStatus.dataset.state = state;
}

function getGameTitle(link, gameUrl) {
  const slug = gameUrl.pathname.split('/').filter(Boolean).pop() || '';
  const knownTitles = {
    'bob-the-robber-2': 'Bob the Robber 2',
    'drive-mad': 'Drive Mad',
    'moto-x3m': 'Moto X3M',
    'motox3m2': 'Moto X3M 2',
    'retro-bowl': 'Retro Bowl',
    slope: 'Slope',
    vex6: 'Vex 6',
    vex7: 'Vex 7'
  };
  if (knownTitles[slug]) return knownTitles[slug];
  const imageAlt = link.querySelector('img')?.alt.trim();
  return imageAlt?.replace(/\b\w/g, character => character.toUpperCase())
    || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
    || 'Game';
}

function setGameFullscreenButtonLabel() {
  const isFullscreen = document.fullscreenElement === gameDialog || gameDialog.classList.contains('fullscreen-fallback');
  gamePlayerFullscreenButton.textContent = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  gamePlayerFullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
}

function openGamePlayer(link, gameUrl) {
  activeGameLink = link;
  gamePlayerTitle.textContent = getGameTitle(link, gameUrl);
  const hasPlayablePage = gameUrl.pathname.replace(/\/+$/, '') !== '/games';
  gamePlayerMessage.hidden = hasPlayablePage;
  gameFrame.hidden = !hasPlayablePage;
  if (hasPlayablePage) {
    gameFrame.title = `${gamePlayerTitle.textContent} game`;
    gameFrame.src = gameUrl.href;
  } else {
    gameFrame.src = 'about:blank';
    gamePlayerMessage.textContent = `${gamePlayerTitle.textContent} does not have a playable page in this project.`;
  }
  gameDialog.classList.remove('small-view');
  gameDialog.classList.remove('fullscreen-fallback');
  setGameFullscreenButtonLabel();

  gameDialog.showModal();
  siteNameHeading.textContent = defaultAppName;
  document.title = defaultAppName;
  siteLogo.src = defaultLogoUrl;
  siteLogo.alt = `${defaultAppName} logo`;
  applyTabIconToPage('');
}

document.addEventListener('click', event => {
  const link = event.target instanceof Element
    ? event.target.closest('.featured a[href], #games a[href]')
    : null;
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;

  const gameUrl = new URL(link.href, window.location.href);
  if (gameUrl.origin !== window.location.origin || !gameUrl.pathname.startsWith('/games/')) return;

  event.preventDefault();
  openGamePlayer(link, gameUrl);
});

gamePlayerCloseButton.addEventListener('click', () => gameDialog.close());

gamePlayerFullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement === gameDialog) {
    await document.exitFullscreen().catch(() => {});
  } else if (gameDialog.classList.contains('fullscreen-fallback')) {
    gameDialog.classList.remove('fullscreen-fallback');
  } else if (typeof gameDialog.requestFullscreen === 'function') {
    try {
      await gameDialog.requestFullscreen();
    } catch {
      gameDialog.classList.add('fullscreen-fallback');
    }
  } else {
    gameDialog.classList.add('fullscreen-fallback');
  }
  setGameFullscreenButtonLabel();
});

document.addEventListener('fullscreenchange', () => {
  setGameFullscreenButtonLabel();
});

gameDialog.addEventListener('close', () => {
  gameFrame.src = 'about:blank';
  gameFrame.hidden = false;
  gamePlayerMessage.hidden = true;
  gameDialog.classList.remove('fullscreen-fallback');
  if (document.fullscreenElement === gameDialog) {
    document.exitFullscreen().catch(() => {});
  }

  applySettings(false);
  const configuredLogo = settings.logoDataUrl || settings.logoUrl;
  siteLogo.src = configuredLogo || defaultLogoUrl;
  siteLogo.alt = configuredLogo ? 'Custom site logo' : `${settings.appName} logo`;
  activeGameLink?.focus({ preventScroll: true });
  activeGameLink = null;
  setGameFullscreenButtonLabel();
});

function getImageFileMimeType(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (supportedLogoMimeTypes.has(file.type)) return file.type;
  return mimeTypeByExtension[extension] || '';
}

function validateImageFile(file, maxSize) {
  const mimeType = getImageFileMimeType(file);
  if (!supportedLogoMimeTypes.has(mimeType)) return 'type';
  if (file.size > maxSize) return 'size';
  return '';
}

function readImageFile(file, onLoad, onError) {
  const mimeType = getImageFileMimeType(file);
  const readableFile = file.type === mimeType ? file : file.slice(0, file.size, mimeType);
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    const dataUrl = normalizeLogoDataUrl(reader.result);
    if (!dataUrl) {
      onError('invalid');
      return;
    }
    onLoad(dataUrl);
  });
  reader.addEventListener('error', () => onError('read'));
  reader.readAsDataURL(readableFile);
}

function loadLogo(url, saveOnLoad, sourceType = 'url') {
  const requestToken = ++logoLoadToken;
  const image = new Image();
  image.onload = () => {
    if (requestToken !== logoLoadToken) return;
    if (saveOnLoad) {
      const previousSettings = settings;
      settings = {
        ...settings,
        logoUrl: sourceType === 'url' ? url : '',
        logoDataUrl: sourceType === 'file' ? url : ''
      };
      if (!saveSettings()) {
        settings = previousSettings;
        setLogoStatus('Could not save this logo in browser storage. Try a smaller image file or a direct image URL.', 'error');
        return;
      }
    }
    siteLogo.src = url;
    siteLogo.alt = 'Custom site logo';
    logoPreview.src = url;
    logoPreview.alt = 'Custom logo preview';
    logoUrlInput.value = sourceType === 'url' ? url : '';
    if (sourceType === 'url') logoFileInput.value = '';
    if (saveOnLoad) {
      setLogoStatus(sourceType === 'file' ? 'Uploaded logo saved in this browser.' : 'Logo updated.', 'success');
    }
  };
  image.onerror = () => {
    if (requestToken !== logoLoadToken) return;
    if (saveOnLoad) {
      setLogoStatus(
        sourceType === 'file'
          ? 'Could not read that file as an image. Choose a PNG, JPEG, WebP, or GIF file.'
          : 'Could not load that URL as an image. Use a direct image link; some websites block embedding.',
        'error'
      );
      if (sourceType === 'file') logoFileInput.value = '';
      return;
    }
    settings.logoUrl = '';
    settings.logoDataUrl = '';
    siteLogo.src = defaultLogoUrl;
    siteLogo.alt = 'Riverbed logo';
    logoPreview.src = defaultLogoUrl;
    logoPreview.alt = 'Current logo preview';
    applySettings(false);
    saveSettings();
    setLogoStatus('The saved logo could not be loaded. Choose the file again, use a working image URL, or reset to the Riverbed logo.', 'error');
  };
  image.src = url;
}

function saveTabIcon(dataUrl, requestToken) {
  const image = new Image();
  image.onload = () => {
    if (requestToken !== tabIconRequestToken) return;
    const previousSettings = settings;
    settings = { ...settings, tabIconDataUrl: dataUrl };
    if (!saveSettings()) {
      settings = previousSettings;
      setTabIconStatus('Could not save the tab icon in this browser. Try a smaller image.', 'error');
      return;
    }
    applyTabIconToPage(dataUrl);
    setTabIconStatus('Tab icon updated and saved in this browser.', 'success');
  };
  image.onerror = () => {
    if (requestToken !== tabIconRequestToken) return;
    tabIconFileInput.value = '';
    setTabIconStatus('Could not read that file as an image. Choose a PNG, JPEG, WebP, or GIF file.', 'error');
  };
  image.src = dataUrl;
}

if (settings.logoDataUrl) {
  loadLogo(settings.logoDataUrl, false, 'file');
} else if (settings.logoUrl) {
  loadLogo(settings.logoUrl, false);
}

themeSelect.addEventListener('change', () => {
  settings.theme = themeSelect.value;
  applySettings(false);
  saveSettings();
});

compactLayoutToggle.addEventListener('change', () => {
  settings.compactLayout = compactLayoutToggle.checked;
  applySettings(false);
  saveSettings();
});

applyAppNameButton.addEventListener('click', () => {
  const appName = normalizeAppName(appNameInput.value);
  if (!appName) {
    setAppNameStatus('Enter a name before applying it.', 'error');
    return;
  }

  const previousSettings = settings;
  settings = { ...settings, appName };
  if (!saveSettings()) {
    settings = previousSettings;
    applySettings();
    setAppNameStatus('Could not save the app name in this browser. Try again.', 'error');
    return;
  }

  applySettings();
  setAppNameStatus('App name and browser tab updated.', 'success');
});

appNameInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    applyAppNameButton.click();
  }
});

resetAppNameButton.addEventListener('click', () => {
  const previousSettings = settings;
  settings = { ...settings, appName: defaultAppName };
  if (!saveSettings()) {
    settings = previousSettings;
    applySettings();
    setAppNameStatus('Could not reset the app name in browser storage. Try again.', 'error');
    return;
  }

  applySettings();
  setAppNameStatus('Riverbed name restored.', 'success');
});

applyLogoButton.addEventListener('click', () => {
  const logoUrl = normalizeLogoUrl(logoUrlInput.value);
  if (!logoUrl) {
    setLogoStatus('Enter a valid image URL starting with http:// or https://.', 'error');
    return;
  }
  logoFileReadToken += 1;
  setLogoStatus('Checking image URL…');
  loadLogo(logoUrl, true);
});

logoFileInput.addEventListener('change', () => {
  const readToken = ++logoFileReadToken;
  const file = logoFileInput.files?.[0];
  if (!file) return;

  const validationError = validateImageFile(file, maxLogoFileSize);
  if (validationError === 'type') {
    logoFileInput.value = '';
    setLogoStatus('Choose a PNG, JPEG, WebP, or GIF image file.', 'error');
    return;
  }
  if (validationError === 'size') {
    logoFileInput.value = '';
    setLogoStatus('That file is larger than 1 MB. Choose a smaller logo image.', 'error');
    return;
  }

  setLogoStatus('Reading image…');
  readImageFile(
    file,
    dataUrl => {
      if (readToken === logoFileReadToken) loadLogo(dataUrl, true, 'file');
    },
    error => {
      if (readToken !== logoFileReadToken) return;
      logoFileInput.value = '';
      setLogoStatus(
        error === 'invalid'
          ? 'Could not read that file as a supported image.'
          : 'Could not read that image file. Try another file.',
        'error'
      );
    }
  );
});

tabIconFileInput.addEventListener('change', () => {
  const requestToken = ++tabIconRequestToken;
  const file = tabIconFileInput.files?.[0];
  if (!file) return;

  const validationError = validateImageFile(file, maxTabIconFileSize);
  if (validationError === 'type') {
    tabIconFileInput.value = '';
    setTabIconStatus('Choose a PNG, JPEG, WebP, or GIF image file.', 'error');
    return;
  }
  if (validationError === 'size') {
    tabIconFileInput.value = '';
    setTabIconStatus('That file is larger than 512 KB. Choose a smaller tab icon.', 'error');
    return;
  }

  setTabIconStatus('Reading image…');
  readImageFile(
    file,
    dataUrl => {
      if (requestToken === tabIconRequestToken) saveTabIcon(dataUrl, requestToken);
    },
    error => {
      if (requestToken !== tabIconRequestToken) return;
      tabIconFileInput.value = '';
      setTabIconStatus(
        error === 'invalid'
          ? 'Could not read that file as a supported image.'
          : 'Could not read that image file. Try another file.',
        'error'
      );
    }
  );
});

resetTabIconButton.addEventListener('click', () => {
  tabIconRequestToken += 1;
  const previousSettings = settings;
  settings = { ...settings, tabIconDataUrl: '' };
  if (!saveSettings()) {
    settings = previousSettings;
    setTabIconStatus('Could not reset the tab icon in browser storage. Try again.', 'error');
    return;
  }
  applyTabIconToPage('');
  tabIconFileInput.value = '';
  setTabIconStatus('Riverbed tab icon restored.', 'success');
});

resetLogoButton.addEventListener('click', () => {
  logoFileReadToken += 1;
  logoLoadToken += 1;
  settings.logoUrl = '';
  settings.logoDataUrl = '';
  siteLogo.src = defaultLogoUrl;
  siteLogo.alt = 'Riverbed logo';
  logoPreview.src = defaultLogoUrl;
  logoPreview.alt = 'Current logo preview';
  logoUrlInput.value = '';
  logoFileInput.value = '';
  saveSettings();
  setLogoStatus('Riverbed logo restored.', 'success');
});
