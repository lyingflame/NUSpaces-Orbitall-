// Sample feedback data based on 2h periods (in 24h time) for all NUS study spots.

// Noise profiles based on category: [noise, crowd]
// Category: quiet area/library, lounge, outdoor, lab, always open
// Added for more variety: computing, utown (might add more later)
const profiles = {
  quiet_library: {
    0: [1,1], 2: [1,1], 4: [1,1], 6: [1,1],
    8: [2,2], 10: [2,3], 12: [3,4], 14: [3,3],
    16: [2,3], 18: [2,2], 20: [2,2], 22: [1,1],
  },
  always_open: {
    0: [1,2], 2: [1,1], 4: [1,1], 6: [1,1],
    8: [2,2], 10: [2,3], 12: [3,3], 14: [2,3],
    16: [2,3], 18: [2,2], 20: [2,3], 22: [2,2],
  },
  computing: {
    0: [1,1], 2: [1,1], 4: [1,1], 6: [1,1],
    8: [3,3], 10: [4,4], 12: [5,5], 14: [4,4],
    16: [3,3], 18: [2,2], 20: [2,1], 22: [1,1],
  },
  lounge: {
    0: [1,1], 2: [1,1], 4: [1,1], 6: [1,1],
    8: [2,2], 10: [3,3], 12: [4,4], 14: [3,3],
    16: [3,3], 18: [2,2], 20: [2,2], 22: [1,1],
  },
  utown: {
    0: [2,2], 2: [1,2], 4: [1,1], 6: [1,1],
    8: [3,3], 10: [3,4], 12: [4,5], 14: [4,4],
    16: [3,4], 18: [3,3], 20: [3,3], 22: [2,3],
  },
  outdoor: {
    0: [1,1], 2: [1,1], 4: [1,1], 6: [1,1],
    8: [2,1], 10: [2,2], 12: [4,4], 14: [3,4],
    16: [3,3], 18: [3,3], 20: [2,2], 22: [1,2],
  },
  study_area: {
    0: [1,1], 2: [1,1], 4: [1,1], 6: [1,1],
    8: [2,2], 10: [3,3], 12: [4,4], 14: [3,4],
    16: [3,3], 18: [2,2], 20: [2,1], 22: [1,1],
  },
  lab: {
    0: [1,1], 2: [1,1], 4: [1,1], 6: [1,1],
    8: [2,2], 10: [3,3], 12: [3,4], 14: [3,3],
    16: [2,3], 18: [2,2], 20: [2,2], 22: [1,2],
  },
};

// Study spot names
const spotProfiles = {
  // Libraries (12)
  'Central Library Level 1':                      'lounge',
  'Central Library Level 3':                      'quiet_library',
  'Central Library Level 4 Discussion Rooms':     'lounge',
  'Central Library Level 5':                      'quiet_library',
  'Central Library Level 6 Reading Area':         'quiet_library',
  'Hon Sui Sen Memorial Library':                 'quiet_library',
  'Medicine+Science Library L1 Atrium':           'always_open',
  'Medicine+Science Library L2 Study Area':       'always_open',
  'Medicine+Science Library L3 Quiet Study 01':   'always_open',
  'C J Koh Law Library':                          'quiet_library',
  'Music Library':                                'quiet_library',
  'Wan Boo Sow Chinese Library':                  'quiet_library',

  // Computing (4)
  'COM1 Level 2 Study Area':                      'computing',
  'COM1 Basement Study Area':                     'computing',
  'COM2 Basement Lounge':                         'lounge',
  'COM3 Study Area':                              'computing',

  // UTown (6)
  'UTown The Study':                              'utown',
  'UTown Plaza Level 2':                          'lounge',
  'UTown Ferguson Study':                         'utown',
  'UTown PC Commons':                             'lab',
  'UTown Mac Commons':                            'lab',
  'UTown Starbucks':                              'utown',

  // YIH (3)
  'YIH Study Room':                               'lounge',
  'YIH Level 2 Study Area':                       'outdoor',
  'YIH NUSSU Student Lounge':                     'lounge',

  // Business (1)
  'BIZ2 Study Area':                              'lounge',

  // FASS (4)
  'AS8 Outdoor Tables':                           'outdoor',
  'AS7 Computer Lab':                             'lab',
  'The Deck Study Area':                          'outdoor',
  'Maxx Coffee FASS':                             'lounge',

  // Engineering / Design (7)
  'EA Level 1 Atrium':                            'study_area',
  'EA Level 4 Study Area':                        'study_area',
  'E3 Level 6 Study Area':                        'study_area',
  'E4 Study Area':                                'study_area',
  'E7 Study Area':                                'study_area',
  'SDE Level 1 Study Area':                       'study_area',
  'SDE4 Study Area':                              'study_area',

  // Science (4)
  'S16 Study Area':                               'study_area',
  'S17 Study Area':                               'study_area',
  'Frontier Canteen Study Area':                  'outdoor',
  'CeLS Study Area':                              'study_area',

  // Medicine (1)
  'MD11 Study Area':                              'study_area',

  // Public Health (1)
  'Tahir Foundation Building Study Area':         'quiet_library',

  // Other (2)
  'i3 Building Study Area':                       'lounge',
  'Ventus Study Area':                            'study_area',
};

// Comments per time period (3 each for now with random empty comments)
const comments = {
  0:  ['Late night study session.', 'Mostly empty, good for night owls.', 'Quiet night.'],
  2:  ['Dead quiet.', '2AM, nobody around.', 'Complete silence.', ''],
  4:  ['Early morning, totally empty.', 'Pre-dawn quiet.', ''],
  6:  ['Early bird session.', 'Just arrived, very quiet.', ''],
  8:  ['Morning crowd arriving.', 'Starting to fill up.', 'Good morning atmosphere.', ''],
  10: ['Mid-morning, getting busy.', 'Decent crowd now.', 'Settled in nicely.'],
  12: ['Lunch hour, busiest time.', 'Packed during lunch.', 'Noisy lunch crowd.', 'Finding seats is hard.', ''],
  14: ['Post-lunch, area getting less crowded.', 'Still busy but manageable.', 'Afternoon session.'],
  16: ['Afternoon crowd.', 'Some people leaving.', 'Moderately noisy.'],
  18: ['Evening, crowd is thinning out.', 'Dinner time, fewer people.', 'Nice evening study vibe.'],
  20: ['Evening session, pretty calm.', 'Good studying time.', 'Quiet evening.'],
  22: ['Late evening, very few left.', 'Peaceful night.', 'Getting quiet now.', ''],
};

// Add random +-1 variation
function vary(value) {
  const offset = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  return Math.min(5, Math.max(1, value + offset));
}

// Random comment picker
function pickComment(hour) {
  const options = comments[hour] || [''];
  return options[Math.floor(Math.random() * options.length)];
}

// Calculate hoursAgo for specific hour of day feedback
function hoursAgo(targetHour, dayOffset) {
  const currentHour = new Date().getHours();
  let diff = currentHour - targetHour + (dayOffset * 24);
  if (diff < 0) diff += 24;
  return diff;
}

// [spotName, noise, crowd, comment, hoursAgo]
function generateFeedback() {
  const feedback = [];
  const time_of_day = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const daysBack = [1, 3, 5, 7];

  for (const [spotName, profileName] of Object.entries(spotProfiles)) {
    const profile = profiles[profileName];
    for (const day of daysBack) {
      for (const hour of time_of_day) {
        const [baseNoise, baseCrowd] = profile[hour];
        feedback.push([
          spotName,
          vary(baseNoise),
          vary(baseCrowd),
          pickComment(hour),
          hoursAgo(hour, day),
        ]);
      }
    }
  }
  return feedback;
}

module.exports = { generateFeedback };
