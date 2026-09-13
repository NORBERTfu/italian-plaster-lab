// 把舊的 *.pages.dev 正式網址 301 導到自訂網域，避免搜尋引擎收到兩份重複內容。
// 只比對正式的 pages.dev 主機名；預覽部署（<hash>.italian-plaster-lab.pages.dev）不受影響。
const LEGACY_HOST = 'italian-plaster-lab.pages.dev';
const CANONICAL_HOST = 'lab.pamaterial.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === LEGACY_HOST) {
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
