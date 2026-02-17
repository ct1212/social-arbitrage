// Discord Alert Poster for Social Arbitrage
// Posts high-confidence signals to #social-arbitrage channel

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

class SocialArbitragePoster {
  constructor(botToken, channelId = '1473265368272470047') {
    this.botToken = botToken;
    this.channelId = channelId;
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds]
    });
    this.ready = false;
  }

  async connect() {
    if (this.ready) return;
    
    return new Promise((resolve, reject) => {
      this.client.once('ready', () => {
        console.log(`Discord bot logged in as ${this.client.user.tag}`);
        this.ready = true;
        resolve();
      });
      
      this.client.once('error', reject);
      this.client.login(this.botToken).catch(reject);
    });
  }

  async disconnect() {
    if (this.ready) {
      await this.client.destroy();
      this.ready = false;
    }
  }

  async postSignal(signal) {
    const channel = await this.client.channels.fetch(this.channelId);
    if (!channel) {
      throw new Error('Discord channel not found');
    }

    const embed = new EmbedBuilder()
      .setColor(this.getRiskColor(signal.swingScore.riskLevel))
      .setTitle(`🎯 ${signal.keyword.toUpperCase()} | $${signal.ticker || 'N/A'}`)
      .setDescription(signal.thesis)
      .addFields(
        { 
          name: '📊 Confidence', 
          value: `${signal.confidence.toFixed(0)}%`, 
          inline: true 
        },
        { 
          name: '📈 Momentum', 
          value: `+${(signal.momentum * 100).toFixed(0)}%`, 
          inline: true 
        },
        { 
          name: '💬 Mentions', 
          value: signal.mentions.toLocaleString(), 
          inline: true 
        },
        { 
          name: '⏱️ Timeframe', 
          value: signal.swingScore.timeframe, 
          inline: true 
        },
        { 
          name: '⚠️ Risk', 
          value: signal.swingScore.riskLevel, 
          inline: true 
        },
        { 
          name: '🚪 Exit', 
          value: signal.swingScore.exitTrigger, 
          inline: true 
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Signal ${signal.type} • React: ✅=entered 📈=watching 🚫=pass` 
      });

    const message = await channel.send({ embeds: [embed] });
    
    // Add reaction options
    await message.react('✅');
    await message.react('📈');
    await message.react('🚫');
    
    return message;
  }

  async postStatus(status) {
    const channel = await this.client.channels.fetch(this.channelId);
    
    const fields = [];
    
    if (status.nextSignalInHours > 0) {
      fields.push({
        name: '⏳ Rate Limit',
        value: `Next signal in ~${status.nextSignalInHours}h`,
        inline: true
      });
    }
    
    if (status.recentSignals.length > 0) {
      fields.push({
        name: '🕒 Recent Signals',
        value: status.recentSignals.map(s => `${s.keyword} (${s.hoursAgo}h ago)`).join('\n'),
        inline: false
      });
    }
    
    if (status.cooldownKeywords.length > 0) {
      fields.push({
        name: '🔒 In Cooldown (48h)',
        value: status.cooldownKeywords.join(', '),
        inline: false
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x666666)
      .setTitle('📊 Social Arbitrage Status')
      .setDescription('High-quality swing trade signals from social data')
      .addFields(fields.length > 0 ? fields : [{ name: 'Status', value: 'Monitoring for signals...', inline: false }])
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  async postWatchlist(keywords) {
    const channel = await this.client.channels.fetch(this.channelId);
    
    const embed = new EmbedBuilder()
      .setColor(0x0d9488)
      .setTitle('👁️ Weekly Watchlist')
      .setDescription('Keywords being monitored for social momentum')
      .addFields(
        Object.entries(keywords).map(([category, terms]) => ({
          name: category.replace('-', ' ').toUpperCase(),
          value: terms.join(', '),
          inline: false
        }))
      )
      .setFooter({ text: 'Signals posted when confidence ≥80% and momentum ≥100%' });

    await channel.send({ embeds: [embed] });
  }

  getRiskColor(riskLevel) {
    const colors = {
      'MEDIUM': 0xf59e0b,     // Yellow
      'HIGH': 0xef4444,       // Red
      'VERY HIGH': 0x7f1d1d,  // Dark red
    };
    return colors[riskLevel] || 0x6b7280;
  }
}

module.exports = SocialArbitragePoster;
