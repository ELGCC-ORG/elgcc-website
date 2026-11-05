import fs from 'fs';
import path from 'path';
import seedSchoolsData from '@/content/cornerstone/schools.json';
import { CornerstoneSchoolData } from './types';

const CUSTOM_SCHOOLS_PATH = path.join(process.cwd(), 'data', 'cornerstone-custom-schools.json');

// In-memory cache for fast access & serverless environments
const inMemoryCustomSchools: CornerstoneSchoolData = {};

function cleanSchoolName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function getSeedSchools(): CornerstoneSchoolData {
  return { ...(seedSchoolsData as CornerstoneSchoolData) };
}

export function getCustomSchools(): CornerstoneSchoolData {
  const result: CornerstoneSchoolData = { ...inMemoryCustomSchools };

  try {
    if (fs.existsSync(CUSTOM_SCHOOLS_PATH)) {
      const content = fs.readFileSync(CUSTOM_SCHOOLS_PATH, 'utf-8');
      const fileData = JSON.parse(content);
      for (const [loc, schools] of Object.entries(fileData)) {
        if (!result[loc]) result[loc] = [];
        const existing = new Set(result[loc].map((s) => s.toLowerCase()));
        for (const s of schools as string[]) {
          if (!existing.has(s.toLowerCase())) {
            result[loc].push(cleanSchoolName(s));
            existing.add(s.toLowerCase());
          }
        }
      }
    }
  } catch (error) {
    // Disk write/read may fail on read-only serverless, handled gracefully by in-memory cache
  }

  return result;
}

export function getAllSchools(additionalFromRecords?: Array<{ location?: string; school?: string }>): CornerstoneSchoolData {
  const seed = getSeedSchools();
  const custom = getCustomSchools();
  const combined: CornerstoneSchoolData = {};

  // Copy seed
  for (const [loc, schools] of Object.entries(seed)) {
    combined[loc] = [...schools];
  }

  // Merge custom
  for (const [loc, schools] of Object.entries(custom)) {
    if (!combined[loc]) combined[loc] = [];
    const existing = new Set(combined[loc].map((s) => s.toLowerCase()));
    for (const s of schools) {
      if (!existing.has(s.toLowerCase())) {
        combined[loc].push(cleanSchoolName(s));
        existing.add(s.toLowerCase());
      }
    }
  }

  // Merge any schools passed from live records (e.g. from Google Sheet)
  if (additionalFromRecords && additionalFromRecords.length > 0) {
    for (const rec of additionalFromRecords) {
      if (rec.location && rec.school) {
        const locKey = rec.location.toUpperCase().trim();
        const schoolClean = cleanSchoolName(rec.school);
        if (!combined[locKey]) combined[locKey] = [];
        const existing = new Set(combined[locKey].map((s) => s.toLowerCase()));
        if (!existing.has(schoolClean.toLowerCase())) {
          combined[locKey].push(schoolClean);
          existing.add(schoolClean.toLowerCase());
        }
      }
    }
  }

  return combined;
}

export function addCustomSchool(location: string, schoolName: string): boolean {
  const cleaned = cleanSchoolName(schoolName);
  if (!cleaned || !location) return false;

  const locKey = location.toUpperCase().trim();
  const currentSchools = getAllSchools()[locKey] || [];

  const alreadyExists = currentSchools.some(
    (s) => s.toLowerCase() === cleaned.toLowerCase()
  );

  if (alreadyExists) {
    return false;
  }

  // Update in-memory
  if (!inMemoryCustomSchools[locKey]) {
    inMemoryCustomSchools[locKey] = [];
  }
  inMemoryCustomSchools[locKey].push(cleaned);

  // Try persisting to disk
  try {
    const dir = path.dirname(CUSTOM_SCHOOLS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = getCustomSchools();
    fs.writeFileSync(CUSTOM_SCHOOLS_PATH, JSON.stringify(current, null, 2), 'utf-8');
    return true;
  } catch (error) {
    // Return true since in-memory is updated
    return true;
  }
}
