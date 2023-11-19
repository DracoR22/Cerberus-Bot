require("dotenv/config")
const { Client } = require("discord.js")
const { OpenAI } = require("openai")

const express = require('express');
const connectDB = require("./db/connect");
const Conversation = require("./models/conversation");

const app = express();


const client = new Client({
    intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"]
});

client.on("ready", () => {
    console.log("The bot is online.")
})

// Bot Wont Reply To Messages Starting With "!" Change This To Your Convinience
const IGNORE_PREFIX = "!";
// Channels Ids Where The Bot Is Going To Work
const CHANNELS = ["1175540005029023804"]

// Setup OpenAi
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
})

client.on('messageCreate', async (message) => {
  if(message.author.bot) return;
  if(message.content.startsWith(IGNORE_PREFIX)) return;
  if(!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

  await message.channel.sendTyping()

  const sendTypingInterval = setInterval(() => {
     message.channel.sendTyping()
  }, 5000)

  // Get Previous Messages Context
  let prevMessages = await message.channel.messages.fetch({ limit: 10 })
  prevMessages.reverse();

    // Create a conversation array for saving to the database
    const conversationForDatabase = [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
      ];
    
  prevMessages.forEach((msg) => {
    if (msg.author.bot && msg.author.id !== client.user.id) return;
    if (msg.content.startsWith(IGNORE_PREFIX)) return

    const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

    if (msg.author.id === client.user.id) {
        conversationForDatabase.push({
          role: "assistant",
          name: username,
          content: msg.content,
        });
      } else {
        conversationForDatabase.push({
          role: "user",
          name: username,
          content: msg.content,
        });
      }
    });
    
    // Create a new Conversation instance
    const conversation = new Conversation({
      channelId: message.channelId,
      messages: conversationForDatabase,
    });
    
     // Save the conversation to the database
     conversation
      .save()
      .then(() => console.log("Conversation saved to the database"))
      .catch((error) => console.error("Error saving conversation to the database:", error))
      .catch((error) => console.error("OpenAi Error:\n", error))

        // OpenAi Response
       const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversationForDatabase,
        }).catch((error) => console.error("OpenAi Error:\n", error));
    
      if (!response) {
        message.reply("Something went wrong with the server. Try again in a moment.")
        return
      }

     clearInterval(sendTypingInterval)

  const responseMessage = response.choices[0].message.content
  const chunkSizeLimit = 2000

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
    const chunk = responseMessage.substring(i, i + chunkSizeLimit)

    await message.reply(chunk)
  }
})

// Authenticate Discord
client.login(process.env.TOKEN)


// Run Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  connectDB()
  console.log(`Server is running on port ${PORT}`);
});