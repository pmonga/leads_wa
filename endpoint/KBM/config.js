// KBN Game config.js

// Constants and settings
const APP_NAME = "Kaun Banega MBA";
const VERSION = "1.0.0";
const GAME_QS_DEF = [
  [
    { level: "easy", num: 0 },
    { level: "medium", num: 7 },
    { level: "hard", num: 8 }
  ]
];
const GAME_TIME = [10 * 60 * 1000, 8 * 60 * 1000, 7 * 60 * 1000]; // 10 minutes in milliseconds
const GAME_PRIZE = [
  [1, 2, 4, 7, 10, 15, 20, 25, 35, 50, 70, 100, 200, 500, 1000]
];

// Export individually
export { APP_NAME, VERSION, GAME_TIME, GAME_PRIZE, GAME_QS_DEF };
