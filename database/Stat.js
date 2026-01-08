const { Schema, model } = require("mongoose");

const statSchema = new Schema({
  userId: { type: String, unique: true, required: true },
  voice: { type: Number, default: 0 },
  chat: { type: Number, default: 0 },
  stream: { type: Number, default: 0 },
  channels: { type: Array, default: [] }, 
  chatChannels: { type: Array, default: [] } 
});

module.exports = model("Stat", statSchema);