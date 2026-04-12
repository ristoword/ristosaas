let seq = 10000;

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${(++seq).toString(36)}`;
}
