require("dotenv/config")
const { Client } = require("discord.js")
const { OpenAI } = require("openai")

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
  let conversation = []

  conversation.push({
    role: "system",
    content: "You are a helpful assistant."
  })

  let prevMessages = await message.channel.messages.fetch({ limit: 10 })
  prevMessages.reverse();

  prevMessages.forEach((msg) => {
    if (msg.author.bot && msg.author.id !== client.user.id) return;
    if (msg.content.startsWith(IGNORE_PREFIX)) return

    const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

    if (msg.author.id === client.user.id) {
        conversation.push({
            role: "assistant",
            name: username,
            content: msg.content
        })

        return
    }

    conversation.push({
        role: "user",
        name: username,
        content: msg.content
    })
  })

  // OpenAi Response
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: conversation,
    })
  .catch((error) => console.error("OpenAi Error:\n", error))

  clearInterval(sendTypingInterval)

  if (!response) {
    message.reply("Something went wrong with the server. Try again in a moment.")
    return
  }

  const responseMessage = response.choices[0].message.content
  const chunkSizeLimit = 2000

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
    const chunk = responseMessage.substring(i, i + chunkSizeLimit)

    await message.reply(chunk)
  }
})

client.login(process.env.TOKEN)