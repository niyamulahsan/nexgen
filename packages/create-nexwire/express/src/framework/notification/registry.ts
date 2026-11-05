import type { NotificationChannel } from "@/framework/notification/contracts.js";

const channels = new Map<string, NotificationChannel>();

export function registerChannel(channel: NotificationChannel) {
  channels.set(channel.name, channel);
}

export function getChannels(): NotificationChannel[] {
  return Array.from(channels.values());
}

export function clearChannels() {
  channels.clear();
}