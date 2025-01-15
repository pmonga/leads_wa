/*global console, process, Buffer, APP_SECRET*/
import redis from "redis";
import "dotenv/config";

const { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USER } = process.env;
const client = redis.createClient({
  username: REDIS_USER,
  password: REDIS_PASSWORD,
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT
  }
});

client.connect();

/**
 * Asynchronously sets a value for a given key in the Redis storage with expiration.
 * @param {string} key - The key to set.
 * @param {*} value - The value to set for the key.
 * @param {number} [timeToExpire=86400000] - Time in milliseconds before the key expires (default: 24 hours).
 * @returns {Promise<void>}
 */
export async function set(key, value, timeToExpire = 86400000) {
  console.log("value: ", value);
  await client.set(key, JSON.stringify(value), {
    PX: timeToExpire // PX sets expiration in milliseconds
  });
  console.log("value after: ", value);
}

/**
 * Asynchronously gets the value for a given key from the Redis storage.
 * @param {string} key - The key to retrieve the value for.
 * @returns {Promise<*>} - The value for the given key, or undefined if the key doesn't exist or has expired.
 */
export async function get(key) {
  const value = await client.get(key);
  return value ? JSON.parse(value) : undefined;
}

/**
 * Asynchronously deletes a given key from the Redis storage.
 * @param {string} key - The key to delete.
 * @returns {Promise<void>}
 */
export async function del(key) {
  await client.del(key);
}

// old code starts here

// // Internal object to store key-value pairs
// const storage = {};

// /**
//  * Asynchronously sets a value for a given key in the storage.
//  * The value is stored as a JSON string.
//  * @param {string} key - The key to set.
//  * @param {*} value - The value to set for the key.
//  * @returns {Promise<void>}
//  */
// export async function set(key, value) {
//   storage[key] = JSON.stringify(value);
// }

// /**
//  * Asynchronously gets the value for a given key from the storage.
//  * The value is parsed from a JSON string.
//  * @param {string} key - The key to retrieve the value for.
//  * @returns {Promise<*>} - The value for the given key, or undefined if the key doesn't exist.
//  */
// export async function get(key) {
//   const value = storage[key];
//   return value ? JSON.parse(value) : undefined;
// }

// /**
//  * Asynchronously deletes a given key from the storage.
//  * @param {string} key - The key to delete.
//  * @returns {Promise<void>}
//  */
// export async function del(key) {
//   delete storage[key];
// }
