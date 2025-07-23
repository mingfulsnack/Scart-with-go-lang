const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

// Setup in-memory MongoDB before all tests
beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create({
      instance: {
        port: 60000 + Math.floor(Math.random() * 1000), // Use random high port
        ip: '127.0.0.1' // Use localhost instead of 0.0.0.0
      }
    });
    const uri = mongod.getUri();
    
    await mongoose.connect(uri);
    
    console.log('✅ Connected to in-memory MongoDB for testing');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
    console.log('✅ Disconnected from in-memory MongoDB');
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);
