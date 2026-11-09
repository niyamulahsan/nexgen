import { broadcastChannel, mailChannel, registerChannel } from "@/framework/facade.js";

registerChannel(mailChannel);
registerChannel(broadcastChannel);
