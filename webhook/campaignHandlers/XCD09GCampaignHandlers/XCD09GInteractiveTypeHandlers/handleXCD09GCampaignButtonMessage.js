export default async (req, res) => {
  const { contact, action, waClient } = res.locals;
  switch (action) {
    case "reminder":
      break;
    default:
      break;
  }
};

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
    const timeoutId = setTimeout(targetFunction, delay);
    return timeoutId; // Return the timeout ID
  } else {
    console.log("The target time has already passed.");
    return null;
  }
}
/*global console, setTimeout*/
