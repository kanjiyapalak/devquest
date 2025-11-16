import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models/User.js';
import '../models/Topic.js';
import '../models/UserGlobalXP.js';
import '../models/UserTopicProgress.js';
import '../models/UserActivity.js';
import '../models/Badge.js';
import '../models/UserBadge.js';
dotenv.config({ path: '../.env' });


const initDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Initialize models by creating dummy documents
    const models = [
      { name: 'User', model: mongoose.model('User') },
      { name: 'Topic', model: mongoose.model('Topic') },
      { name: 'UserGlobalXP', model: mongoose.model('UserGlobalXP') },
      { name: 'UserTopicProgress', model: mongoose.model('UserTopicProgress') },
      { name: 'UserActivity', model: mongoose.model('UserActivity') },
      { name: 'Badge', model: mongoose.model('Badge') },
      { name: 'UserBadge', model: mongoose.model('UserBadge') },
    ];

    // Create collections if they don't exist
    for (const { name, model } of models) {
      try {
        // This will create the collection if it doesn't exist
        await model.createCollection();
        console.log(`✅ Collection '${name}' is ready`);
      } catch (error) {
        console.error(`❌ Error initializing ${name} collection:`, error.message);
      }
    }

    console.log('\n🎉 Database initialization complete!');
    console.log('Collections initialized:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(collections.map(c => `- ${c.name}`).join('\n'));

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the initialization
initDatabase();
