const { Client, GatewayIntentBits, Partials, Collection, ActivityType } = require("discord.js");
const mongo = require("./database/mongo");
const config = require("./config.json");
const fs = require("fs");
const Stat = require("./database/Stat");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers 
  ],
  partials: [Partials.Channel, Partials.User, Partials.Message]
});

client.commands = new Collection();
client.prefix = config.prefix;
client.activeVoice = new Map();
client.activeStream = new Map();


const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.name, cmd);
}


const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
  require(`./events/${file}`)(client);
}


  client.on("ready", async () => {
  console.log(`${client.user.tag} aktif!`);

  // SLASH KOMUTLARI KAYIT ETMEK İÇİN
  const slashCommands = [
    { name: 'stat', description: 'İstatistiklerinizi görüntüler.' },
    { name: 'top', description: 'Sunucu genel sıralamasını görüntüler.' }
  ];

  try {
    await client.application.commands.set(slashCommands);
    console.log("Slash komutları sisteme tanımlandı.");
  } catch (err) {
    console.error("Slash komut hatası:", err);
  }

  
  const activities = [
    "Developed by chaostiamin ❤️",
    "/stat ve /top komutlarını dene!",
    ".stat ve .top ile verilerini gör!",
    "İstatistiklerin anlık takipte! 📈"
  ];

  let i = 0;
  setInterval(() => {
    client.user.setPresence({
      activities: [{ 
        name: activities[i++ % activities.length], 
        type: ActivityType.Watching 
      }],
      status: "idle", 
    });
  }, 10000);
});

// MONGO VE LOGIN
(async () => {
  try {
    await mongo(config.mongoUri);
    await client.login(config.token);
  } catch (err) {
    console.error("Bot başlatma hatası:", err);
  }
})();


setInterval(async () => {
  const now = Date.now();

  
  for (const [userId, last] of client.activeVoice) {
    const guild = client.guilds.cache.first();
    if (!guild) continue;
    
    const member = guild.members.cache.get(userId);
    const channel = member?.voice.channel;

    if (channel) {
      const duration = now - last;
      if (duration <= 0) continue;

      const data = await Stat.findOne({ userId });
      if (data) {
        const channelIndex = data.channels.findIndex(c => c.channelId === channel.id);
        
        if (channelIndex > -1) {
          await Stat.updateOne(
            { userId, "channels.channelId": channel.id },
            { 
              $inc: { 
                voice: duration, 
                "channels.$.time": duration 
              } 
            }
          );
        } else {
          await Stat.updateOne(
            { userId },
            { 
              $inc: { voice: duration },
              $push: { 
                channels: { 
                  channelId: channel.id, 
                  categoryId: channel.parentId || "Kategorisiz", 
                  time: duration 
                } 
              }
            }
          );
        }
      } else {
        await Stat.create({
          userId,
          voice: duration,
          channels: [{ channelId: channel.id, categoryId: channel.parentId || "Kategorisiz", time: duration }]
        });
      }
    }
    client.activeVoice.set(userId, now);
  }

  
  for (const [userId, last] of client.activeStream) {
    const duration = now - last;
    if (duration <= 0) continue;

    await Stat.findOneAndUpdate(
      { userId },
      { $inc: { stream: duration } },
      { upsert: true }
    );
    client.activeStream.set(userId, now);
  }
}, 30000);

// Bir problem olursa https://www.itemsatis.com/p/Tiamin veya https://discord.com/users/825703478009397269 ulaşabilirsin. 
process.on("unhandledRejection", (error) => {
  console.error("Hata:", error);
});