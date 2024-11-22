// Internal object to store key-value pairs
const storage = {};

/**
 * Asynchronously sets a value for a given key in the storage.
 * The value is stored as a JSON string.
 * @param {string} key - The key to set.
 * @param {*} value - The value to set for the key.
 * @returns {Promise<void>}
 */
export async function set(key, value) {
  storage[key] = JSON.stringify(value);
}

/**
 * Asynchronously gets the value for a given key from the storage.
 * The value is parsed from a JSON string.
 * @param {string} key - The key to retrieve the value for.
 * @returns {Promise<*>} - The value for the given key, or undefined if the key doesn't exist.
 */
export async function get(key) {
  const value = storage[key];
  return value ? JSON.parse(value) : undefined;
}

/**
 * Asynchronously deletes a given key from the storage.
 * @param {string} key - The key to delete.
 * @returns {Promise<void>}
 */
export async function del(key) {
  delete storage[key];
}

/****************************************************
 * redis code exists here to be implemented when redis is implemented
 
import redis from 'redis';

const client = redis.createClient();
client.connect();

export async function set(key, value) {
  await client.set(key, JSON.stringify(value));
}

export async function get(key) {
  const value = await client.get(key);
  return value ? JSON.parse(value) : undefined;
}

export async function del(key) {
  await client.del(key);
}
 */
