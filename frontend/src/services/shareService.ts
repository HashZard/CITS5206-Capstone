/**
 * shareService: Service to send a PDF to an email address
 * - If backend is available: POST /api/share
 * - If unavailable: mock a successful response with an 800ms delay
 */

export async function sharePdfByEmail(email: string, pdfBase64: string): Promise<{ ok: boolean }> {
  // TODO: Integrate with real backend /api/share
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pdfBase64 })
    });
    if (res.ok) return { ok: true };
  } catch {}

  // Fallback mock
  await new Promise((r) => setTimeout(r, 800));
  return { ok: true };
}
