import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.execute.tracker",
  appName: "Execute",
  webDir: "dist",
  server: {
    // The API is plain http on the LAN; https origin + http API would be blocked as mixed content.
    androidScheme: "http",
    cleartext: true,
  },
};

export default config;
