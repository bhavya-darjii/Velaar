/* eslint-disable */
// @ts-nocheck
import { getAllCoursePresentationHistory } from '../services/dataService';

const STORAGE_PREFIX = 'velaar_pres_history_';

// In-memory cache for instantaneous 0ms synchronous access
const memoryCache = new Map<string, Record<string, any[]>>();

const getLectureKey = (division: string, lectureNum: number | string) =>
  `${division || 'A'}-${lectureNum || 0}`;

/**
 * Get all cached presentations for a course from memory or localStorage.
 */
export const getCachedCoursePresentationMap = (courseId: string): Record<string, any[]> => {
  if (!courseId) return {};

  if (memoryCache.has(courseId)) {
    return memoryCache.get(courseId)!;
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${courseId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryCache.set(courseId, parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[presentationHistoryUtils] Failed to read from localStorage:', e);
  }

  return {};
};

/**
 * Get cached presentation history for a specific lecture (0ms synchronous).
 */
export const getCachedLecturePresentationHistory = (
  courseId: string,
  division: string = 'A',
  lectureNum: number | string = 0
): any[] => {
  if (!courseId) return [];
  const courseMap = getCachedCoursePresentationMap(courseId);
  const key = getLectureKey(division, lectureNum);
  return courseMap[key] || [];
};

/**
 * Cache presentation history for a single lecture and broadcast update.
 */
export const cacheLecturePresentationHistory = (
  courseId: string,
  division: string = 'A',
  lectureNum: number | string = 0,
  historyItems: any[] = []
) => {
  if (!courseId) return;
  const courseMap = { ...getCachedCoursePresentationMap(courseId) };
  const key = getLectureKey(division, lectureNum);
  courseMap[key] = (historyItems || []).slice(0, 10);

  memoryCache.set(courseId, courseMap);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${courseId}`, JSON.stringify(courseMap));
  } catch (e) {
    console.warn('[presentationHistoryUtils] Failed to save to localStorage:', e);
  }

  window.dispatchEvent(
    new CustomEvent('velaar_presentation_history_updated', {
      detail: { courseId, division, lectureNum, history: courseMap[key] },
    })
  );
};

/**
 * Cache presentation history for the entire course in one pass and broadcast update.
 */
export const cacheFullCoursePresentationHistory = (
  courseId: string,
  rawItems: any[] = []
) => {
  if (!courseId) return;
  const courseMap: Record<string, any[]> = {};

  for (const item of rawItems || []) {
    const key = getLectureKey(item.division || 'A', item.lecture_num || item.lectureNum || 0);
    if (!courseMap[key]) {
      courseMap[key] = [];
    }
    if (courseMap[key].length < 10) {
      courseMap[key].push({
        id: item.id,
        created_at: item.created_at,
        lecture_title: item.lecture_title || item.lectureTitle || '',
      });
    }
  }

  memoryCache.set(courseId, courseMap);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${courseId}`, JSON.stringify(courseMap));
  } catch (e) {
    console.warn('[presentationHistoryUtils] Failed to save course map to localStorage:', e);
  }

  window.dispatchEvent(
    new CustomEvent('velaar_presentation_history_updated', {
      detail: { courseId, all: true },
    })
  );
};

let activePreloadMap = new Map<string, Promise<any>>();

/**
 * Preload and cache all presentation history for a course in the background.
 */
export const preloadCoursePresentationHistory = async (courseId: string) => {
  if (!courseId) return [];

  // Deduplicate inflight preload requests for the same course
  if (activePreloadMap.has(courseId)) {
    return activePreloadMap.get(courseId);
  }

  const promise = (async () => {
    try {
      const data = await getAllCoursePresentationHistory(courseId);
      if (Array.isArray(data)) {
        cacheFullCoursePresentationHistory(courseId, data);
      }
      return data;
    } catch (err) {
      console.warn('[presentationHistoryUtils] Preload course history failed:', err);
      return [];
    } finally {
      activePreloadMap.delete(courseId);
    }
  })();

  activePreloadMap.set(courseId, promise);
  return promise;
};
