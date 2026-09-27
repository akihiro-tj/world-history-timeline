import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // 年表データは小さくてもインライン化せず、ハッシュ付きのファイルとして出す（spec §4.2）
    assetsInlineLimit: (file) => (file.endsWith("/src/data/timeline.json") ? false : undefined),
  },
});
