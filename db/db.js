import { MongoClient } from "mongodb";
import dotenv from "dotenv"; // Import dotenv

dotenv.config(); // Load environment variables from .env file

let client;
let db;

async function connect() {
  // Use the URI directly from the environment variable, which includes the DB name
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in the environment variables");
  }

  if (client && db) {
    return db; // Return the existing connection if already connected
  }

  try {
    // Create a new MongoClient and connect to the specified URI
    client = new MongoClient(uri, {});
    await client.connect();

    // Get the database instance from the URI
    db = client.db(); // This will pick up the database name defined in the URI
    console.log(`Connected to database: ${db.databaseName}`);
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

export { connect };
/*global console, process*/
