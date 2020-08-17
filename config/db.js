const mongoose = require('mongoose');
const config = require('config');
const db =
  'mongodb+srv://admin-fm:' +
  process.env.MONGO_PASS +
  '@cluster0-hicrq.mongodb.net/lol';

mongoose.set('useUnifiedTopology', true);

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.log(err.message);
    // Exit process with fail
    process.exit(1);
  }
};

module.exports = connectDB;
