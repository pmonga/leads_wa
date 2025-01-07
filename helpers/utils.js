// Utils.js

function getTimeWithOffset(baseTime, offsetMs, roundUp = false) {
  // Create a Date object from the base time and add the offset
  let newTime = new Date(baseTime.getTime() + offsetMs);

  // Round up to the next full minute
  if (
    roundUp &&
    (newTime.getUTCSeconds() > 0 || newTime.getUTCMilliseconds() > 0)
  ) {
    newTime.setUTCSeconds(0, 0); // Set seconds and milliseconds to 0
    newTime = new Date(newTime.getTime() + 60000); // Add one minute
  }

  return newTime; // Return the Date object
}

function formatTohhmmDateIST(date, withDate = false) {
  const options = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h12" // Ensures 12-hour format
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(date);

  // Extract parts to construct the "hh:mm AM/PM, date" format
  const hours = parts.find((part) => part.type === "hour").value;
  const minutes = parts.find((part) => part.type === "minute").value;
  const ampm = parts
    .find((part) => part.type === "dayPeriod")
    .value.toUpperCase();
  const day = parts.find((part) => part.type === "day").value;
  const month = parts.find((part) => part.type === "month").value;
  const year = parts.find((part) => part.type === "year").value;
  if (withDate) return `${hours}:${minutes} ${ampm}, ${day}-${month}-${year}`;
  else return `${hours}:${minutes} ${ampm}`;
}

/**
 * Converts specified keys of an object to Date if they exist and are valid.
 * @param {Object} obj - The object to process.
 * @param {...string} keys - The keys to convert to Date.
 * @returns {Object} - The updated object with specified keys converted to Date.
 */
function convertKeysToDate(obj, ...keys) {
  if (!obj || typeof obj !== "object") {
    throw new Error("The first argument must be an object.");
  }
  if (keys.some((key) => typeof key !== "string")) {
    throw new Error("All keys must be strings.");
  }

  const updatedObj = { ...obj };

  keys.forEach((key) => {
    if (key in updatedObj) {
      const date = new Date(updatedObj[key]);
      if (!isNaN(date.getTime())) {
        updatedObj[key] = date;
      } else {
        console.warn(`The value for key "${key}" is not a valid date.`);
      }
    }
  });

  return updatedObj;
}
function isSameDate(givenDate) {
  // Get the current date in IST
  const currentDate = new Date();
  const istOffset = 330; //in minutes IST is UTC+5:30
  const istCurrentDate = new Date(
    currentDate.getTime() +
      currentDate.getTimezoneOffset() * 60000 +
      istOffset * 60000
  );

  // Adjust the given date to IST
  const istGivenDate = new Date(
    givenDate.getTime() +
      givenDate.getTimezoneOffset() * 60000 +
      istOffset * 60000
  );

  // Compare year, month, and day
  return (
    istCurrentDate.getFullYear() === istGivenDate.getFullYear() &&
    istCurrentDate.getMonth() === istGivenDate.getMonth() &&
    istCurrentDate.getDate() === istGivenDate.getDate()
  );
}

/**
 * Checks if the current time is within the allowed period from the start time.
 * @param {Date|string} startTime - The starting time as a Date object or a valid date string.
 * @param {number} allowedPeriod - The allowed period in milliseconds.
 * @returns {boolean} - True if the current time is within the allowed period, false otherwise.
 */
function isWithinAllowedPeriod(startTime, allowedPeriod = 10 * 60 * 1000) {
  // Ensure startTime is a Date object
  const start = new Date(startTime);

  // Check for invalid start time
  if (isNaN(start)) {
    throw new Error("Invalid start time provided");
  }

  // Get the current time
  const currentTime = new Date();

  // Calculate the difference in time
  const timeDifference = currentTime - start;

  // Check if the difference is within the allowed period
  return timeDifference <= allowedPeriod;
}

function isObject(x) {
  return typeof x === "object" && !Array.isArray(x) && x !== null;
}

function createReminderManager({
  timeOffsetMinutes = 23 * 60 + 59,
  fixedTime = "12:00",
  timeZone = "Asia/Kolkata"
} = {}) {
  const reminders = new Map();

  /**
   * Parse the fixed time string into hours and minutes.
   * @param {string} time - Time string in "HH:mm" format.
   * @returns {{ hours: number, minutes: number }} - Parsed hours and minutes.
   */
  function parseFixedTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return { hours, minutes };
  }

  /**
   * Set a reminder with a given key.
   * @param {string} key - Unique key to identify the reminder.
   * @param {Function} targetFunction - The function to be executed.
   * @param {Date|string|number} givenTime - The base time for scheduling.
   * @param {...any} params - Parameters to pass to the target function.
   * @returns {{timeout: Object, executionTime: Date}} - The timeout object and execution time.
   */
  function set(key, targetFunction, givenTime, ...params) {
    // Clear any existing reminder with the same key
    if (reminders.has(key)) {
      clear(key);
    }

    const now = new Date().getTime();

    // Calculate the fixed time for tomorrow in the specified time zone
    const currentDateInZone = new Date().toLocaleString("en-US", { timeZone });
    const zoneNow = new Date(currentDateInZone);
    const { hours, minutes } = parseFixedTime(fixedTime);
    const fixedTimeTomorrow = new Date(
      zoneNow.getFullYear(),
      zoneNow.getMonth(),
      zoneNow.getDate() + 1,
      hours,
      minutes,
      0
    );
    const fixedTimeUTC = fixedTimeTomorrow.getTime();

    // Calculate the offset time from the given time
    const offsetTime =
      new Date(givenTime).getTime() + timeOffsetMinutes * 60 * 1000;

    // Determine the earlier of the two times
    const executionTime = Math.min(fixedTimeUTC, offsetTime);
    const delay = executionTime - now;

    if (delay > 0) {
      const timeout = setTimeout(async () => {
        try {
          await targetFunction(...params);
        } catch (error) {
          console.error(
            "Error occurred in the scheduled function:",
            key,
            error
          );
        } finally {
          // Automatically remove the key after execution
          reminders.delete(key);
        }
      }, delay);

      reminders.set(key, timeout);

      return { timeout, executionTime: new Date(executionTime) };
    } else {
      console.log("The target time has already passed.");
      return { timeout: null, executionTime: null };
    }
  }

  /**
   * Get a reminder by its key.
   * @param {string} key - The key of the reminder to retrieve.
   * @returns {Object|null} - The timeout object if found, otherwise null.
   */
  function get(key) {
    return reminders.get(key) || null;
  }

  /**
   * Clear a reminder with a given key.
   * @param {string} key - The key of the reminder to clear.
   * @returns {boolean} - True if the reminder was cleared, false otherwise.
   */
  function clear(key) {
    if (reminders.has(key)) {
      const timeout = reminders.get(key);
      clearTimeout(timeout);
      reminders.delete(key);
      return true;
    }
    return false;
  }

  function size() {
    return reminders.size;
  }

  function keys() {
    return [...reminders.keys()];
  }

  function values() {
    return [...reminders.values()];
  }

  function entries() {
    return [...reminders.entries()];
  }

  return {
    set,
    get,
    clear,
    size,
    keys, // Exposes the keys of the reminders map
    values, // Exposes the values of the reminders map
    entries // Exposes the entries of the reminders map
  };
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInTimeRange(startTime, endTime) {
  const now = new Date();

  // Set the current time to IST explicitly
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istNow = new Date(
    now.getTime() + istOffset - now.getTimezoneOffset() * 60 * 1000
  );

  // Parse start and end times into Date objects
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const start = new Date(istNow);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(istNow);
  end.setHours(endHour, endMinute, 0, 0);

  if (end < start) {
    // Handle cases where the office is open past midnight
    return istNow >= start || istNow < end;
  }

  return istNow >= start && istNow < end;
}

export {
  getTimeWithOffset,
  formatTohhmmDateIST,
  convertKeysToDate,
  isSameDate,
  isWithinAllowedPeriod,
  isObject,
  createReminderManager,
  timeout,
  isInTimeRange
};
/* global console, Intl, setTimeout Promise Map clearTimeout */
