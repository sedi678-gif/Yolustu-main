/** Zego userID qaydalarına uyğunlaşdırma (max 32 byte, məhdud simvollar) */

const ZEGO_ID_PATTERN = /[^a-zA-Z0-9_\-@.#$&()+]/g;

export function toZegoUserId(appUserId: string): string {
  const cleaned = String(appUserId ?? '')
    .trim()
    .replace(ZEGO_ID_PATTERN, '_');
  if (!cleaned) return 'user_unknown';
  return cleaned.slice(0, 32);
}

export function toZegoUserName(displayName: string, userId: string): string {
  const name = String(displayName ?? '').trim();
  if (name) return name.slice(0, 256);
  return `user_${toZegoUserId(userId)}`;
}
