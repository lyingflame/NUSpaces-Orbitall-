// Initial seed data for NUS locations
const path = require('path');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../config/database');
const { generateFeedback } = require('./generateFeedback');

// Study Spots: 45
const studySpots = [
  // NUS Libraries: 12
  {
    name: 'Central Library Level 1', building: 'Central Library',
    faculty: ['University'], spot_type: 'lounge',
    latitude: 1.2966, longitude: 103.7732, capacity: 40,
    has_power: true, has_aircon: true,
    description: 'Casual study area near Maxx Coffee (NUS Coop) and Soup Spoon. New book displays and consultation desks.',
    schedule: { weekday: ['09:00','21:00'], saturday: 'closed', sunday: 'closed' },
  },
  {
    name: 'Central Library Level 3', building: 'Central Library',
    faculty: ['University'], spot_type: 'library',
    latitude: 1.2966, longitude: 103.7732, capacity: 200,
    has_power: true, has_aircon: true,
    description: 'Quiet area with individual study desks, multimedia workstations and power outlets.',
    schedule: { weekday: ['09:00','21:00'], saturday: 'closed', sunday: 'closed' },
  },
  {
    name: 'Central Library Level 4 Discussion Rooms', building: 'Central Library',
    faculty: ['University'], spot_type: 'study_room',
    latitude: 1.2966, longitude: 103.7732, capacity: 80,
    has_power: true, has_aircon: true,
    description: 'Soundproof group discussion rooms with smart whiteboards and video conferencing. Booking required, which can be done via uNivUS.',
    schedule: { weekday: ['09:00','21:00'], saturday: 'closed', sunday: 'closed' },
  },
  {
    name: 'Central Library Level 5', building: 'Central Library',
    faculty: ['University'], spot_type: 'library',
    latitude: 1.2966, longitude: 103.7732, capacity: 150,
    has_power: true, has_aircon: true,
    description: 'Quiet study zone above Level 4. Strict noise management enforced, ideal for reading and thesis writing.',
    schedule: { weekday: ['09:00','21:00'], saturday: 'closed', sunday: 'closed' },
  },
  {
    name: 'Central Library Level 6 Reading Area', building: 'Central Library',
    faculty: ['University'], spot_type: 'library',
    latitude: 1.2965, longitude: 103.7731, capacity: 60,
    has_power: true, has_aircon: true,
    description: 'Study area with individual cubicles with access via NUS card. Extended to 24/7 during exam periods.',
    schedule: { weekday: ['09:00','21:00'], saturday: ['10:00','17:00'], sunday: 'closed' },
  },
  {
    name: 'Hon Sui Sen Memorial Library', building: 'Hon Sui Sen Memorial Library',
    faculty: ['Business'], spot_type: 'library',
    latitude: 1.2931, longitude: 103.7746, capacity: 150,
    has_power: true, has_aircon: true,
    description: 'Business school library with quiet individual study areas. Financial data terminals and case discussion rooms available.',
    schedule: { weekday: ['08:00','22:00'], saturday: ['08:00','18:30'], sunday: 'closed' },
  },
  {
    name: 'Medicine+Science Library L1 Atrium', building: 'Medicine+Science Library',
    faculty: ['Medicine', 'Science'], spot_type: 'library',
    latitude: 1.2970, longitude: 103.7814, capacity: 20,
    has_power: true, has_aircon: true,
    description: 'Quiet study spot near main entrance that is open 24/7. Good Day Cafe nearby for food and coffee. ',
    schedule: { weekday: '24hr', saturday: '24hr', sunday: '24hr' },
  },
  {
    name: 'Medicine+Science Library L2 Study Area', building: 'Medicine+Science Library',
    faculty: ['Medicine', 'Science'], spot_type: 'library',
    latitude: 1.2970, longitude: 103.7814, capacity: 60,
    has_power: true, has_aircon: true,
    description: 'Quiet library study area near Frontier Canteen with flexible seating. Open 24/7.',
    schedule: { weekday: '24hr', saturday: '24hr', sunday: '24hr' },
  },
  {
    name: 'Medicine+Science Library L3 Quiet Study 01', building: 'Medicine+Science Library',
    faculty: ['Medicine', 'Science'], spot_type: 'library',
    latitude: 1.2970, longitude: 103.7814, capacity: 60,
    has_power: true, has_aircon: true,
    description: 'Quiet library spot with individual cubicles. Open 24/7 during term, closed during vacation.',
    schedule: { weekday: '24hr', saturday: '24hr', sunday: '24hr' },
  },
  {
    name: 'C J Koh Law Library', building: 'C J Koh Law Library',
    faculty: ['Law'], spot_type: 'library',
    latitude: 1.3187, longitude: 103.8181, capacity: 100,
    has_power: true, has_aircon: true,
    description: 'Law library at Bukit Timah campus. Very quiet environment with beautiful interior design. Angsana Room offers 24hr access.',
    schedule: { weekday: ['09:00','21:00'], saturday: ['10:00','17:00'], sunday: 'closed' },
  },
  {
    name: 'Music Library', building: 'Music Library',
    faculty: ['Music'], spot_type: 'library',
    latitude: 1.3019, longitude: 103.7729, capacity: 100,
    has_power: true, has_aircon: true,
    description: 'Music library in Yong Siew Toh Conservatory near NUS Museum. Very quiet with kind counter staff.',
    schedule: { weekday: ['09:00','20:00'], saturday: 'closed', sunday: 'closed' },
  },
  {
    name: 'Wan Boo Sow Chinese Library', building: 'Wan Boo Sow Chinese Library',
    faculty: ['Arts & Social Sciences'], spot_type: 'library',
    latitude: 1.2970, longitude: 103.7733, capacity: 100,
    has_power: true, has_aircon: true,
    description: 'Chinese Library connected to Central Library. Rich collection of books for Chinese and Japanese studies.',
    schedule: { weekday: ['09:00','20:00'], saturday: ['10:00','16:00'], sunday: 'closed' },
  },

  // Computing: 4
  {
    name: 'COM1 Level 2 Study Area', building: 'COM1',
    faculty: ['Computing'], spot_type: 'study_room',
    latitude: 1.2948, longitude: 103.7740, capacity: 40, 
    has_power: false, has_aircon: true,
    description: 'Open study area in COM1 near computing lecture venues. Can get noisy between classes.',
    schedule: null,
  },
  {
    name: 'COM1 Basement Study Area', building: 'COM1',
    faculty: ['Computing'], spot_type: 'study_room',
    latitude: 1.2951, longitude: 103.7738,
    capacity: 50, has_power: false, has_aircon: true,
    description: 'Open study area near computing labs. Can get noisy between classes.',
    schedule: null,
  },
  {
    name: 'COM2 Basement Lounge', building: 'COM2',
    faculty: ['Computing'], spot_type: 'lounge',
    latitude: 1.2942, longitude: 103.7740, capacity: 30, 
    has_power: true, has_aircon: true,
    description: 'Quiet basement lounge with sofas and tables.',
    schedule: null,
  },
  {
    name: 'COM3 Study Area', building: 'COM3',
    faculty: ['Computing'], spot_type: 'study_room',
    latitude: 1.2935, longitude: 103.7747, capacity: 35,
    has_power: true, has_aircon: true,
    description: 'Study area near COM3 food court. Convenient for getting food between study sessions.',
    schedule: null,
  },

  // UTown: 6
  {
    name: 'UTown The Study', building: 'Education Resource Centre',
    faculty: ['University'], spot_type: 'study_room',
    latitude: 1.3050, longitude: 103.7726, capacity: 100,
    has_power: true, has_aircon: true,
    description: 'Large study area at ERC Level 2. Generally quiet area with individual desks',
    schedule: { weekday: '24hr', saturday: '24hr', sunday: '24hr' },
  },
  {
    name: 'UTown Plaza Level 2', building: 'Stephen Riady Centre',
    faculty: ['University'], spot_type: 'lounge',
    latitude: 1.3049, longitude: 103.7727, capacity: 40,
    has_power: false, has_aircon: true,
    description: 'Casual seating near seminar rooms in Town Plaza. Background noise from foot traffic.',
    schedule: null,
  },
  {
    name: 'UTown Ferguson Study', building: 'Education Resource Centre',
    faculty: ['University'], spot_type: 'study_room',
    latitude: 1.3050, longitude: 103.7726, capacity: 50,
    has_power: true, has_aircon: true,
    description: 'Ian and Peony Ferguson Study at ERC Level 3. Quiet study environment.',
    schedule: { weekday: ['08:00','22:00'], saturday: ['08:00','22:00'], sunday: ['08:00','22:00'] },
  },
  {
    name: 'UTown PC Commons', building: 'Education Resource Centre',
    faculty: ['University'], spot_type: 'lab',
    latitude: 1.3050, longitude: 103.7726, capacity: 80,
    has_power: true, has_aircon: true,
    description: '24/7 Computer lab with Windows PCs. Highly booked during finals period. Reserve via Chope@NUS.',
    schedule: { weekday: '24hr', saturday: '24hr', sunday: '24hr' },
  },
  {
    name: 'UTown Mac Commons', building: 'Education Resource Centre',
    faculty: ['University'], spot_type: 'lab',
    latitude: 1.3050, longitude: 103.7726, capacity: 40,
    has_power: true, has_aircon: true,
    description: '24/7 Mac Computer Lab at ERC Level 1. Popular with design and media students.',
    schedule: { weekday: '24hr', saturday: '24hr', sunday: '24hr' },
  },
  {
    name: 'UTown Starbucks', building: 'Stephen Riady Centre',
    faculty: ['University'], spot_type: 'lounge',
    latitude: 1.3049, longitude: 103.7727, capacity: 30,
    has_power: false, has_aircon: true,
    description: 'Starbucks in UTown, open 24/7. May be crowded during lunch and dinner hours.',
    schedule: { weekday: '24hr', saturday: '24hr', sunday: '24hr' },
  },

  // YIH: 3
  {
    name: 'YIH Study Room', building: 'Yusof Ishak House',
    faculty: ['University'], spot_type: 'study_room',
    latitude: 1.2988, longitude: 103.7750, capacity: 30,
    has_power: true, has_aircon: true,
    description: 'Small study room in YIH. Quiet during off-peak hours.',
    schedule: { weekday: ['08:00','22:00'], saturday: ['08:00','22:00'], sunday: ['08:00','22:00'] },
  },
  {
    name: 'YIH Level 2 Study Area', building: 'Yusof Ishak House',
    faculty: ['University'], spot_type: 'outdoor',
    latitude: 1.2988, longitude: 103.7750, capacity: 30, 
    has_power: true, has_aircon: false,
    description: 'Outdoor study area in YIH. Crowded during exam period.',
    schedule: null,
  },
  {
    name: 'YIH NUSSU Student Lounge', building: 'Yusof Ishak House',
    faculty: ['University'], spot_type: 'lounge',
    latitude: 1.2988, longitude: 103.7750, capacity: 50,
    has_power: true, has_aircon: true,
    description: 'NUSSU Student Lounge at YIH Level 4. Spacious and air-conditioned.',
    schedule: { weekday: ['08:00','22:00'], saturday: ['08:00','22:00'], sunday: 'closed' },
  },

  // Business: 1
  {
    name: 'BIZ2 Study Area', building: 'BIZ2',
    faculty: ['Business'], spot_type: 'study_room',
    latitude: 1.2929, longitude: 103.7743, capacity: 35,
    has_power: true, has_aircon: true,
    description: 'Study area near Business faculty. Shortcut through Imagen Holdings to reach Science.',
    schedule: null,
  },

  // Arts & Social Sciences: 4
  {
    name: 'AS8 Outdoor Tables', building: 'AS8',
    faculty: ['Arts & Social Sciences'], spot_type: 'outdoor',
    latitude: 1.2956, longitude: 103.7716, capacity: 20, 
    has_power: false, has_aircon: false,
    description: 'Shaded outdoor tables. Best during cooler hours.',
    schedule: null,
  },
  {
    name: 'AS7 Computer Lab', building: 'AS7',
    faculty: ['Arts & Social Sciences'], spot_type: 'lab',
    latitude: 1.2953, longitude: 103.7718, capacity: 30,
    has_power: true, has_aircon: true,
    description: 'Computer lab in AS7. Less crowded printing area compared to Central Library.',
    schedule: { weekday: ['08:00','21:00'], saturday: ['08:00','17:00'], sunday: 'closed' },
  },
  {
    name: 'The Deck Study Area', building: 'FASS',
    faculty: ['Arts & Social Sciences'], spot_type: 'outdoor',
    latitude: 1.2952, longitude: 103.7722, capacity: 40,
    has_power: false, has_aircon: false,
    description: 'Open area at The Deck near FASS canteen. Shortcut path to Computing and Business.',
    schedule: null,
  },
  {
    name: 'Maxx Coffee FASS', building: 'AS2',
    faculty: ['Arts & Social Sciences'], spot_type: 'lounge',
    latitude: 1.2955, longitude: 103.7720, capacity: 25,
    has_power: false, has_aircon: true,
    description: 'Cafe in FASS with food and drinks. Moderate background noise, good for casual study.',
    schedule: { weekday: ['08:00','20:00'], saturday: ['08:00','18:00'], sunday: 'closed' },
  },

  // Engineering: 7
  {
    name: 'EA Level 1 Atrium', building: 'EA',
    faculty: ['Design & Engineering'], spot_type: 'study_room',
    latitude: 1.3005, longitude: 103.7709, capacity: 80,
    has_power: true, has_aircon: true,
    description: 'Air-conditioned atrium with vending machines. Near Engineering bus stop.',
    schedule: null,
  },
  {
    name: 'EA Level 4 Study Area', building: 'EA',
    faculty: ['Design & Engineering'], spot_type: 'study_room',
    latitude: 1.3005, longitude: 103.7709, capacity: 20,
    has_power: true, has_aircon: true,
    description: 'Less crowded upper level in EA building. Good alternative to the Level 1 Atrium.',
    schedule: null,
  },
  {
    name: 'E3 Level 6 Study Area', building: 'E3',
    faculty: ['Design & Engineering'], spot_type: 'study_room',
    latitude: 1.2987, longitude: 103.7711, capacity: 35,
    has_power: true, has_aircon: true,
    description: 'Study tables outside engineering lecture halls. Cheers convenience store nearby.',
    schedule: { weekday: ['07:30','22:00'], saturday: ['07:30','22:00'], sunday: ['07:30','22:00'] },
  },
  {
    name: 'E4 Study Area', building: 'E4',
    faculty: ['Design & Engineering'], spot_type: 'study_room',
    latitude: 1.2982, longitude: 103.7716, capacity: 30,
    has_power: true, has_aircon: true,
    description: 'Study area near Rise and Shine cafe and LT6. Convenient between engineering lectures.',
    schedule: null,
  },
  {
    name: 'E7 Study Area', building: 'E7',
    faculty: ['Design & Engineering'], spot_type: 'study_room',
    latitude: 1.2985, longitude: 103.7706, capacity: 30,
    has_power: true, has_aircon: true,
    description: 'Hidden gem near YIH and Huggs Coffee. About 6-8 long tables seating 4 each. 24/7 access via NUS card.',
    schedule: null,
  },
  {
    name: 'SDE Level 1 Study Area', building: 'SDE2',
    faculty: ['Design & Engineering'], spot_type: 'study_room',
    latitude: 1.2975, longitude: 103.7708, capacity: 25,
    has_power: true, has_aircon: true,
    description: 'Study area in the School of Design and Environment building. Large tables and 3D printing nearby.',
    schedule: null,
  },
  {
    name: 'SDE4 Study Area', building: 'SDE4',
    faculty: ['Design & Engineering'], spot_type: 'study_room',
    latitude: 1.2973, longitude: 103.7700, capacity: 35,
    has_power: true, has_aircon: true,
    description: 'Net-zero energy building with modern study spaces. Near Chinese Library and Central Library.',
    schedule: null,
  },

  // Science: 4
  {
    name: 'S16 Study Area', building: 'S16',
    faculty: ['Science'], spot_type: 'study_room',
    latitude: 1.2966, longitude: 103.7807, capacity: 40,
    has_power: true, has_aircon: true,
    description: 'Study area in the Science block S16. Quiet outside of class hours.',
    schedule: null,
  },
  {
    name: 'S17 Study Area', building: 'S17',
    faculty: ['Science'], spot_type: 'study_room',
    latitude: 1.2982, longitude: 103.7804, capacity: 30,
    has_power: true, has_aircon: true,
    description: 'Study area in Science block S17 near bus stop. Near LT33 and LT34, convenient for studying between lectures.',
    schedule: null,
  },
  {
    name: 'Frontier Canteen Study Area', building: 'Science',
    faculty: ['Science'], spot_type: 'outdoor',
    latitude: 1.2967, longitude: 103.7805, capacity: 30,
    has_power: false, has_aircon: false,
    description: 'Open seating area near Frontier canteen and Medicine+Science Library. Convenient for meals.',
    schedule: null,
  },
  {
    name: 'CeLS Study Area', building: 'CeLS',
    faculty: ['Science'], spot_type: 'study_room',
    latitude: 1.2949, longitude: 103.7808, capacity: 20,
    has_power: true, has_aircon: true,
    description: 'Study area in Centre for Life Sciences building. Near Faculty of Science.',
    schedule: null,
  },

  // Medicine: 1
  {
    name: 'MD11 Study Area', building: 'MD11',
    faculty: ['Medicine'], spot_type: 'study_room',
    latitude: 1.2954, longitude: 103.7822, capacity: 25,
    has_power: true, has_aircon: true,
    description: 'Study area in the medical block near Starbucks MD11. Close to NUH.',
    schedule: null,
  },

  // Public Health: 1
  {
    name: 'Tahir Foundation Building Study Area', building: 'Tahir Foundation Building',
    faculty: ['Public Health'], spot_type: 'study_room',
    latitude: 1.2955, longitude: 103.7810, capacity: 20,
    has_power: true, has_aircon: true,
    description: 'Study area in the Saw Swee Hock School of Public Health building.',
    schedule: null,
  },

  // Others: 2
  {
    name: 'i3 Building Study Area', building: 'i3',
    faculty: ['University'], spot_type: 'study_room',
    latitude: 1.2928, longitude: 103.7760, capacity: 25,
    has_power: true, has_aircon: true,
    description: 'Study area in the i3 building near NUS Enterprise. Sheltered walkway from Computing.',
    schedule: null,
  },
  {
    name: 'Ventus Study Area', building: 'Ventus',
    faculty: ['University'], spot_type: 'study_room',
    latitude: 1.2953, longitude: 103.7703, capacity: 30,
    has_power: true, has_aircon: true,
    description: 'Study area near Ventus bus stop and LT13. Campus infrastructure building with student spaces.',
    schedule: null,
  },
];

// Example overrides — holidays and special dates (Need to update)
const overrides = [
  { spotName: 'Central Library Level 6 Reading Area',       start_date: '2026-04-13', end_date: '2026-05-08', is_24hr: true,  reason: 'Level 6 Reading Area will be open to NUS staff and students 24/7 from the evening of Monday, 13 April 2026 to the evening of Friday, 8 May 2026.' },
  { spotName: 'Central Library Level 3',                    start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true,  reason: 'Library Staff Event' },
  { spotName: 'Central Library Level 3',                    start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true,  reason: 'Hari Raya Haji' },
  { spotName: 'Hon Sui Sen Memorial Library',               start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true,  reason: 'Library Staff Event' },
  { spotName: 'Hon Sui Sen Memorial Library',               start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true, reason: 'Hari Raya Haji' },
  { spotName: 'Medicine+Science Library L3 Quiet Study 01', start_date: '2026-05-11', end_date: '2026-08-04', is_closed: true,  reason: 'Closed during holidays' },
  { spotName: 'C J Koh Law Library',                        start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true,  reason: 'Library Staff Event' },
  { spotName: 'C J Koh Law Library',                        start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true,  reason: 'Hari Raya Haji' },
  { spotName: 'Music Library',                              start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true,  reason: 'Library Staff Event' },
  { spotName: 'Music Library',                              start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true,  reason: 'Hari Raya Haji' }
  { spotName: 'Central Library Level 1',                    start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true, reason: 'Library Staff Event' },
  { spotName: 'Central Library Level 1',                    start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true, reason: 'Hari Raya Haji' },
  { spotName: 'Central Library Level 4 Discussion Rooms',   start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true, reason: 'Library Staff Event' },
  { spotName: 'Central Library Level 4 Discussion Rooms',   start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true, reason: 'Hari Raya Haji' },
  { spotName: 'Central Library Level 5',                    start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true, reason: 'Library Staff Event' },
  { spotName: 'Central Library Level 5',                    start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true, reason: 'Hari Raya Haji' },
  { spotName: 'Wan Boo Sow Chinese Library',                start_date: '2026-05-26', end_date: '2026-05-26', is_closed: true, reason: 'Library Staff Event' },
  { spotName: 'Wan Boo Sow Chinese Library',                start_date: '2026-05-27', end_date: '2026-05-27', is_closed: true, reason: 'Hari Raya Haji' },
];

// Example feedback: [spotName, noise_level(1-5), crowd_level(1-5), comment, hoursAgo] (might consider removing)
const exampleFeedback = [
  ['Central Library Level 3', 1, 2, 'Very quiet, barely anyone here.',            2],
  ['Central Library Level 3', 2, 3, 'A bit busier than usual but still okay.',    5],
  ['Central Library Level 3', 1, 1, 'Empty and silent. Perfect.',                 8],
  ['Central Library Level 3', 2, 2, 'Quiet afternoon.',                          26],
  ['Central Library Level 3', 3, 4, 'Getting crowded before exams.',             30],
  ['Central Library Level 3', 1, 2, 'Morning session, very calm.',               50],
  ['Central Library Level 3', 2, 3, 'Moderate crowd after lunch.',               74],
  ['Central Library Level 3', 1, 1, 'Weekend morning, almost empty.',            98],

  ['Central Library Level 6 Reading Area', 3, 3, 'Some group discussions going on.',        3],
  ['Central Library Level 6 Reading Area', 4, 4, 'Noisy group project session.',            7],
  ['Central Library Level 6 Reading Area', 2, 2, 'Quiet evening.',                         25],
  ['Central Library Level 6 Reading Area', 3, 3, 'Moderate noise, typical weekday.',       49],
  ['Central Library Level 6 Reading Area', 4, 5, 'Full during exam prep.',                 73],

  ['COM1 Level 2 Study Area', 4, 4, 'Noisy after lecture ended.',                 1],
  ['COM1 Level 2 Study Area', 3, 3, 'Moderate noise, some chatter.',              4],
  ['COM1 Level 2 Study Area', 5, 5, 'Lecture just ended, very crowded.',          6],
  ['COM1 Level 2 Study Area', 2, 2, 'Evening, most people left.',                10],
  ['COM1 Level 2 Study Area', 4, 4, 'Lunch hour rush.',                          28],
  ['COM1 Level 2 Study Area', 3, 3, 'Between classes, moderate.',                52],
  ['COM1 Level 2 Study Area', 1, 1, 'Late night, completely empty.',             76],

  ['COM1 Basement Study Area', 3, 3, 'Some lab students studying.',                3],
  ['COM1 Basement Study Area', 2, 2, 'Quiet afternoon.',                          27],
  ['COM1 Basement Study Area', 4, 4, 'Busy before midterms.',                     51],
  ['COM1 Basement Study Area', 2, 1, 'Late evening, quiet.',                      75],

  ['COM2 Basement Lounge', 1, 1, 'Hidden gem. Nobody here.',                   2],
  ['COM2 Basement Lounge', 2, 2, 'A few people but very quiet.',               6],
  ['COM2 Basement Lounge', 1, 1, 'Silent as always.',                         26],
  ['COM2 Basement Lounge', 2, 2, 'Peaceful study session.',                   50],

  ['Hon Sui Sen Memorial Library', 1, 2, 'Quiet and spacious.',               4],
  ['Hon Sui Sen Memorial Library', 2, 3, 'Some seats taken but still quiet.', 8],
  ['Hon Sui Sen Memorial Library', 1, 1, 'Morning, very few people.',        28],

  ['Medicine+Science Library L1 Atrium', 2, 3, 'Small space, a few people.',       5],
  ['Medicine+Science Library L1 Atrium', 3, 4, 'Limited seats, feeling crowded.', 29],

  ['Medicine+Science Library L2 Study Area', 1, 2, 'Very quiet study area.',        3],
  ['Medicine+Science Library L2 Study Area', 2, 2, 'Calm and focused atmosphere.', 27],

  ['Medicine+Science Library L3 Quiet Study 01', 1, 1, 'Silent. Perfect for deep work.', 4],
  ['Medicine+Science Library L3 Quiet Study 01', 1, 1, 'Dead quiet as expected.',       28],

  ['C J Koh Law Library', 1, 1, 'Extremely quiet. Could hear a pin drop.', 6],
  ['C J Koh Law Library', 1, 2, 'Very peaceful, great for focused work.', 30],

  ['Music Library', 1, 1, 'Basically empty, very calm.', 5],

  ['Wan Boo Sow Chinese Library', 2, 2, 'Quiet with a few regulars.',       4],
  ['Wan Boo Sow Chinese Library', 1, 1, 'Saturday morning, almost empty.', 28],

  ['UTown The Study', 3, 4, 'Popular spot, most seats taken.', 2],
  ['UTown The Study', 2, 3, 'Late night, thinning out.',       8],
  ['UTown The Study', 4, 5, 'Exam period, completely full.',  26],

  ['UTown Plaza Level 2', 3, 3, 'Foot traffic noise but manageable.', 3],
  ['UTown Plaza Level 2', 4, 4, 'Lunch hour, very noisy.',           27],

  ['YIH Study Room', 2, 2, 'Quiet during the afternoon.',      4],
  ['YIH Study Room', 3, 3, 'Exam period, busier than usual.', 28],

  ['YIH Level 2 Study Area', 3, 3, 'Warm but bearable in the evening.', 5],

  ['AS8 Outdoor Tables', 2, 1, 'Nice breeze, nobody around.',    4],
  ['AS8 Outdoor Tables', 3, 2, 'A bit warm but quiet.',         28],

  ['E3 Level 6 Study Area', 2, 2, 'Quiet between classes.',       3],
  ['E3 Level 6 Study Area', 4, 4, 'Lab sessions nearby, noisy.', 27],
]

async function seed() {
  try {
    // Remove any existing data
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM spot_schedule_overrides');
    await pool.query('DELETE FROM spot_schedules');
    await pool.query('DELETE FROM spot_scores');
    await pool.query('DELETE FROM feedback');
    await pool.query('DELETE FROM study_spots');
    await pool.query('DELETE FROM users');
    console.log('Cleared existing data.\n');

    // Add test user (debugging)
    const passwordHash = await bcrypt.hash('password123', 12);
    const userResult = await pool.query(
      `INSERT INTO users (email, username, password_hash, role)
       VALUES ('e1234567@u.nus.edu', 'alextan', $1, 'user') RETURNING id`,
      [passwordHash]
    );
    const testUserId = userResult.rows[0].id;
    console.log('  Created test user: e1234567@u.nus.edu / password123\n');

    // Add admin user (debugging)
    const adminHash = await bcrypt.hash('admin123', 12);
    await pool.query(
      `INSERT INTO users (email, username, password_hash, role)
      VALUES ('admin@u.nus.edu', 'admin', $1, 'admin')`,
      [adminHash]
    );
    console.log('  Created admin user: admin@u.nus.edu / admin123\n');

    // Add study spots
    const spotNameToId = {};

    for (const spot of studySpots) {
      const result = await pool.query(
        `INSERT INTO study_spots
         (name, building, faculty, spot_type, latitude, longitude,
          capacity, has_power, has_aircon, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [spot.name, spot.building, spot.faculty, spot.spot_type,
         spot.latitude, spot.longitude, spot.capacity,
         spot.has_power, spot.has_aircon, spot.description]
      );
      const spotId = result.rows[0].id;
      spotNameToId[spot.name] = spotId;

      // Default feedback scores
      await pool.query(
        `INSERT INTO spot_scores
         (spot_id, avg_noise, avg_crowd, quietness_score, report_count, recent_report_count)
         VALUES ($1, 0, 0, 50, 0, 0)`,
        [spotId]
      );

      // Schedules
      if (spot.schedule) {
        for (const [dayType, hours] of Object.entries(spot.schedule)) {
          if (hours === 'closed') {
            await pool.query(
              `INSERT INTO spot_schedules (spot_id, day_of_week, is_closed)
               VALUES ($1, $2, true)`,
              [spotId, dayType]
            );
          } else if (hours === '24hr') {
            await pool.query(
              `INSERT INTO spot_schedules (spot_id, day_of_week, is_24hr)
               VALUES ($1, $2, true)`,
              [spotId, dayType]
            );
          } else {
            await pool.query(
              `INSERT INTO spot_schedules (spot_id, day_of_week, opening_time, closing_time)
               VALUES ($1, $2, $3, $4)`,
              [spotId, dayType, hours[0], hours[1]]
            );
          }
        }
      }

      // Log
      let hrs = 'N/A';
      if (spot.schedule) {
        const wk = spot.schedule.weekday;
        hrs = wk === '24hr' ? '24H' : wk === 'closed' ? 'Closed' : `${wk[0]}–${wk[1]}`;
      }
      console.log(`  Spot: ${spot.name} (${hrs})`);
    }

    // Add example feedback data (Keeping both original sample + new time-based feedback)
    console.log('');
    let feedbackCount = 0;

    for (const [spotName, noise, crowd, comment, hoursAgo] of exampleFeedback) {
      const spotId = spotNameToId[spotName];
      if (!spotId) {
        console.log(`  ERROR: No spot found for "${spotName}"`);
        continue;
      }
      await pool.query(
        `INSERT INTO feedback (user_id, spot_id, noise_level, crowd_level, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${hoursAgo} hours')`,
        [testUserId, spotId, noise, crowd, comment]
      );
      feedbackCount++;
    }
    console.log(`  Inserted ${feedbackCount} feedback entries.\n`);
    // Generate time-based feedback
    const generatedFeedback = generateFeedback();
    let generatedCount = 0;

    for (const [spotName, noise, crowd, comment, hoursAgo] of generatedFeedback) {
      const spotId = spotNameToId[spotName];
      if (!spotId) continue;
      await pool.query(
        `INSERT INTO feedback (user_id, spot_id, noise_level, crowd_level, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${hoursAgo} hours')`,
        [testUserId, spotId, noise, crowd, comment]
      );
      generatedCount++;
    }
    console.log(`  Generated ${generatedCount} time-based feedback.\n`);

    // Add schedule overrides
    for (const ov of overrides) {
      const spotId = spotNameToId[ov.spotName];
      if (!spotId) {
        console.log(`  ERROR: No spot found for override "${ov.spotName}"`);
        continue;
      }
      await pool.query(
        `INSERT INTO spot_schedule_overrides
         (spot_id, start_date, end_date, opening_time, closing_time, is_24hr, is_closed, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [spotId, ov.start_date, ov.end_date, ov.opening_time || null, ov.closing_time || null,
         ov.is_24hr || false, ov.is_closed || false, ov.reason]
      );
      console.log(`  Override: ${ov.spotName} (${ov.start_date} to ${ov.end_date}) — ${ov.reason.slice(0, 60)}`);
    }
    console.log('');

    console.log(`Seeded ${studySpots.length} spots, ${feedbackCount + generatedCount} feedback, ${overrides.length} overrides, 2 test users.`);
    await pool.end();
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();