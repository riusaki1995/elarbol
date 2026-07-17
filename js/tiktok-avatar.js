/**
 * Avatares TikTok con caché local para no quemar el límite de unavatar.io
 * (gratis ≈ 25 req/día por IP — por eso fallaban muchas fotos).
 */

const CACHE_KEY = 'elarbol_tiktok_avatars_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 días

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(map) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch { /* quota */ }
}

export function cleanTiktokUser(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '')
    .split(/[/?#]/)[0]
    .trim();
}

export function initialsAvatar(user) {
  const name = cleanTiktokUser(user) || 'TK';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111111&color=25f4ee&bold=true&size=256`;
}

export function unavatarUrl(user) {
  const u = cleanTiktokUser(user);
  // fallback=false → si falla dispara onerror (para reintentar / caché)
  return `https://unavatar.io/tiktok/${encodeURIComponent(u)}?fallback=false`;
}

export function getCachedAvatar(user) {
  const u = cleanTiktokUser(user).toLowerCase();
  const map = readCache();
  const hit = map[u];
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    delete map[u];
    writeCache(map);
    return null;
  }
  return hit.url;
}

export function setCachedAvatar(user, url) {
  if (!url || url.includes('ui-avatars.com')) return;
  const u = cleanTiktokUser(user).toLowerCase();
  const map = readCache();
  map[u] = { url, ts: Date.now() };
  writeCache(map);
}

/**
 * Resuelve la mejor URL disponible sin pegarle siempre a unavatar.
 * Orden: Firestore foto guardada → caché local → unavatar
 */
export function resolveAvatarSrc(user, storedUrl) {
  if (storedUrl && /^https?:\/\//i.test(storedUrl) && !storedUrl.includes('ui-avatars.com')) {
    return storedUrl;
  }
  const cached = getCachedAvatar(user);
  if (cached) return cached;
  return unavatarUrl(user);
}

/**
 * Enlaza un <img> con reintento + caché. Evita ráfagas de 12+ requests.
 */
export function bindTiktokAvatar(img, user, storedUrl) {
  const u = cleanTiktokUser(user);
  let tries = 0;

  const apply = (src) => {
    img.dataset.tiktokUser = u;
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = `@${u}`;
    img.src = src;
  };

  img.onerror = () => {
    tries += 1;
    if (tries === 1) {
      // Reintento limpio (a veces falla por rate limit momentáneo)
      setTimeout(() => apply(unavatarUrl(u)), 600 + Math.random() * 400);
      return;
    }
    img.onerror = null;
    apply(initialsAvatar(u));
  };

  img.onload = () => {
    if (img.src && !img.src.includes('ui-avatars.com')) {
      setCachedAvatar(u, img.currentSrc || img.src);
    }
  };

  apply(resolveAvatarSrc(u, storedUrl));
}

/** Carga avatares en cola (menos rate-limit) */
export async function hydrateAvatars(nodes, delayMs = 180) {
  for (const img of nodes) {
    const user = img.dataset.user;
    const stored = img.dataset.stored || '';
    if (!user) continue;
    bindTiktokAvatar(img, user, stored);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
