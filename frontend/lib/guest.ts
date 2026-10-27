const GUEST_DEVICE_ID_KEY = "svigl:guest_device_id";

function generateGuestDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Older Safari / non-secure contexts
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function peekGuestDeviceId(): string | null {
  try {
    return localStorage.getItem(GUEST_DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

export function getGuestDeviceId(): string {
  const existing = peekGuestDeviceId();
  if (existing) {
    return existing;
  }

  const deviceId = generateGuestDeviceId();
  localStorage.setItem(GUEST_DEVICE_ID_KEY, deviceId);
  return deviceId;
}
