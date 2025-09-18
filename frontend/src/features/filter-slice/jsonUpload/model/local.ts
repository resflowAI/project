// features/json-upload/model/local.ts
// Small helpers to normalize JSON upload payloads used by the global filter upload UI.

export type UploadItem = { id: number; text: string };
export type UploadPayload = { data: UploadItem[] } | UploadItem[];

export const isJsonFile = (file: File) => file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

export function mergeById(a: UploadItem[], b: UploadItem[]): UploadItem[] {
  const m = new Map<number, UploadItem>();
  for (const it of a) m.set(it.id, it);
  for (const it of b) m.set(it.id, it); // latter overrides former
  return Array.from(m.values());
}

export function dedupeById(a: UploadItem[]): UploadItem[] {
  return mergeById([], a);
}

export function normalizePayload(json: unknown): UploadItem[] {
  const raw = Array.isArray(json) ? json : (json as { data?: unknown })?.data;
  if (!Array.isArray(raw)) throw new Error('Ожидается массив или {"data":[...]}');

  const out: UploadItem[] = [];
  for (const it of raw) {
    if (typeof it !== 'object' || it === null) throw new Error('Каждый элемент должен быть объектом');
    const id = (it as Record<string, unknown>)['id'];
    const text = (it as Record<string, unknown>)['text'];
    if (!Number.isInteger(id as number)) throw new Error('Каждый элемент должен иметь целочисленный "id"');
    if (typeof text !== 'string') throw new Error('Каждый элемент должен иметь строковый "text"');
    out.push({ id: id as number, text: text as string });
  }
  return out;
}

export async function readFileAsItems(file: File): Promise<UploadItem[]> {
  const txt = await file.text();
  const json = JSON.parse(txt);
  return normalizePayload(json);
}
