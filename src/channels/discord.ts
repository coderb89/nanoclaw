import fs from 'fs';
import path from 'path';

import { Client, Events, GatewayIntentBits, Message, TextChannel } from 'discord.js';

import { ASSISTANT_NAME, GROUPS_DIR, TRIGGER_PATTERN } from '../config.js';
import { readEnvFile } from '../env.js';
import { logger } from '../logger.js';
import { registerChannel, ChannelOpts } from './registry.js';
import {
  Channel,
  OnChatMetadata,
  OnInboundMessage,
  RegisteredGroup,
} from '../types.js';

export interface DiscordChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
}

export class DiscordChannel implements Channel {
  name = 'discord';

  private client: Client | null = null;
  private opts: DiscordChannelOpts;
  private botToken: string;

  constructor(botToken: string, opts: DiscordChannelOpts) {
    this.botToken = botToken;
    this.opts = opts;
  }

  async connect(): Promise<void> {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot) return;

      const channelId = message.channelId;
      const chatJid = `dc:${channelId}`;
      let content = message.content;
      const timestamp = message.createdAt.toISOString();
      const senderName =
        message.member?.displayName ||
        message.author.displayName ||
        message.author.username;
      const sender = message.author.id;
      const msgId = message.id;

      let chatName: string;
      if (message.guild) {
        const textChannel = message.channel as TextChannel;
        chatName = `${message.guild.name} #${textChannel.name}`;
      } else {
        chatName = senderName;
      }

      // Translates Discord @bot mentions into TRIGGER_PATTERN format
      if (this.client?.user) {
        const botId = this.client.user.id;
        const isBotMentioned =
          message.mentions.users.has(botId) ||
          content.includes(`<@${botId}>`) ||
          content.includes(`<@!${botId}>`);

        if (isBotMentioned) {
          content = content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
          if (!TRIGGER_PATTERN.test(content)) {
            content = `@${ASSISTANT_NAME} ${content}`;
          }
        }
      }

      // Download image attachments to group folder so agents can view them via Read tool.
      // Other attachment types remain as descriptive placeholders.
      if (message.attachments.size > 0) {
        const group = this.opts.registeredGroups()[chatJid];
        const attachmentDescriptions = await Promise.all(
          [...message.attachments.values()].map(async (att) => {
            const contentType = att.contentType || '';
            if (contentType.startsWith('image/')) {
              if (group) {
                try {
                  const attachmentsDir = path.join(GROUPS_DIR, group.folder, 'attachments');
                  fs.mkdirSync(attachmentsDir, { recursive: true });
                  const safeName = (att.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
                  const filename = `${Date.now()}_${safeName}`;
                  const filepath = path.join(attachmentsDir, filename);
                  const resp = await fetch(att.url);
                  fs.writeFileSync(filepath, Buffer.from(await resp.arrayBuffer()));
                  const containerPath = `/workspace/group/attachments/${filename}`;
                  logger.info({ filename, containerPath }, 'Discord image attachment saved');
                  return `[Image: ${att.name || 'image'} — saved to ${containerPath} — use the Read tool to view it]`;
                } catch (err) {
                  logger.warn({ name: att.name, err }, 'Failed to save Discord image attachment');
                }
              }
              return `[Image: ${att.name || 'image'} — could not download]`;
            } else if (contentType.startsWith('video/')) {
              return `[Video: ${att.name || 'video'}]`;
            } else if (contentType.startsWith('audio/')) {
              return `[Audio: ${att.name || 'audio'}]`;
            } else {
              return `[File: ${att.name || 'file'}]`;
            }
          }),
        );
        content = content
          ? `${content}\n${attachmentDescriptions.join('\n')}`
          : attachmentDescriptions.join('\n');
      }

      // Handles reply context
      if (message.reference?.messageId) {
        try {
          const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
          const replyAuthor =
            repliedTo.member?.displayName ||
            repliedTo.author.displayName ||
            repliedTo.author.username;
          content = `[Reply to ${replyAuthor}] ${content}`;
        } catch {
          // Referenced message may have been deleted
        }
      }

      const isGroup = message.guild !== null;
      this.opts.onChatMetadata(chatJid, timestamp, chatName, 'discord', isGroup);

      const group = this.opts.registeredGroups()[chatJid];
      if (!group) {
        logger.debug({ chatJid, chatName }, 'Message from unregistered Discord channel');
        return;
      }

      this.opts.onMessage(chatJid, {
        id: msgId,
        chat_jid: chatJid,
        sender,
        sender_name: senderName,
        content,
        timestamp,
        is_from_me: false,
      });

      logger.info({ chatJid, chatName, sender: senderName }, 'Discord message stored');
    });

    this.client.on(Events.Error, (err) => {
      logger.error({ err: err.message }, 'Discord client error');
    });

    return new Promise<void>((resolve) => {
      this.client!.once(Events.ClientReady, (readyClient) => {
        logger.info({ username: readyClient.user.tag, id: readyClient.user.id }, 'Discord bot connected');
        console.log(`\n  Discord bot: ${readyClient.user.tag}`);
        console.log(`  Use /chatid command or check channel IDs in Discord settings\n`);
        resolve();
      });
      this.client!.login(this.botToken);
    });
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.client) { logger.warn('Discord client not initialized'); return; }
    try {
      const channelId = jid.replace(/^dc:/, '');
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !('send' in channel)) { logger.warn({ jid }, 'Discord channel not found or not text-based'); return; }
      const textChannel = channel as TextChannel;
      const MAX_LENGTH = 2000;
      if (text.length <= MAX_LENGTH) {
        await textChannel.send(text);
      } else {
        for (let i = 0; i < text.length; i += MAX_LENGTH) {
          await textChannel.send(text.slice(i, i + MAX_LENGTH));
        }
      }
      logger.info({ jid, length: text.length }, 'Discord message sent');
    } catch (err) {
      logger.error({ jid, err }, 'Failed to send Discord message');
    }
  }

  isConnected(): boolean { return this.client !== null && this.client.isReady(); }
  ownsJid(jid: string): boolean { return jid.startsWith('dc:'); }

  async disconnect(): Promise<void> {
    if (this.client) { this.client.destroy(); this.client = null; logger.info('Discord bot stopped'); }
  }

  async setTyping(jid: string, isTyping: boolean): Promise<void> {
    if (!this.client || !isTyping) return;
    try {
      const channelId = jid.replace(/^dc:/, '');
      const channel = await this.client.channels.fetch(channelId);
      if (channel && 'sendTyping' in channel) { await (channel as TextChannel).sendTyping(); }
    } catch (err) {
      logger.debug({ jid, err }, 'Failed to send Discord typing indicator');
    }
  }
}

registerChannel('discord', (opts: ChannelOpts) => {
  const envVars = readEnvFile(['DISCORD_BOT_TOKEN']);
  const token = process.env.DISCORD_BOT_TOKEN || envVars.DISCORD_BOT_TOKEN || '';
  if (!token) { logger.warn('Discord: DISCORD_BOT_TOKEN not set'); return null; }
  return new DiscordChannel(token, opts);
});
