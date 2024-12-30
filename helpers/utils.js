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

function setReminder(targetFunction, givenTime) {
  // Get the current time in milliseconds
  const now = new Date().getTime();

  // Calculate 12 PM IST tomorrow
  const currentDateIST = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata"
  });
  const istNow = new Date(currentDateIST);
  const istTomorrowNoon = new Date(
    istNow.getFullYear(),
    istNow.getMonth(),
    istNow.getDate() + 1,
    12,
    0,
    0
  );

  // Convert 12 PM IST tomorrow to UTC milliseconds
  const istTomorrowNoonUTC = istTomorrowNoon.getTime();

  // Calculate 23 hours and 55 minutes from the given time
  const futureTime = new Date(givenTime).getTime() + (23 * 60 + 55) * 60 * 1000;

  // Determine the earlier of the two times
  const executionTime = Math.min(istTomorrowNoonUTC, futureTime);

  // Calculate the delay in milliseconds
  const delay = executionTime - now;

  if (delay > 0) {
    console.log(`Function will execute in ${delay / 1000} seconds.`);
    const timeoutId = setTimeout(async () => {
      try {
        await targetFunction();
      } catch (error) {
        console.error("Error occurred in the scheduled function:", error);
      }
    }, delay);
    return timeoutId; // Return the timeout ID
  } else {
    console.log("The target time has already passed.");
    return null;
  }
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  getTimeWithOffset,
  formatTohhmmDateIST,
  convertKeysToDate,
  isSameDate,
  isWithinAllowedPeriod,
  isObject,
  setReminder,
  timeout
};
/* global console, Intl, setTimeout Promise */
