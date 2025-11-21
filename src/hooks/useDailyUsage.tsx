import { useState, useEffect } from 'react';

interface DailyUsage {
  date: string;
  used: number;
}

const STORAGE_KEY = 'bahorai_daily_usage';
const DEFAULT_DAILY_LIMIT = 5;

export function useDailyUsage() {
  const [usedToday, setUsedToday] = useState(0);
  const [dailyLimit] = useState(DEFAULT_DAILY_LIMIT);

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const loadUsage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: DailyUsage = JSON.parse(stored);
        const today = getTodayDate();
        
        // Reset if it's a new day
        if (data.date !== today) {
          setUsedToday(0);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, used: 0 }));
        } else {
          setUsedToday(data.used);
        }
      } else {
        // Initialize if not exists
        const today = getTodayDate();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, used: 0 }));
        setUsedToday(0);
      }
    } catch (error) {
      console.error('Failed to load daily usage:', error);
      setUsedToday(0);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const incrementUsage = () => {
    const today = getTodayDate();
    const newUsed = usedToday + 1;
    
    setUsedToday(newUsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, used: newUsed }));
  };

  const resetUsage = () => {
    const today = getTodayDate();
    setUsedToday(0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, used: 0 }));
  };

  const hasReachedLimit = usedToday >= dailyLimit;
  const isNearLimit = usedToday >= dailyLimit - 1; // 4/5 or more

  return {
    usedToday,
    dailyLimit,
    hasReachedLimit,
    isNearLimit,
    incrementUsage,
    resetUsage,
  };
}
