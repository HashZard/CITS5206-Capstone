/**
 * shareService: 发送PDF到邮箱的服务
 * - 如果后端可用：POST /api/share
 * - 如果不可用：mock一个成功响应，延迟800ms
 */

export async function sharePdfByEmail(email: string, pdfBase64: string): Promise<{ ok: boolean }> {
  // TODO: 接入真实后端 /api/share
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pdfBase64 })
    });
    if (res.ok) return { ok: true };
  } catch {}

  // fallback mock
  await new Promise((r) => setTimeout(r, 800));
  return { ok: true };
}
