import { browserDetect, type BrowserDetectResult } from "@/plugins/browserDetect";

export default function useBrowserDetect(): BrowserDetectResult {
  return browserDetect;
}
