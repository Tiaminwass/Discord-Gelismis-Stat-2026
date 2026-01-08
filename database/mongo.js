const mongoose = require("mongoose");
const { error } = require("node:console");

module.exports = async (uri) => {
  await mongoose.connect(uri, {
    autoIndex: false
  });
  console.log("MongoDB bağlandı");
};

