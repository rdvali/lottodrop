// generateVictorySound.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static"; // ✅ built-in binary

const OUTPUT_DIR = "output_sounds/result";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_NAME = "victory";
const WAV_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.wav`);
const OGG_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.ogg`);
const MP3_PATH = path.join(OUTPUT_DIR, `${BASE_NAME}.mp3`);

function generateVictorySound() {
  console.log("🏆 Generating cinematic casino WIN sound...");

  // 🎬 Layer 1: Sub boom (deep cinematic impact)
  const subBoom = `sine=f=90:d=0.6,volume=0.9,afade=t=out:st=0.5:d=0.1`;

  // 🎬 Layer 2: High-pitch shimmer (sparkle of winning)
  const sparkle = `sine=f=1800:d=0.4,volume=0.6,afade=t=out:st=0.3:d=0.2,aecho=0.5:0.5:30:0.2`;

  // 🎬 Layer 3: Rising tone (emotional buildup)
  const rise = `sine=f=600:d=2.2,asetrate=44100*1.5,atempo=1.5,volume=0.5,afade=t=out:st=2.0:d=0.5`;

  // 🎬 Layer 4: Firework crackle tail
  const firework = `anoisesrc=d=1.5:c=white,highpass=f=4000,volume=0.35,afade=t=out:st=1.0:d=0.6,aecho=0.6:0.6:60:0.25`;

  const filter = `[0:a][1:a][2:a][3:a]amix=inputs=4:duration=longest,volume=1.3,afade=t=out:st=2.8:d=0.5`;

  const cmd = `
    "${ffmpegPath}" -y \
      -f lavfi -i "${subBoom}" \
      -f lavfi -i "${sparkle}" \
      -f lavfi -i "${rise}" \
      -f lavfi -i "${firework}" \
      -filter_complex "${filter}" \
      -t 3.5 \
      -ar 44100 -ac 1 -b:a 192k \
      "${WAV_PATH}"
  `;

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ WAV generated: ${WAV_PATH}`);

    execSync(`"${ffmpegPath}" -y -i "${WAV_PATH}" -c:a libvorbis "${OGG_PATH}"`, { stdio: "inherit" });
    execSync(`"${ffmpegPath}" -y -i "${WAV_PATH}" -c:a libmp3lame -qscale:a 3 "${MP3_PATH}"`, { stdio: "inherit" });

    console.log("🎵 Victory sound generated successfully!");
  } catch (err) {
    console.error("❌ Generation failed:", err.message);
  }
}

generateVictorySound();