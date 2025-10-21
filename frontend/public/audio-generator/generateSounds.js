// generateWinnerSound.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "output_sounds/result";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_NAME = "win";
const DUR = 3.0; // seconds

const WAV_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.wav`);
const OGG_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.ogg`);
const MP3_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.mp3`);

function generateWinnerSound() {
  console.log("🏆 Generating cinematic winner sound...");

  // 1️⃣ Sub Boom (low bass impact)
  const subBoom = `sine=f=80:d=0.4,volume=0.8,afade=t=out:st=0.3:d=0.1`;

  // 2️⃣ Bright Sparkle (rising tone)
  const sparkle = `sine=f=1000:d=0.4,asetrate=44100*2,atempo=2.0,volume=0.5,afade=t=out:st=0.3:d=0.1`;

  // 3️⃣ Firework shimmer (high frequency tail)
  const shimmer = `anoisesrc=d=1.5:c=white,highpass=f=5000,volume=0.3,afade=t=out:st=1.0:d=0.5,aecho=0.6:0.6:50:0.3`;

  // 4️⃣ Combine them sequentially with fades
  const filter = `[0:a][1:a][2:a]concat=n=3:v=0:a=1,volume=1.2,afade=t=out:st=${DUR - 0.5}:d=0.5`;

  const cmd = `
    ffmpeg -y \
      -f lavfi -i "${subBoom}" \
      -f lavfi -i "${sparkle}" \
      -f lavfi -i "${shimmer}" \
      -filter_complex "${filter}" \
      -t ${DUR} \
      -ar 44100 -ac 1 -b:a 192k \
      "${WAV_PATH}"
  `;

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ WAV generated: ${WAV_PATH}`);

    // Convert to OGG + MP3
    execSync(`ffmpeg -y -i "${WAV_PATH}" -c:a libvorbis "${OGG_PATH}"`, { stdio: "inherit" });
    execSync(`ffmpeg -y -i "${WAV_PATH}" -c:a libmp3lame -qscale:a 3 "${MP3_PATH}"`, { stdio: "inherit" });

    console.log("🎵 Winner sound generated successfully in all formats!");
  } catch (err) {
    console.error("❌ Generation failed:", err.message);
  }
}

generateWinnerSound();