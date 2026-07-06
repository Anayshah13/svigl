const GUEST_DEVICE_ID_KEY = "svigl:guest_device_id";

function generateGuestDeviceId(): string {
  return crypto.randomUUID();
}

export function getGuestDeviceId(): string {
  const existing = localStorage.getItem(GUEST_DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = generateGuestDeviceId();
  localStorage.setItem(GUEST_DEVICE_ID_KEY, deviceId);
  return deviceId;
}
