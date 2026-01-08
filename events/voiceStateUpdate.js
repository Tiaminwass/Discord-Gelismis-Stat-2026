const Stat = require("../database/Stat");

module.exports = (client) => {
  client.on("voiceStateUpdate", async (oldState, newState) => {
    const userId = newState.id;
    if (newState.member?.user.bot) return;

    const now = Date.now();

    
    const saveStat = async (uid, channel, duration, isStream = false) => {
      if (duration <= 0) return;

      const updateData = { $inc: {} };
      if (isStream) {
        updateData.$inc["stream"] = duration;
      } else {
        updateData.$inc["voice"] = duration;
      }

      
      await Stat.findOneAndUpdate(
        { userId: uid },
        updateData,
        { upsert: true }
      );

      
      if (!isStream && channel) {
        const data = await Stat.findOne({ userId: uid });
        
        const channels = data?.channels || [];
        const channelIndex = channels.findIndex(c => c.channelId === channel.id);

        if (channelIndex > -1) {
          await Stat.updateOne(
            { userId: uid, "channels.channelId": channel.id },
            { $inc: { "channels.$.time": duration } }
          );
        } else {
          await Stat.updateOne(
            { userId: uid },
            { 
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
      }
    };

    
    if (!oldState.channelId && newState.channelId) {
      client.activeVoice.set(userId, now);
    } 

    
    else if (oldState.channelId && !newState.channelId) {
      const last = client.activeVoice.get(userId);
      if (last) {
        await saveStat(userId, oldState.channel, now - last);
        client.activeVoice.delete(userId);
      }
      client.activeStream.delete(userId);
    } 

   
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const last = client.activeVoice.get(userId);
      if (last) {
        await saveStat(userId, oldState.channel, now - last);
      }
      client.activeVoice.set(userId, now); 
    }

    

    if (!oldState.streaming && newState.streaming) {
      client.activeStream.set(userId, now);
    } else if (oldState.streaming && !newState.streaming) {
      const last = client.activeStream.get(userId);
      if (last) {
        await saveStat(userId, null, now - last, true);
        client.activeStream.delete(userId);
      }
    }
  });
};