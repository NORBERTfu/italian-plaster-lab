// 問卷送出端點。前端只打這一支同源 API，由伺服器端做兩件事：
//   1. 轉發到原本的 Google Apps Script（試算表照舊會寫入）
//   2. 寄一封通知信給業務信箱
// 兩件事各自回報成敗，前端拿得到真實結果，不再有「假送出成功」。
//
// 通知信是呼叫 pamaterial.com 上一支帶密鑰的 WordPress REST 端點寄出的，
// 沿用該站已經設定好的 WP Mail SMTP，不需要另外申請寄信服務。
//
// 需要在 Cloudflare Pages → 設定 → 環境變數設定的機密：
//   NOTIFY_SECRET    與 WordPress 端共用的密鑰（沒設就只轉發、不寄信）
// 可選：
//   SHEET_ENDPOINT   覆寫下面的 Apps Script 網址
//   NOTIFY_ENDPOINT  覆寫下面的 WordPress 端點

const DEFAULT_SHEET_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyDCev4PiiESLIznTagVOSs-R00WPHlvfWO750zZCRopRqGjpnvWEtHNMeYG9yCy_Q/exec';
const DEFAULT_NOTIFY_ENDPOINT = 'https://pamaterial.com/wp-json/pa/v1/inquiry';
const MAX_BODY_BYTES = 8 * 1024;

const FIELD_LABELS = {
  name: '姓名',
  email: 'Email',
  phone: '電話',
  space: '空間',
  method: '施作方式',
  sheen: '光澤',
  texture: '質感',
  recommendedProducts: '推薦產品',
  timestamp: '填寫時間',
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function buildEmail(payload) {
  const rows = Object.entries(FIELD_LABELS)
    .filter(([key]) => payload[key])
    .map(
      ([key, label]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#666;white-space:nowrap;vertical-align:top">${label}</td>` +
        `<td style="padding:6px 0;color:#222">${escapeHtml(payload[key])}</td></tr>`
    )
    .join('');

  const text = Object.entries(FIELD_LABELS)
    .filter(([key]) => payload[key])
    .map(([key, label]) => `${label}：${payload[key]}`)
    .join('\n');

  return {
    subject: `【灰泥 Lab 諮詢單】${payload.name || '未具名'}`,
    text,
    html:
      `<div style="font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;font-size:15px;line-height:1.6">` +
      `<p style="margin:0 0 12px;color:#333">Italian Plaster Lab 收到一份新的諮詢單：</p>` +
      `<table style="border-collapse:collapse">${rows}</table>` +
      `</div>`,
  };
}

async function forwardToSheet(endpoint, payload) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function sendEmail(endpoint, secret, payload) {
  const { subject, text, html } = buildEmail(payload);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-pa-inquiry-secret': secret,
      },
      body: JSON.stringify({ subject, text, html, replyTo: payload.email || '' }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, status: res.status, error: (await res.text()).slice(0, 300) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, error: 'payload too large' });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid json' });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json(400, { ok: false, error: 'invalid payload' });
  }
  if (!String(payload.name || '').trim() || !String(payload.email || '').trim()) {
    return json(400, { ok: false, error: 'name and email are required' });
  }

  payload.timestamp = payload.timestamp || new Date().toISOString();

  const sheet = await forwardToSheet(env.SHEET_ENDPOINT || DEFAULT_SHEET_ENDPOINT, payload);

  let email = { ok: false, error: 'NOTIFY_SECRET not configured' };
  if (env.NOTIFY_SECRET) {
    email = await sendEmail(
      env.NOTIFY_ENDPOINT || DEFAULT_NOTIFY_ENDPOINT,
      env.NOTIFY_SECRET,
      payload
    );
  }

  // 只要其中一條路成功，對客戶就算收件成功。
  // 注意：失敗時不要回 5xx。lab.pamaterial.com 在 pamaterial.com 這個 zone 底下，
  // Cloudflare 會把 5xx 的內容換成自己的錯誤頁，前端就讀不到下面這包診斷資訊了。
  // 一律回 200，成敗看 ok 欄位。
  const ok = sheet.ok || email.ok;
  return json(200, { ok, sheet, email });
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json(405, { ok: false, error: 'method not allowed' });
}
