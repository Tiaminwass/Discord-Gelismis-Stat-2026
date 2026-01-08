const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const moment = require("moment");
const Stat = require("../database/Stat");

module.exports = {
  name: "stat",
  async execute(messageOrInteraction) {
    
    const isInteraction = messageOrInteraction.user ? true : false;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;
    const guild = messageOrInteraction.guild;
    const client = messageOrInteraction.client;
    const userId = user.id;

    const data = (await Stat.findOne({ userId }).lean()) || { voice: 0, chat: 0, stream: 0 };
    let liveVoice = data.voice || 0;
    let liveStream = data.stream || 0;
    const now = Date.now();

    if (client.activeVoice?.has(userId)) liveVoice += now - client.activeVoice.get(userId);
    if (client.activeStream?.has(userId)) liveStream += now - client.activeStream.get(userId);

    const formatTime = (ms) => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return `${h} saat, ${m} dakika`;
    };
// Bir problem olursa https://www.itemsatis.com/p/Tiamin veya https://discord.com/users/825703478009397269 ulaşabilirsin. 
    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(`${user} kullanıcısının istatistikleri;\n\n🎙️ **Ses:** \`${formatTime(liveVoice)}\` \n💬 **Mesaj:** \`${data.chat || 0} mesaj\` \n📡 **Yayın:** \`${formatTime(liveStream)}\``)
      .setFooter({ text: `${user.username} • ${moment().format("DD.MM.YYYY HH:mm")}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("stat_voice").setLabel("🎙️ Ses Detay").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("stat_chat").setLabel("💬 Chat Detay").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("stat_stream").setLabel("📡 Yayın Detay").setStyle(ButtonStyle.Success)
    );

    
    if (isInteraction) {
      if (messageOrInteraction.deferred || messageOrInteraction.replied) {
        return await messageOrInteraction.editReply({ embeds: [embed], components: [row] });
      }
      return await messageOrInteraction.reply({ embeds: [embed], components: [row] });
    } else {
      return await messageOrInteraction.reply({ embeds: [embed], components: [row] });
    }
  }
};