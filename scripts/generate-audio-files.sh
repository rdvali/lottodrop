#!/bin/bash

# LottoDrop Audio File Generator
# Generates all required audio files with precise durations using ffmpeg
# Requires: ffmpeg (install via: brew install ffmpeg)

set -e

echo "🎵 LottoDrop Audio File Generator v2.0"
echo "======================================="

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg not found"
    echo "Install with: brew install ffmpeg"
    exit 1
fi

# Define output directories
BASE_DIR="/Users/rd/Documents/Projects/LottoDrop/frontend/public/sounds"
COUNTDOWN_DIR="$BASE_DIR/countdown"
ROUND_DIR="$BASE_DIR/round"
REVEAL_DIR="$BASE_DIR/reveal"
RESULT_DIR="$BASE_DIR/result"
UI_DIR="$BASE_DIR/ui"

# Create directories
echo "📁 Creating directories..."
mkdir -p "$COUNTDOWN_DIR" "$ROUND_DIR" "$REVEAL_DIR" "$RESULT_DIR" "$UI_DIR"

# Function to generate sine wave tone
# Usage: generate_tone <frequency> <duration> <output_file>
generate_tone() {
    local freq=$1
    local dur=$2
    local output=$3

    ffmpeg -f lavfi -i "sine=frequency=${freq}:duration=${dur}" \
        -af "asetrate=44100,aresample=44100,afade=t=in:st=0:d=0.01,afade=t=out:st=$(echo "$dur - 0.01" | bc):d=0.01" \
        -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "sine=frequency=${freq}:duration=${dur}" \
        -af "asetrate=44100,aresample=44100,afade=t=in:st=0:d=0.01,afade=t=out:st=$(echo "$dur - 0.01" | bc):d=0.01" \
        -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

# Function to generate ascending chime (multiple tones)
generate_chime() {
    local dur=$1
    local output=$2

    # Mix three sine waves (C-E-G major chord)
    ffmpeg -f lavfi -i "sine=frequency=523.25:duration=${dur}" \
           -f lavfi -i "sine=frequency=659.25:duration=${dur}" \
           -f lavfi -i "sine=frequency=783.99:duration=${dur}" \
           -filter_complex "[0:a][1:a][2:a]amix=inputs=3:duration=shortest,volume=3,afade=t=in:st=0:d=0.02,afade=t=out:st=$(echo "$dur - 0.05" | bc):d=0.05" \
           -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "sine=frequency=523.25:duration=${dur}" \
           -f lavfi -i "sine=frequency=659.25:duration=${dur}" \
           -f lavfi -i "sine=frequency=783.99:duration=${dur}" \
           -filter_complex "[0:a][1:a][2:a]amix=inputs=3:duration=shortest,volume=3,afade=t=in:st=0:d=0.02,afade=t=out:st=$(echo "$dur - 0.05" | bc):d=0.05" \
           -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

# Function to generate whoosh (swept frequency)
generate_whoosh() {
    local dur=$1
    local output=$2

    # Sweep from 300Hz to 150Hz
    ffmpeg -f lavfi -i "aevalsrc='sin(2*PI*t*(300-150*t/${dur})):sample_rate=44100:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.05,afade=t=out:st=$(echo "$dur - 0.1" | bc):d=0.1" \
        -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "aevalsrc='sin(2*PI*t*(300-150*t/${dur})):sample_rate=44100:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.05,afade=t=out:st=$(echo "$dur - 0.1" | bc):d=0.1" \
        -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

# Function to generate riser (rising pitch sweep)
generate_riser() {
    local dur=$1
    local output=$2

    # Sweep from 100Hz to 800Hz with increasing volume
    ffmpeg -f lavfi -i "aevalsrc='sin(2*PI*t*(100+700*t/${dur})):sample_rate=44100:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.2,volume='min(0.5*(t/${dur}),0.5)'" \
        -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "aevalsrc='sin(2*PI*t*(100+700*t/${dur})):sample_rate=44100:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.2,volume='min(0.5*(t/${dur}),0.5)'" \
        -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

# Function to generate click (short percussive)
generate_click() {
    local dur=$1
    local output=$2

    # Very short burst of white noise
    ffmpeg -f lavfi -i "anoisesrc=duration=${dur}:color=white:sample_rate=44100" \
        -af "afade=t=in:st=0:d=0.001,afade=t=out:st=$(echo "$dur - 0.001" | bc):d=0.001,volume=0.3" \
        -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "anoisesrc=duration=${dur}:color=white:sample_rate=44100" \
        -af "afade=t=in:st=0:d=0.001,afade=t=out:st=$(echo "$dur - 0.001" | bc):d=0.001,volume=0.3" \
        -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

# Function to generate thump (low frequency impact)
generate_thump() {
    local dur=$1
    local output=$2

    # Low frequency tone with quick decay
    ffmpeg -f lavfi -i "sine=frequency=80:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.01,afade=t=out:st=$(echo "$dur - 0.05" | bc):d=0.05,volume=0.7" \
        -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "sine=frequency=80:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.01,afade=t=out:st=$(echo "$dur - 0.05" | bc):d=0.05,volume=0.7" \
        -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

# Function to generate sparkle_up (ascending arpeggio)
generate_sparkle_up() {
    local dur=$1
    local output=$2

    # Rising major triad arpeggio
    ffmpeg -f lavfi -i "sine=frequency=523.25:duration=0.25" \
           -f lavfi -i "sine=frequency=659.25:duration=0.25" \
           -f lavfi -i "sine=frequency=783.99:duration=0.25" \
           -f lavfi -i "sine=frequency=1046.50:duration=0.5" \
           -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1[out];[out]afade=t=out:st=$(echo "$dur - 0.1" | bc):d=0.1" \
           -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "sine=frequency=523.25:duration=0.25" \
           -f lavfi -i "sine=frequency=659.25:duration=0.25" \
           -f lavfi -i "sine=frequency=783.99:duration=0.25" \
           -f lavfi -i "sine=frequency=1046.50:duration=0.5" \
           -filter_complex "[0][1][2][3]concat=n=4:v=0:a=1[out];[out]afade=t=out:st=$(echo "$dur - 0.1" | bc):d=0.1" \
           -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

# Function to generate soft_down (descending tone)
generate_soft_down() {
    local dur=$1
    local output=$2

    # Descending sweep with fade
    ffmpeg -f lavfi -i "aevalsrc='sin(2*PI*t*(400-200*t/${dur})):sample_rate=44100:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.05,afade=t=out:st=$(echo "$dur - 0.15" | bc):d=0.15,volume=0.5" \
        -c:a libvorbis -q:a 4 -y "$output.ogg" 2>/dev/null

    ffmpeg -f lavfi -i "aevalsrc='sin(2*PI*t*(400-200*t/${dur})):sample_rate=44100:duration=${dur}" \
        -af "afade=t=in:st=0:d=0.05,afade=t=out:st=$(echo "$dur - 0.15" | bc):d=0.15,volume=0.5" \
        -c:a libmp3lame -q:a 4 -y "$output.mp3" 2>/dev/null
}

echo ""
echo "🎼 Generating countdown sounds..."
generate_tone 450 0.20 "$COUNTDOWN_DIR/tick_3"
echo "   ✓ tick_3 (450Hz, 0.20s)"
generate_tone 550 0.20 "$COUNTDOWN_DIR/tick_2"
echo "   ✓ tick_2 (550Hz, 0.20s)"
generate_tone 650 0.20 "$COUNTDOWN_DIR/tick_1"
echo "   ✓ tick_1 (650Hz, 0.20s)"
generate_chime 0.8 "$COUNTDOWN_DIR/go"
echo "   ✓ go (chime, 0.8s)"

echo ""
echo "🎯 Generating round sound..."
generate_whoosh 0.7 "$ROUND_DIR/start"
echo "   ✓ start (whoosh, 0.7s)"

echo ""
echo "🎪 Generating reveal sounds..."
generate_riser 2.3 "$REVEAL_DIR/riser"
echo "   ✓ riser (tension, 2.3s)"
generate_click 0.05 "$REVEAL_DIR/tick"
echo "   ✓ tick (click, 0.05s)"
generate_thump 0.25 "$REVEAL_DIR/drum"
echo "   ✓ drum (thump, 0.25s)"

echo ""
echo "🏆 Generating result sounds..."
generate_sparkle_up 1.0 "$RESULT_DIR/win"
echo "   ✓ win (sparkle_up, 1.0s)"
generate_soft_down 0.8 "$RESULT_DIR/lose"
echo "   ✓ lose (soft_down, 0.8s)"

echo ""
echo "🖱️  Generating UI sounds..."
generate_click 0.05 "$UI_DIR/button_click"
echo "   ✓ button_click (click, 0.05s)"
generate_tone 800 0.08 "$UI_DIR/hover"
echo "   ✓ hover (subtle tone, 0.08s)"

echo ""
echo "✅ Audio generation complete!"
echo ""
echo "📊 Summary:"
echo "   Total sounds: 12"
echo "   Total files: 24 (OGG + MP3)"
echo "   Output: $BASE_DIR"
echo ""
echo "🔍 Verify durations with:"
echo "   ffprobe -i $COUNTDOWN_DIR/tick_3.ogg -show_entries format=duration -v quiet -of csv=\"p=0\""
echo ""
