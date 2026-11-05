import { registerChannel, mailChannel, broadcastChannel } from "@/framework/facade.js";

registerChannel(mailChannel);
registerChannel(broadcastChannel);