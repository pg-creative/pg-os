#!/usr/bin/env python3
"""Render a seamless 4-bar disco loop to WAV (pure stdlib, no numpy).

This is the bundled DEFAULT party track so party mode always plays real audio
out of the box. PG drops his own /audio/party.mp3 to override it.
"""
import math, wave, struct, random, sys

SR = 44100
BPM = 118.0
SIXTEENTH = 60.0 / BPM / 4.0
BARS = 4
STEPS = BARS * 16
TOTAL = SIXTEENTH * STEPS
N = int(TOTAL * SR)
buf = [0.0] * N

random.seed(7)

def add(start_t, samples):
    s0 = int(start_t * SR)
    for i, v in enumerate(samples):
        idx = (s0 + i) % N  # wrap tails for a seamless loop
        buf[idx] += v

def env(n, a, d):
    """attack/decay envelope of length n samples (a,d in samples)."""
    out = []
    for i in range(n):
        if i < a:
            g = i / max(1, a)
        else:
            g = math.exp(-(i - a) / max(1, d))
        out.append(g)
    return out

def kick(t):
    dur = int(0.18 * SR)
    e = env(dur, int(0.002 * SR), int(0.045 * SR))
    out = []
    for i in range(dur):
        f = 150 * math.exp(-i / (0.03 * SR)) + 48
        out.append(0.95 * e[i] * math.sin(2 * math.pi * f * (i / SR)))
    add(t, out)

def hat(t, open_):
    dur = int((0.13 if open_ else 0.035) * SR)
    e = env(dur, 1, int(dur * 0.5))
    g = 0.16 if open_ else 0.12
    add(t, [g * e[i] * (random.random() * 2 - 1) for i in range(dur)])

def clap(t):
    dur = int(0.14 * SR)
    e = env(dur, int(0.001 * SR), int(0.05 * SR))
    # bandpass-ish noise via simple averaging
    out = []
    prev = 0.0
    for i in range(dur):
        nz = random.random() * 2 - 1
        prev = prev * 0.6 + nz * 0.4
        out.append(0.32 * e[i] * prev)
    add(t, out)

def saw(f, ph):
    # naive saw
    x = (f * ph) % 1.0
    return 2 * x - 1

def bass(t, freq):
    dur = int(0.18 * SR)
    e = env(dur, int(0.004 * SR), int(0.06 * SR))
    out = []
    # one-pole lowpass
    y = 0.0
    a = 0.18
    for i in range(dur):
        s = saw(freq, i / SR)
        y = y + a * (s - y)
        out.append(0.34 * e[i] * y)
    add(t, out)

def stab(t, freqs):
    dur = int(0.26 * SR)
    e = env(dur, int(0.006 * SR), int(0.08 * SR))
    out = [0.0] * dur
    for f in freqs:
        y = 0.0
        a = 0.30
        for i in range(dur):
            s = 0.5 * saw(f, i / SR) + 0.5 * saw(f * 1.005, i / SR)
            y = y + a * (s - y)
            out[i] += 0.11 * e[i] * y
    add(t, out)

# A minor vamp: Am F C G
HZ = dict(G2=98.0, A2=110.0, C3=130.81, E3=164.81, F3=174.61, G3=196.0,
          A3=220.0, B3=246.94, C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.0)
VAMP = [
    (HZ['A2'], HZ['A3'], [HZ['A3'], HZ['C4'], HZ['E4']]),
    (HZ['F3'], HZ['F3'] * 2, [HZ['F3'], HZ['A3'], HZ['C4']]),
    (HZ['C3'], HZ['C4'], [HZ['C4'], HZ['E4'], HZ['G4']]),
    (HZ['G2'], HZ['G3'], [HZ['G3'], HZ['B3'], HZ['D4']]),
]

for step in range(STEPS):
    t = step * SIXTEENTH
    bar = (step // 16) % 4
    s = step % 16
    root, octv, chord = VAMP[bar]
    if s % 4 == 0:
        kick(t)
    if s in (4, 12):
        clap(t)
    if s % 2 == 0:
        hat(t, s == 14)
        bass(t, root if s % 4 == 0 else octv)
    if s == 0:
        stab(t, chord)

# normalize
peak = max(1e-6, max(abs(v) for v in buf))
g = 0.89 / peak
out_path = sys.argv[1] if len(sys.argv) > 1 else "party-default.wav"
w = wave.open(out_path, "w")
w.setnchannels(1)
w.setsampwidth(2)
w.setframerate(SR)
frames = bytearray()
for v in buf:
    s = int(max(-1.0, min(1.0, v * g)) * 32767)
    frames += struct.pack("<h", s)
w.writeframes(bytes(frames))
w.close()
print(f"wrote {out_path}: {TOTAL:.2f}s, {N} samples")
