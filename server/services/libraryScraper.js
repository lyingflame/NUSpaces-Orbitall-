// NUS Libraries Data Scraper
// https://nus.edu.sg/nuslibraries/spaces/our-libraries

const cheerio = require('cheerio');
const { query } = require('../config/database');

const NUS_LIBRARIES_URL = 'https://nus.edu.sg/nuslibraries/spaces/our-libraries';

// Map website names to database names
const LIBRARY_NAME_MAP = {
  'Central Library':                          'Central Library',
  'C J Koh Law Library':                      'C J Koh Law Library',
  'Hon Sui Sen Memorial Library':             'Hon Sui Sen Memorial Library',
  'Medicine+Science Library':                 'Medicine+Science Library',
  'Music Library':                            'Music Library',
  'Wan Boo Sow Chinese Library':              'Wan Boo Sow Chinese Library',
  'Wan Boo Sow Chinese Library (雲茂潮中文图书馆)': 'Wan Boo Sow Chinese Library',
};

// Map website area names to study spots
const SUBAREA_NAME_MAP = {
  'L1 Atrium':        'Medicine+Science Library L1 Atrium',
  'L2 Study Area':    'Medicine+Science Library L2 Study Area',
  'L3 Quiet Study 01':'Medicine+Science Library L3 Quiet Study 01',
  'L3 (Level 3)':     'Central Library Level 3',
  'L6 Reading Area':  'Central Library Level 6 Reading Area',
};

async function fetchPage() {
  const response = await fetch(NUS_LIBRARIES_URL, {
    headers: {
      'User-Agent': 'NUSpaces (Orbital)',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch NUS Libraries page: ${response.status}`);
  }

  return response.text();
}

// Crowd update (hourly)
async function scrapeOccupancy() {
  const html = await fetchPage();
  const $ = cheerio.load(html);
  const results = [];

  // Sidebar on website contains occupancy data
  const sidebarItems = $('.sidebar-opening-hours .sidebar-library, .opening-hours-sidebar .library-item');

  // Backup: Parse HTML directly
  const pageText = html;
  const libraryNames = Object.keys(LIBRARY_NAME_MAP);

  for (const libName of libraryNames) {
    // Find occupancy percentage
    const occupancyRegex = new RegExp(
      libName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '[\\s\\S]*?(?:Occupancy|Not Crowded|Crowded)\\s*\\(?([\\d]+)%\\)?',
      'i'
    );

    const match = pageText.match(occupancyRegex);
    if (match) {
      const occupancyPercent = parseInt(match[1]);
      const mappedName = LIBRARY_NAME_MAP[libName] || libName;

      results.push({
        name: mappedName,
        occupancy: occupancyPercent,
      });
    }
  }

  // Update NUS libraries crowd level
  let updated = 0;
  for (const lib of results) {
    // Find spot
    const spotResult = await query(
      `SELECT id FROM study_spots WHERE name LIKE $1 OR building LIKE $1 LIMIT 1`,
      [`%${lib.name}%`]
    );

    if (spotResult.rows.length > 0) {
      const spotId = spotResult.rows[0].id;
      // Convert library occupancy 0-100% to 0-100 crowd level
      await query(
        `UPDATE spot_scores SET avg_crowd = $1, last_updated = NOW() WHERE spot_id = $2`,
        [lib.occupancy, spotId]
      );
      updated++;
    }
  }

  console.log(`[SCRAPER] Updated occupancy for ${updated} libraries:`,
    results.map(r => `${r.name}: ${r.occupancy}%`).join(', '));

  return { updated, results };
}

// Open/Close status update (Daily)
async function scrapeSchedules() {
  const html = await fetchPage();
  const $ = cheerio.load(html);
  const results = { schedules: [], closures: [], shortenedHours: [] };

  // Parse closure tables
  const closureDates = [];
  const shortenedDates = [];

  // Find closure dates from table
  $('table').each((_, table) => {
    const tableText = $(table).text();

    if (tableText.includes('closed on the following dates')) {
      $(table).find('td').each((_, td) => {
        const text = $(td).text().trim();
        if (!text) return;

        // Parse date like "Thu, 1 Jan 2026" or "Tue, 26 May 2026 (Staff Event)"
        const dateMatch = text.match(/\w+,\s+(\d+)\s+(\w+)\s+(\d{4})/);
        if (dateMatch) {
          const [, day, monthStr, year] = dateMatch;
          const month = monthToNum(monthStr);
          if (month !== null) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const reason = text.match(/\(([^)]+)\)/)?.[1] || 'Public Holiday';
            closureDates.push({ date: dateStr, reason });
          }
        }
      });
    }

    if (tableText.includes('shortened on the following dates')) {
      $(table).find('td').each((_, td) => {
        const text = $(td).text().trim();
        if (!text) return;

        const dateMatch = text.match(/\w+,\s+(\d+)\s+(\w+)\s+(\d{4})/);
        const timeMatch = text.match(/Closes at (\d+:\d+\s*[ap]m)/i);
        if (dateMatch && timeMatch) {
          const [, day, monthStr, year] = dateMatch;
          const month = monthToNum(monthStr);
          if (month !== null) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const closingTime = parseTime12to24(timeMatch[1]);
            const reason = text.match(/\(([^)]+)\)/)?.[1] || 'Shortened hours';
            shortenedDates.push({ date: dateStr, closingTime, reason });
          }
        }
      });
    }
  });

  results.closures = closureDates;
  results.shortenedHours = shortenedDates;

  // Add overrides (closures) to database
  let overridesAdded = 0;

  // Get all library IDs
  const librarySpots = await query(
    `SELECT id, name FROM study_spots WHERE spot_type = 'library'`
  );

  for (const closure of closureDates) {
    for (const spot of librarySpots.rows) {
      // Skip 24h spots
      if (spot.name.includes('L1 Atrium') || spot.name.includes('L2 Study Area')) {
        continue;
      }

      // Check if override exists
      const existing = await query(
        `SELECT id FROM spot_schedule_overrides
         WHERE spot_id = $1 AND start_date = $2 AND end_date = $2`,
        [spot.id, closure.date]
      );

      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO spot_schedule_overrides
           (spot_id, start_date, end_date, is_closed, reason)
           VALUES ($1, $2, $2, true, $3)`,
          [spot.id, closure.date, closure.reason]
        );
        overridesAdded++;
      }
    }
  }

  // Shortened dates overrides
  for (const shortened of shortenedDates) {
    for (const spot of librarySpots.rows) {
      if (spot.name.includes('L1 Atrium') || spot.name.includes('L2 Study Area')) {
        continue;
      }

      const existing = await query(
        `SELECT id FROM spot_schedule_overrides
         WHERE spot_id = $1 AND start_date = $2 AND end_date = $2`,
        [spot.id, shortened.date]
      );

      if (existing.rows.length === 0) {
        // For early closing
        const scheduleResult = await query(
          `SELECT opening_time FROM spot_schedules
           WHERE spot_id = $1 AND day_of_week = 'weekday' LIMIT 1`,
          [spot.id]
        );
        const openingTime = scheduleResult.rows[0]?.opening_time?.slice(0, 5) || '09:00';

        await query(
          `INSERT INTO spot_schedule_overrides
           (spot_id, start_date, end_date, opening_time, closing_time, reason)
           VALUES ($1, $2, $2, $3, $4, $5)`,
          [spot.id, shortened.date, openingTime, shortened.closingTime, shortened.reason]
        );
        overridesAdded++;
      }
    }
  }

  console.log(`[SCRAPER] Found ${closureDates.length} closure dates, ${shortenedDates.length} shortened dates.`);
  console.log(`[SCRAPER] Added ${overridesAdded} new schedule overrides.`);

  return results;
}

// Manual scrapper endpoint (for testing)
async function scrapeAll() {
  const occupancy = await scrapeOccupancy();
  const schedules = await scrapeSchedules();
  return { occupancy, schedules };
}

// Convert month name to numbers
function monthToNum(monthStr) {
  const months = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  };
  return months[monthStr.toLowerCase().slice(0, 3)] || null;
}

// Convert 12h time to 24h time
function parseTime12to24(timeStr) {
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!match) return null;

  let [, hours, minutes, period] = match;
  hours = parseInt(hours);
  if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  if (period.toLowerCase() === 'am' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

module.exports = { scrapeOccupancy, scrapeSchedules, scrapeAll };
