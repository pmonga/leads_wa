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

function formatTohhmmDateIST(date) {
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

  return `${hours}:${minutes} ${ampm}, ${day}-${month}-${year}`;
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

export {
  getTimeWithOffset,
  formatTohhmmDateIST,
  convertKeysToDate,
  isSameDate,
  isWithinAllowedPeriod
};
/* global console, Intl */
