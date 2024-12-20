// KBN Game config.js

// Constants and settings
const APP_NAME = "Kaun Banega MBA";
const VERSION = "1.0.0";
const GAME_TIME = [10 * 60 * 1000, 8 * 60 * 1000]; // 10 minutes in milliseconds
const GAME_PRIZE = [
  [1, 2, 4, 7, 10, 15, 20, 25, 50, 100],
  [10, 20, 40, 70, 100, 150, 200, 300, 500, 1000]
];

// Export individually
export { APP_NAME, VERSION, GAME_TIME, GAME_PRIZE };
