const GUEST_TRIAL_KEY = "bahor_guest_trial";
const FREE_USAGE_KEY_PREFIX = "bahor_free_usage_";

interface GuestTrialData {
  used: number;
}

interface FreeUsageData {
  date: string;
  count: number;
}

export function getGuestTrialData(): GuestTrialData {
  try {
    const stored = localStorage.getItem(GUEST_TRIAL_KEY);
    if (!stored) return { used: 0 };
    return JSON.parse(stored);
  } catch {
    return { used: 0 };
  }
}

export function incrementGuestTrial(): void {
  const data = getGuestTrialData();
  data.used += 1;
  localStorage.setItem(GUEST_TRIAL_KEY, JSON.stringify(data));
}

export function getFreeUsageData(userId: string): FreeUsageData {
  const today = new Date().toISOString().split('T')[0];
  try {
    const stored = localStorage.getItem(`${FREE_USAGE_KEY_PREFIX}${userId}`);
    if (!stored) return { date: today, count: 0 };
    const data: FreeUsageData = JSON.parse(stored);
    
    // Reset if different day
    if (data.date !== today) {
      return { date: today, count: 0 };
    }
    
    return data;
  } catch {
    return { date: today, count: 0 };
  }
}

export function incrementFreeUsage(userId: string): void {
  const data = getFreeUsageData(userId);
  data.count += 1;
  localStorage.setItem(`${FREE_USAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
}

export function canGuestSendMessage(): boolean {
  const data = getGuestTrialData();
  return data.used < 5;
}

export function canFreeUserSendMessage(userId: string): boolean {
  const data = getFreeUsageData(userId);
  return data.count < 5;
}
