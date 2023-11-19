const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    channelId: String,
    messages: [
      {
        role: String,
        name: String,
        content: String,
      },
    ],
  });
  
module.exports = mongoose.model('Conversation', conversationSchema);
