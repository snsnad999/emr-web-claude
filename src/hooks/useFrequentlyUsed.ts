/**
 * Hook to fetch and cache "frequently used" / "top used" items per category.
 * Fetches once per session when the search input is focused and empty,
 * then serves from cache on subsequent focuses.
 */
import { useState, useCallback, useRef } from 'react';
import { prescriptionApi } from '@/services/api';
import { DEV_ORG, DEV_BRANCH, DEV_DOCTOR } from '@/pages/Prescription/context/prescriptionHelpers';

export type FrequentCategory = 'medications' | 'symptoms' | 'diagnoses' | 'examination_findings';

export interface FrequentItem {
  [key: string]: unknown;
  name?: string;
  brandName?: string;
  genericName?: string;
  description?: string;
  form?: string;
  testName?: string;
  icdCode?: string;
}

// Module-level cache so items persist across re-renders and component remounts within the session
const sessionCache: Partial<Record<FrequentCategory, FrequentItem[]>> = {};

export function useFrequentlyUsed(category: FrequentCategory) {
  const [items, setItems] = useState<FrequentItem[]>(sessionCache[category] || []);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(!!sessionCache[category]);

  const fetchIfNeeded = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setIsLoading(true);
    try {
      const res = await prescriptionApi.getFrequentlyUsed({
        category,
        doctor_id: DEV_DOCTOR,
        organization_id: DEV_ORG,
        branch_id: DEV_BRANCH,
      });
      const data = (res.data as FrequentItem[]) || [];
      sessionCache[category] = data;
      setItems(data);
    } catch (e) {
      console.error(`[FrequentlyUsed] Failed to fetch ${category}:`, e);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  return { items, isLoading, fetchIfNeeded };
}
