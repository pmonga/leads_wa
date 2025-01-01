import { ObjectId } from "mongodb"; // Directly import ObjectId

// Helper to convert string to ObjectId (if needed)
const toObjectId = (id) => ObjectId(id);

const crud = (collectionName, db) => {
  return {
    // Create a new document
    create: async (data) => {
      if (!data.createdAt) data.createdAt = new Date();
      if (!data.updatedAt) data.updatedAt = new Date();
      const collection = db.collection(collectionName);
      const result = await collection.insertOne(data);
      return result;
    },

    // Read documents (excluding soft-deleted)
    read: async (filter = {}, options = {}) => {
      if (typeof filter._id === "string") {
        filter._id = toObjectId(filter._id);
      }
      const collection = db.collection(collectionName);
      filter.deletedAt = { $exists: false }; // Exclude soft-deleted docs
      return collection.find(filter, options).toArray();
    },

    // Update a document
    update: async (filter, updateData) => {
      if (!updateData["$set"]) updateData["$set"] = {};
      updateData["$set"].updatedAt = new Date(); // Set updatedAt timestamp
      const collection = db.collection(collectionName);
      const result = await collection.updateOne(filter, updateData, {
        upsert: false
      });
      return result;
    },

    // findOneAndUpdate a document
    findOneAndUpdate: async (filter, updateData) => {
      if (!updateData["$set"]) updateData["$set"] = {};
      updateData["$set"].updatedAt = new Date(); // Set updatedAt timestamp
      const collection = db.collection(collectionName);
      return collection.findOneAndUpdate(filter, updateData, {
        upsert: false,
        returnNewDocument: true
      });
    },

    // Soft delete a document
    remove: async (filter) => {
      const collection = db.collection(collectionName);
      const result = await collection.updateOne(
        filter,
        {
          $set: { deletedAt: new Date() }
        },
        { upsert: false }
      );
      return result;
    },
    // expose the collection for native functions
    collection: () => {
      return db.collection(collectionName);
    }
  };
};

export default crud;
