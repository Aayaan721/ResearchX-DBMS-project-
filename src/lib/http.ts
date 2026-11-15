import { NextResponse } from 'next/server';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function fail(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  const code = (error as { code?: string })?.code;
  if (['23502', '23503', '23505', '23514', '22P02', '22001', '22003'].includes(code)) {
    return NextResponse.json({ error: 'Input conflicts with database validation or existing records' }, { status: 400 });
  }
  console.error('Request failed:', error);
  return NextResponse.json({ error: 'Unable to complete request' }, { status: 500 });
}
export async function readBody(request: Request): Promise<Record<string, any>> {
  const text = await request.text();
  if (Buffer.byteLength(text) > 100_000) throw new HttpError(413, 'Request is too large');
  let body: any;
  try { body = JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
  return body;
}
export function textField(value: unknown, name: string, min = 0, max = 10000): string {
  if (typeof value !== 'string' || value.includes('\0')) throw new HttpError(400, `${name} must be text`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) throw new HttpError(400, `${name} must contain ${min}–${max} characters`);
  return clean;
}
export function positiveId(value: unknown, name = 'ID'): number {
  if (!/^[1-9]\d*$/.test(String(value))) throw new HttpError(400, `Invalid ${name}`);
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 2147483647) throw new HttpError(400, `Invalid ${name}`);
  return id;
}
export function domainIds(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 50) throw new HttpError(400, 'Invalid domain list');
  return Array.from(new Set(value.map(id => positiveId(id, 'domain ID'))));
}
