import type { Config } from "tailwindcss";

// พาเลตทะเลลึก + สีตามบทบาท (ยกมาจาก mockup ที่อนุมัติแล้ว)
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        abyss: { DEFAULT: "#081521", 2: "#0d2135" },
        surface: { DEFAULT: "#153048", 2: "#1b3a55" },
        kelp: "#22496a",
        foam: "#eaf5fa",
        mist: { DEFAULT: "#8fb0c4", dim: "#5f8299" },
        bluefish: { DEFAULT: "#38bdf8", deep: "#0e7fb8" }, // ปลาฟ้า
        redfish: { DEFAULT: "#fb6a5e", deep: "#c53c34" },  // ปลาแดง
        lantern: { DEFAULT: "#f5b642", deep: "#c8862a" },  // ชาวประมง
        good: "#4ade80",
      },
      fontFamily: {
        display: ["var(--font-mitr)", "sans-serif"],
        body: ["var(--font-plex-thai)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
