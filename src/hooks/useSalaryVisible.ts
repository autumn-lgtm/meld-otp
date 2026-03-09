import { useState, useEffect } from 'react';

const STORAGE_KEY = 'meld-salary-visible';
const TOGGLE_EVENT = 'meld-salary-toggle';

export function useSalaryVisible() {
  const [visible, setVisible] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    function handler() {
      setVisible(localStorage.getItem(STORAGE_KEY) !== 'false');
    }
    window.addEventListener(TOGGLE_EVENT, handler);
    return () => window.removeEventListener(TOGGLE_EVENT, handler);
  }, []);

  function toggle() {
    const next = !visible;
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
    window.dispatchEvent(new Event(TOGGLE_EVENT));
  }

  return { salaryVisible: visible, toggleSalary: toggle };
}
