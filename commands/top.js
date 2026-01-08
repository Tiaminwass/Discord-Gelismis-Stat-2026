const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const moment = require("moment");
const Stat = require("../database/Stat");

module.exports = {
  name: "top",
  async execute(messageOrInteraction) {
    const isInteraction = messageOrInteraction.user ? true : false;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;
    const { guild, client } = messageOrInteraction;
    const now = Date.now();

    const stats = await Stat.find().lean();
    if (!stats.length) return messageOrInteraction.reply({ content: "Veri bulunamadı." });

    const format = (ms, type) => {
      if (type === "chat") return `${ms} mesaj`;
      return `${Math.floor(ms / 3600000)}sa ${Math.floor((ms % 3600000) / 60000)}dk`;
    };
// Bir problem olursa https://www.itemsatis.com/p/Tiamin veya https://discord.com/users/825703478009397269 ulaşabilirsin. 
    const calc = (type) => stats.map(d => {
      let v = d[type] || 0;
      if (type === "voice" && client.activeVoice?.has(d.userId)) v += now - client.activeVoice.get(d.userId);
      if (type === "stream" && client.activeStream?.has(d.userId)) v += now - client.activeStream.get(d.userId);
      return { userId: d.userId, value: v };
    }).sort((a, b) => b.value - a.value).slice(0, 5);

    const getList = async (list, type) => {
      const res = await Promise.all(list.map(async (u, i) => {
        const m = await guild.members.fetch(u.userId).catch(() => null);
        return m ? `\`${i + 1}.\` ${m} — **${format(u.value, type)}**` : null;
      }));
      return res.filter(Boolean).join("\n") || "Veri yok";
    };

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(`**Top Sunucu İstatistikleri;**\n\n🎙️ **Ses (Top 5)**\n${await getList(calc("voice"), "voice")}\n\n💬 **Chat (Top 5)**\n${await getList(calc("chat"), "chat")}\n\n📡 **Yayın (Top 5)**\n${await getList(calc("stream"), "stream")}`)
      .setFooter({ text: `${user.username} • ${moment().format("DD.MM.YYYY HH:mm")}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("top_voice").setLabel("🎙️ Voice").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("top_chat").setLabel("💬 Chat").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("top_stream").setLabel("📡 Stream").setStyle(ButtonStyle.Success)
    );

    if (isInteraction) {
      if (messageOrInteraction.deferred || messageOrInteraction.replied) {
        return await messageOrInteraction.editReply({ embeds: [embed], components: [row] });
      }
      return await messageOrInteraction.reply({ embeds: [embed], components: [row] });
    }
    return await messageOrInteraction.reply({ embeds: [embed], components: [row] });
  }
};