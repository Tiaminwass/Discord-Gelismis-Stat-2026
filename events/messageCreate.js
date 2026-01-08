const Stat = require("../database/Stat");
const config = require("../config.json");

module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    
    await Stat.findOneAndUpdate(
      { userId: message.author.id },
      { $inc: { chat: 1 } },
      { upsert: true }
    );

    
    const data = await Stat.findOne({ userId: message.author.id });
    const chatChannels = data?.chatChannels || [];
    const channelIdx = chatChannels.findIndex(c => c.channelId === message.channel.id);

    if (channelIdx > -1) {
      
      await Stat.updateOne(
        { userId: message.author.id, "chatChannels.channelId": message.channel.id },
        { $inc: { "chatChannels.$.count": 1 } }
      );
    } else {
      
      await Stat.updateOne(
        { userId: message.author.id },
        { 
          $push: { 
            chatChannels: { 
              channelId: message.channel.id, 
              categoryId: message.channel.parentId || "Kategorisiz", 
              count: 1 
            } 
          } 
        }
      );
    }

    
    if (!message.content.startsWith(config.prefix)) return;

    
    const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (command) {
      try {
        await command.execute(message);
      } catch (err) {
        console.error("Komut çalıştırılırken hata oluştu:", err);
      }
    }
  });
};