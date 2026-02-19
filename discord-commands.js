// Discord Command Listener for Social Arbitrage
// Manage watchlist from #social-arbitrage channel

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const MONITOR_CHANNEL = '1473265368272470047'; // #social-arbitrage

class SocialArbitrageCommandListener {
  constructor(botToken) {
    this.botToken = botToken;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
  }

  async start() {
    this.client.on('ready', () => {
      console.log(`[social-arb] Command listener ready as ${this.client.user.tag}`);
    });

    this.client.on('messageCreate', async (message) => {
      // Only listen in #social-arbitrage
      if (message.channelId !== MONITOR_CHANNEL) return;
      
      // Ignore own messages
      if (message.author.bot) return;

      const content = message.content.trim();

      // Watchlist commands
      if (content.startsWith('!watch ')) {
        await this.handleWatchCommand(message, content);
      }
      else if (content.startsWith('!research ')) {
        await this.handleResearchCommand(message, content);
      }
      else if (content === '!help') {
        await this.showHelp(message);
      }
    });

    await this.client.login(this.botToken);
  }

  async handleWatchCommand(message, content) {
    const parts = content.slice(7).trim().split(' ');
    const action = parts[0]?.toLowerCase();
    
    const workdir = '/home/agent/projects/trading/social-arbitrage';

    try {
      switch (action) {
        case 'add':
          if (parts.length < 2) {
            await message.reply('❌ Usage: `!watch add TICKER "Keyword"`');
            return;
          }
          const ticker = parts[1].toUpperCase();
          const keyword = parts.slice(2).join(' ').replace(/"/g, '') || ticker;
          
          await execAsync(`node watchlist.js add ${ticker} "${keyword}"`, { cwd: workdir });
          await message.reply(`✅ Added $${ticker} (${keyword}) to watchlist`);
          break;

        case 'remove':
        case 'rm':
          if (parts.length < 2) {
            await message.reply('❌ Usage: `!watch remove TICKER`');
            return;
          }
          const rmTicker = parts[1].toUpperCase();
          
          await execAsync(`node watchlist.js remove ${rmTicker}`, { cwd: workdir });
          await message.reply(`✅ Removed $${rmTicker} from watchlist`);
          break;

        case 'list':
        case 'ls':
          const { stdout } = await execAsync('node watchlist.js list', { cwd: workdir });
          
          // Format for Discord
          const embed = new EmbedBuilder()
            .setColor(0x0d9488)
            .setTitle('📋 Social Arbitrage Watchlist')
            .setDescription('```\n' + stdout.slice(stdout.indexOf('\n') + 1) + '\n```')
            .setFooter({ text: 'Use !watch add/remove to manage' });
          
          await message.reply({ embeds: [embed] });
          break;

        case 'check':
          await message.reply('🔍 Running research on all watchlisted tickers... (this may take a few minutes)');
          
          // Run in background - will post to channel when done
          execAsync('node watchlist.js check', { 
            cwd: workdir,
            timeout: 600000 
          }).catch(err => {
            console.error('[social-arb] Watchlist check error:', err);
          });
          break;

        default:
          await message.reply('❌ Unknown command. Use `!watch add/remove/list/check` or `!help`');
      }
    } catch (err) {
      console.error('[social-arb] Command error:', err);
      await message.reply('❌ Error: ' + (err.stderr || err.message));
    }
  }

  async handleResearchCommand(message, content) {
    const query = content.slice(10).trim();
    
    if (!query) {
      await message.reply('❌ Usage: `!research "Keyword"` or `!research TICKER`');
      return;
    }

    await message.reply(`🔍 Researching "${query}"... (this may take 1-2 minutes)`);

    const workdir = '/home/agent/projects/trading/social-arbitrage';

    try {
      // Run research in background
      const { stdout, stderr } = await execAsync(
        `node run-research.js "${query}"`,
        { cwd: workdir, timeout: 180000 }
      );

      // Check if signal was found
      if (stdout.includes('HIGH CONFIDENCE SIGNAL DETECTED')) {
        await message.reply('✅ Research complete! High-confidence signal detected and posted above.');
      } else if (stdout.includes('Signal strength below threshold')) {
        await message.reply('✅ Research complete. No high-confidence signals found (quality over quantity).');
      } else {
        await message.reply('✅ Research complete. Check #social-arbitrage for results.');
      }
    } catch (err) {
      console.error('[social-arb] Research error:', err);
      await message.reply('❌ Research failed: ' + (err.stderr || err.message));
    }
  }

  async showHelp(message) {
    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('📚 Social Arbitrage Commands')
      .setDescription('Manage your watchlist and research tickers from Discord')
      .addFields(
        { 
          name: '!watch add TICKER "Keyword"', 
          value: 'Add ticker to watchlist\nExample: `!watch add HOOD "Robinhood"`',
          inline: false 
        },
        { 
          name: '!watch remove TICKER', 
          value: 'Remove ticker from watchlist\nExample: `!watch remove TSLA`',
          inline: false 
        },
        { 
          name: '!watch list', 
          value: 'Show all watched tickers',
          inline: false 
        },
        { 
          name: '!watch check', 
          value: 'Research all tickers in watchlist',
          inline: false 
        },
        { 
          name: '!research "Keyword"', 
          value: 'Research any keyword/ticker\nExample: `!research "iPhone 16"`',
          inline: false 
        }
      )
      .setFooter({ text: 'Signals auto-post when confidence ≥60' });

    await message.reply({ embeds: [embed] });
  }
}

// Start if run directly
if (require.main === module) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error('Error: DISCORD_BOT_TOKEN not set');
    process.exit(1);
  }
  
  const listener = new SocialArbitrageCommandListener(botToken);
  listener.start().catch(console.error);
}

module.exports = SocialArbitrageCommandListener;
