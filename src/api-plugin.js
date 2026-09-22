import crypto from 'node:crypto';

const GARMIN_AUTHORIZE_URL = 'https://connect.garmin.com/oauth2Confirm';
const GARMIN_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
const GARMIN_API_URL = 'https://apis.garmin.com';
const oauthSessions = new Map();
let garminConnection = null;

export function novaApiPlugin() {
  return {
    name: 'nova-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://nova.local');
        if (!requestUrl.pathname.startsWith('/api/')) return next();

        try {
          if (requestUrl.pathname === '/api/garmin/status' && req.method === 'GET') {
            return sendJson(res, 200, {
              connected: Boolean(garminConnection),
              userId: garminConnection?.userId || null,
              lastSync: garminConnection?.lastSync || null,
            });
          }

          if (requestUrl.pathname === '/api/garmin/start' && req.method === 'GET') {
            if (!process.env.GARMIN_CLIENT_ID || !process.env.GARMIN_CLIENT_SECRET) {
              return sendJson(res, 503, {
                configured: false,
                message: 'Garmin API не настроен на сервере. Добавь GARMIN_CLIENT_ID и GARMIN_CLIENT_SECRET в .env или импортируй свой Garmin JSON/CSV.',
              });
            }
            const state = randomString(24);
            const verifier = randomString(64);
            const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
            const redirectUri = process.env.GARMIN_REDIRECT_URI || getRedirectUri(req);
            oauthSessions.set(state, { verifier, redirectUri, createdAt: Date.now() });
            const params = new URLSearchParams({
              response_type: 'code',
              client_id: process.env.GARMIN_CLIENT_ID,
              code_challenge: challenge,
              code_challenge_method: 'S256',
              state,
              redirect_uri: redirectUri,
            });
            return sendJson(res, 200, { configured: true, url: `${GARMIN_AUTHORIZE_URL}?${params}` });
          }

          if (requestUrl.pathname === '/api/garmin/callback' && req.method === 'GET') {
            return handleGarminCallback(requestUrl, res);
          }

          if (requestUrl.pathname === '/api/garmin/sync' && req.method === 'POST') {
            if (!garminConnection) return sendJson(res, 401, { message: 'Garmin ещё не подключён. Сначала пройди авторизацию.' });
            const result = await syncGarmin();
            garminConnection.lastSync = new Date().toISOString();
            return sendJson(res, 200, result);
          }

          if (requestUrl.pathname === '/api/ai/analyze' && req.method === 'POST') {
            const body = await readJson(req);
            return handleAiRequest(body, res);
          }

          return sendJson(res, 404, { message: 'API route not found' });
        } catch (error) {
          console.error('[nova-api]', error);
          return sendJson(res, 500, { message: error.message || 'Внутренняя ошибка API' });
        }
      });
    },
  };
}

async function handleGarminCallback(url, res) {
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const session = state ? oauthSessions.get(state) : null;
  if (!code || !session) return callbackPage(res, { connected: false, message: 'Сессия Garmin истекла. Запусти подключение ещё раз.' });
  oauthSessions.delete(state);

  const tokenResponse = await fetch(GARMIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.GARMIN_CLIENT_ID,
      client_secret: process.env.GARMIN_CLIENT_SECRET,
      code,
      code_verifier: session.verifier,
      redirect_uri: session.redirectUri,
    }),
  });
  if (!tokenResponse.ok) return callbackPage(res, { connected: false, message: 'Garmin не подтвердил авторизацию. Проверь Redirect URI и доступы приложения.' });
  const token = await tokenResponse.json();
  const userIdResponse = await fetch(`${GARMIN_API_URL}/wellness-api/rest/user/id`, { headers: { Authorization: `Bearer ${token.access_token}` } });
  const userIdPayload = userIdResponse.ok ? await userIdResponse.json() : {};
  garminConnection = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + Number(token.expires_in || 86400) * 1000,
    userId: userIdPayload.userId || null,
    lastSync: null,
  };
  return callbackPage(res, { connected: true });
}

async function syncGarmin() {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 14 * 24 * 60 * 60;
  const query = `uploadStartTimeInSeconds=${start}&uploadEndTimeInSeconds=${end}`;
  const resources = [
    { path: `/wellness-api/rest/dailies?${query}`, kind: 'daily' },
    { path: `/wellness-api/rest/sleeps?${query}`, kind: 'sleep' },
    { path: `/wellness-api/rest/hrv?${query}`, kind: 'hrv' },
  ];
  const rows = [];
  for (const resource of resources) {
    const response = await garminFetch(resource.path);
    if (!response || !response.ok) continue;
    const payload = await response.json();
    const list = Array.isArray(payload) ? payload : payload.dailies || payload.sleeps || payload.hrv || [payload];
    for (const item of list) rows.push(normalizeGarminRow(item, resource.kind));
  }
  const grouped = new Map();
  for (const row of rows) {
    if (!row.date) continue;
    const previous = grouped.get(row.date) || { date: row.date, source: 'garmin-api' };
    grouped.set(row.date, { ...previous, ...removeUndefined(row) });
  }
  return { samples: [...grouped.values()].sort((a, b) => new Date(b.date) - new Date(a.date)) };
}

async function garminFetch(path) {
  if (garminConnection.expiresAt && Date.now() > garminConnection.expiresAt - 30_000) await refreshGarminToken();
  let response = await fetch(`${GARMIN_API_URL}${path}`, { headers: { Authorization: `Bearer ${garminConnection.accessToken}` } });
  if (response.status === 401 && garminConnection.refreshToken) {
    await refreshGarminToken();
    response = await fetch(`${GARMIN_API_URL}${path}`, { headers: { Authorization: `Bearer ${garminConnection.accessToken}` } });
  }
  return response;
}

async function refreshGarminToken() {
  const response = await fetch(GARMIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GARMIN_CLIENT_ID,
      client_secret: process.env.GARMIN_CLIENT_SECRET,
      refresh_token: garminConnection.refreshToken,
    }),
  });
  if (!response.ok) throw new Error('Не удалось обновить токен Garmin. Подключи часы ещё раз.');
  const token = await response.json();
  garminConnection = { ...garminConnection, accessToken: token.access_token, refreshToken: token.refresh_token || garminConnection.refreshToken, expiresAt: Date.now() + Number(token.expires_in || 86400) * 1000 };
}

function normalizeGarminRow(row, kind) {
  const pick = (...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');
  const date = pick('calendarDate', 'date', 'startTimeLocal', 'startTimeGMT', 'timestamp');
  const normalized = { date: date ? String(date).slice(0, 10) : undefined, source: 'garmin-api' };
  if (kind === 'daily') {
    normalized.steps = numberOrUndefined(pick('steps', 'totalSteps'));
    normalized.restingHeartRate = numberOrUndefined(pick('restingHeartRate', 'restingHeartRateValue'));
    normalized.trainingLoad = numberOrUndefined(pick('trainingLoad', 'activityTrainingLoad'));
  }
  if (kind === 'sleep') {
    const seconds = numberOrUndefined(pick('sleepTimeSeconds', 'totalSleepSeconds', 'sleepDurationSeconds'));
    normalized.sleepHours = seconds === undefined ? numberOrUndefined(pick('sleepHours')) : Math.round((seconds / 3600) * 10) / 10;
  }
  if (kind === 'hrv') normalized.hrv = numberOrUndefined(pick('weeklyAvg', 'lastNightAvg', 'hrvValue', 'averageHrv'));
  return normalized;
}

async function handleAiRequest(body, res) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return sendJson(res, 503, { message: 'AI API не настроен на сервере. Добавь OPENAI_API_KEY в .env — ключ никогда не уходит в браузер.' });
  const profile = body?.profile || {};
  const health = body?.health || {};
  const notes = Array.isArray(body?.notes) ? body.notes.slice(0, 30) : [];
  const facts = JSON.stringify({
    profile: {
      name: profile.name,
      age: profile.age,
      profession: profile.profession,
      targetProfession: profile.targetProfession,
      interests: profile.interests,
      level: profile.level,
      learningGoal: profile.learningGoal,
      trainingGoal: profile.trainingGoal,
      workDays: profile.workDays,
      workStart: profile.workStart,
      workEnd: profile.workEnd,
      trainingDays: profile.trainingDays,
      coachStyle: profile.coachStyle,
      motivation: profile.motivation,
    },
    health: { source: health.source, samples: (health.samples || []).slice(0, 30) },
    notes: notes.map((note) => ({ text: note.text, createdAt: note.createdAt })),
  });
  const endpoint = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const aiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Ты — Nova, персональный AI-аналитик. Отвечай на русском. Используй только факты из JSON. Никогда не придумывай показатели, даты, диагнозы или причинно-следственные связи. Если данных не хватает, прямо скажи это. Не ставь медицинских диагнозов. Верни только JSON с полями summary, nextStep, limitations, confidence.' },
        { role: 'user', content: `Проанализируй мой профиль, здоровье и заметки. Дай один короткий вывод, один безопасный следующий шаг и ограничения анализа.\n\n${facts}` },
      ],
    }),
  });
  const payload = await aiResponse.json().catch(() => ({}));
  if (!aiResponse.ok) return sendJson(res, aiResponse.status, { message: payload?.error?.message || 'AI-сервис вернул ошибку' });
  const raw = payload.choices?.[0]?.message?.content || '{}';
  let parsed;
  try { parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '')); } catch { parsed = { summary: raw, nextStep: 'Проверь данные и добавь контекст перед следующим анализом.', limitations: 'AI вернул текст вместо структурированного ответа.' }; }
  return sendJson(res, 200, parsed);
}

function getRedirectUri(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}/api/garmin/callback`;
}
function callbackPage(res, payload) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(`<!doctype html><html><body><script>window.opener?.postMessage(${JSON.stringify({ source: 'nova-garmin', ...payload })}, '*');window.location.replace('/');</script><p>Можно закрыть это окно и вернуться в Nova.</p></body></html>`); }
function readJson(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', (chunk) => { body += chunk; if (body.length > 1_000_000) req.destroy(); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(new Error('Некорректный JSON')); } }); req.on('error', reject); }); }
function sendJson(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(payload)); }
function randomString(length) { return base64Url(crypto.randomBytes(length)); }
function base64Url(buffer) { return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function removeUndefined(object) { return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)); }
function numberOrUndefined(value) { const number = Number(value); return value === undefined || value === null || value === '' || !Number.isFinite(number) ? undefined : number; }
