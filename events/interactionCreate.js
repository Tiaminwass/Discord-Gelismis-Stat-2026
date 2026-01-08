const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const moment = require("moment");
const Stat = require("../database/Stat");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    
    
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

   
    if (!interaction.isButton()) return;

    await interaction.deferUpdate();
    const { guild, user } = interaction;
    const now = Date.now();
    if (!guild) return;

    
    const formatTime = (ms) => {
      if (ms <= 0) return "0sn";
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      let res = "";
      if (h > 0) res += `${h}sa `;
      if (m > 0 || h > 0) res += `${m}dk `;
      res += `${s}sn`;
      return res;
    };

    
    if (interaction.customId === "stat_voice") {
      const data = await Stat.findOne({ userId: user.id }).lean() || { channels: [] };
      let channels = [...(data.channels || [])];
      
      const member = guild.members.cache.get(user.id);
      const currentChannel = member?.voice.channel;
      const lastJoinTime = client.activeVoice.get(user.id);

      if (currentChannel && lastJoinTime) {
        const activeDuration = now - lastJoinTime;
        const existingChanIdx = channels.findIndex(c => c.channelId === currentChannel.id);
        if (existingChanIdx > -1) {
          channels[existingChanIdx].time += activeDuration;
        } else {
          channels.push({
            channelId: currentChannel.id,
            categoryId: currentChannel.parentId || "Kategorisiz",
            time: activeDuration
          });
        }
      }

      if (channels.length === 0) {
        return interaction.followUp({ content: "❌ Henüz bir ses veriniz bulunmuyor.", ephemeral: true });
      }

      const categoryMap = {};
      channels.forEach(chan => {
        const catName = guild.channels.cache.get(chan.categoryId)?.name || "Kategorisiz Kanallar";
        const chanName = guild.channels.cache.get(chan.channelId)?.name || "Silinmiş Kanal";
        if (!categoryMap[catName]) categoryMap[catName] = [];
        categoryMap[catName].push({ name: chanName, time: chan.time });
      });

      let description = `${user} kullanıcısının detaylı ses istatistikleri;\n\n`;
      for (const [cat, catChannels] of Object.entries(categoryMap)) {
        description += `📁 **${cat}**\n`;
        catChannels.sort((a, b) => b.time - a.time).forEach(c => {
          description += `└─ ${c.name}: \`${formatTime(c.time)}\`\n`;
        });
        description += `\n`;
      }

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(description)
        .setFooter({ 
          text: `${user.username} • ${moment().format("DD.MM.YYYY HH:mm")}`, 
          iconURL: user.displayAvatarURL({ dynamic: true }) 
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("stat_back").setLabel("⬅️ Ana Menüye Dön").setStyle(ButtonStyle.Secondary)
      );

      return interaction.message.edit({ embeds: [embed], components: [row] });
    }

    
    if (interaction.customId === "stat_chat") {
      const data = await Stat.findOne({ userId: user.id }).lean() || { chatChannels: [] };
      const chatChannels = data.chatChannels || [];

      if (chatChannels.length === 0) {
        return interaction.followUp({ content: "❌ Henüz bir mesaj veriniz bulunmuyor.", ephemeral: true });
      }

      const categoryMap = {};
      chatChannels.forEach(chan => {
        const catName = guild.channels.cache.get(chan.categoryId)?.name || "Kategorisiz Kanallar";
        const chanName = guild.channels.cache.get(chan.channelId)?.name || "Silinmiş Kanal";
        if (!categoryMap[catName]) categoryMap[catName] = [];
        categoryMap[catName].push({ name: chanName, count: chan.count });
      });

      let description = `${user} kullanıcısının detaylı mesaj istatistikleri;\n\n`;
      for (const [cat, channels] of Object.entries(categoryMap)) {
        description += `📁 **${cat}**\n`;
        channels.sort((a, b) => b.count - a.count).forEach(c => {
          description += `└─ ${c.name}: \`${c.count} mesaj\`\n`;
        });
        description += `\n`;
      }

      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(description)
        .setFooter({ 
          text: `${user.username} • ${moment().format("DD.MM.YYYY HH:mm")}`, 
          iconURL: user.displayAvatarURL({ dynamic: true }) 
        });

      return interaction.message.edit({ 
        embeds: [embed], 
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("stat_back").setLabel("⬅️ Ana Menüye Dön").setStyle(ButtonStyle.Secondary))] 
      });// Bir problem olursa https://www.itemsatis.com/p/Tiamin veya https://discord.com/users/825703478009397269 ulaşabilirsin. 
    }

    
    if (interaction.customId === "stat_stream") {
      const data = await Stat.findOne({ userId: user.id }).lean() || { stream: 0 };
      let totalStream = data.stream || 0;
      
      const lastStreamJoin = client.activeStream.get(user.id);
      if (lastStreamJoin) totalStream += (now - lastStreamJoin);

      const embed = new EmbedBuilder()
        .setColor("Gold")
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(`${user} kullanıcısının detaylı yayın istatistikleri;\n\n📡 **Toplam Yayın Süresi:** \`${formatTime(totalStream)}\``)
        .setFooter({ 
          text: `${user.username} • ${moment().format("DD.MM.YYYY HH:mm")}`, 
          iconURL: user.displayAvatarURL({ dynamic: true }) 
        });

      return interaction.message.edit({ 
        embeds: [embed], 
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("stat_back").setLabel("⬅️ Ana Menüye Dön").setStyle(ButtonStyle.Secondary))] 
      });
    }

    
    if (interaction.customId === "stat_back") {
      const command = client.commands.get("stat");
      if (command) return command.execute(interaction);
    }

    
    if (interaction.customId === "top_menu") {
      const stats = await Stat.find().lean();
      const calc = (type) => stats.map(data => {
        let value = data[type] || 0;
        if (type === "voice" && client.activeVoice?.has(data.userId)) value += now - client.activeVoice.get(data.userId);
        if (type === "stream" && client.activeStream?.has(data.userId)) value += now - client.activeStream.get(data.userId);
        return { userId: data.userId, value };
      }).sort((a, b) => b.value - a.value).slice(0, 5);

      const formatTop = async (list, type) => {
        const res = await Promise.all(list.map(async (u, i) => {
          const m = await guild.members.fetch(u.userId).catch(() => null);
          if (!m) return null;
          const val = type === "chat" ? `${u.value} mesaj` : formatTime(u.value);
          return `\`${i + 1}.\` ${m} — **${val}**`;
        }));
        return res.filter(Boolean).join("\n") || "Veri yok";
      };

      const embed = new EmbedBuilder()
        .setColor("Gold")
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(`**Top Sunucu İstatistikleri;**\n\n🎙️ **Ses (Top 5)**\n${await formatTop(calc("voice"), "voice")}\n\n💬 **Chat (Top 5)**\n${await formatTop(calc("chat"), "chat")}\n\n📡 **Yayın (Top 5)**\n${await formatTop(calc("stream"), "stream")}`)
        .setFooter({ text: `${user.username} • ${moment().format("DD.MM.YYYY HH:mm")}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("top_voice").setLabel("🎙️ Voice").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("top_chat").setLabel("💬 Chat").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("top_stream").setLabel("📡 Stream").setStyle(ButtonStyle.Success)
      );
      return interaction.message.edit({ embeds: [embed], components: [row] });
    }

    
    let t, title;
    if (interaction.customId === "top_voice") { t = "voice"; title = "Top 25 Ses Aktifliği"; }
    else if (interaction.customId === "top_chat") { t = "chat"; title = "Top 25 Chat Aktifliği"; }
    else if (interaction.customId === "top_stream") { t = "stream"; title = "Top 25 Yayın Aktifliği"; }
    else return;

    const allStats = await Stat.find().lean();
    const ranked = allStats.map(d => {
      let v = d[t] || 0;
      if (t === "voice" && client.activeVoice?.has(d.userId)) v += now - client.activeVoice.get(d.userId);
      if (t === "stream" && client.activeStream?.has(d.userId)) v += now - client.activeStream.get(d.userId);
      return { userId: d.userId, value: v };
    }).sort((a, b) => b.value - a.value).slice(0, 25);

    const lines = await Promise.all(ranked.map(async (u, i) => {
      const m = await guild.members.fetch(u.userId).catch(() => null);
      if (!m) return null;
      const val = t === "chat" ? `${u.value} mesaj` : formatTime(u.value);
      return `\`${i + 1}.\` ${m} — **${val}**`;
    }));

    const detailEmbed = new EmbedBuilder()
      .setColor("Blurple")
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(`**${title};**\n\n${lines.filter(Boolean).join("\n") || "Veri yok"}`)
      .setFooter({ text: `${user.username} • ${moment().format("DD.MM.YYYY HH:mm")}`, iconURL: user.displayAvatarURL({ dynamic: true }) });

    return interaction.message.edit({ 
      embeds: [detailEmbed], 
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("top_menu").setLabel("📊 Geri Dön").setStyle(ButtonStyle.Secondary))] 
    });
  });
};