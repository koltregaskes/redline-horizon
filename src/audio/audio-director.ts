import type {
  AppOptions,
  BranchId,
  MusicPackDefinition,
  RunEvent,
  SceneryMode,
  WeatherModifier,
} from "../game/types";

type MusicSectionKey = "cruise" | "branch" | "finish";

export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private currentMusicPack: MusicPackDefinition | null = null;
  private currentSection: MusicSectionKey = "cruise";
  private sequencerId: number | null = null;
  private lowTimeTriggered = false;
  private step = 0;
  private options: AppOptions = {
    musicEnabled: true,
    effectsEnabled: true,
    tutorialEnabled: true,
    filmGrainEnabled: true,
  };

  async arm() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.effectsBus = this.context.createGain();
      this.master.gain.value = 0.5;
      this.musicBus.gain.value = 0.12;
      this.effectsBus.gain.value = 0.18;
      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
      this.master.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.ensureEngineVoice();
    this.applyOptionMix();
  }

  setOptions(options: AppOptions) {
    this.options = options;
    this.applyOptionMix();
  }

  async previewMusicPack(musicPack: MusicPackDefinition) {
    this.currentMusicPack = musicPack;
    this.currentSection = "cruise";
    this.lowTimeTriggered = false;
    await this.arm();
    this.startSequencer();
  }

  async previewTrack(musicPack: MusicPackDefinition) {
    await this.previewMusicPack(musicPack);
  }

  stopMusic() {
    if (this.sequencerId !== null) {
      window.clearInterval(this.sequencerId);
      this.sequencerId = null;
    }
  }

  updateDrive(
    speed: number,
    active: boolean,
    musicState?: { branchChoice: BranchId | null; distanceRemaining: number; lowTime: boolean },
  ) {
    if (!this.context || !this.engineGain || !this.engineOsc || !this.engineFilter) {
      return;
    }

    const targetGain = active && this.options.effectsEnabled ? 0.03 + speed / 4800 : 0;
    this.engineGain.gain.linearRampToValueAtTime(
      targetGain,
      this.context.currentTime + 0.08,
    );
    this.engineOsc.frequency.linearRampToValueAtTime(
      54 + speed * 0.75,
      this.context.currentTime + 0.08,
    );
    this.engineFilter.frequency.linearRampToValueAtTime(
      300 + speed * 4.2,
      this.context.currentTime + 0.08,
    );

    if (!active || !this.currentMusicPack) {
      return;
    }

    const nextSection: MusicSectionKey =
      musicState?.distanceRemaining !== undefined && musicState.distanceRemaining < 1300
        ? "finish"
        : musicState?.branchChoice
          ? "branch"
          : "cruise";
    if (nextSection !== this.currentSection) {
      this.currentSection = nextSection;
      this.startSequencer();
    }

    if (musicState?.lowTime && !this.lowTimeTriggered) {
      this.lowTimeTriggered = true;
      this.playPatternSting(this.currentMusicPack.lowTimeSting, this.currentMusicPack.rootHz, 0.06);
    } else if (!musicState?.lowTime) {
      this.lowTimeTriggered = false;
    }
  }

  playMenuBlip() {
    this.playTone(440, 0.08, "triangle", 0.08);
    this.playTone(660, 0.06, "triangle", 0.05, 0.02);
  }

  playEvents(events: RunEvent[]) {
    for (const event of events) {
      if (event.type === "checkpoint") {
        if (this.currentMusicPack) {
          this.playPatternSting(this.currentMusicPack.checkpointSting, this.currentMusicPack.rootHz, 0.07);
        }
        this.playTone(880, 0.12, "sine", 0.05, 0.05);
      } else if (event.type === "collision") {
        this.playTone(96, 0.28, "sawtooth", 0.16);
        this.playTone(72, 0.24, "square", 0.1, 0.04);
      } else if (event.type === "near-miss") {
        this.playTone(1320, 0.05, "sine", 0.09);
        this.playTone(1567.98, 0.08, "triangle", 0.05, 0.01);
      } else if (event.type === "branch") {
        this.playTone(523.25, 0.1, "triangle", 0.09);
        this.playTone(783.99, 0.12, "triangle", 0.06, 0.06);
      } else if (event.type === "finish") {
        if (this.currentMusicPack) {
          this.playPatternSting(this.currentMusicPack.finishSting, this.currentMusicPack.rootHz, 0.08);
        }
      } else if (event.type === "timeout") {
        this.playTone(220, 0.22, "square", 0.12);
        this.playTone(164.81, 0.28, "sawtooth", 0.08, 0.08);
      } else if (event.type === "story") {
        if (event.beat.tone === "rival") {
          this.playTone(698.46, 0.08, "square", 0.05);
          this.playTone(587.33, 0.07, "triangle", 0.04, 0.06);
        } else if (event.beat.tone === "scenic") {
          this.playTone(987.77, 0.12, "sine", 0.05);
          this.playTone(1318.51, 0.18, "triangle", 0.04, 0.03);
        } else {
          this.playTone(523.25, 0.08, "triangle", 0.05);
        }
      }
    }
  }

  playStageCue(weatherModifier: WeatherModifier, scenery: SceneryMode) {
    if (!this.options.effectsEnabled) {
      return;
    }

    if (weatherModifier === "sea-breeze") {
      this.playTone(987.77, 0.12, "sine", 0.035);
      this.playTone(1318.51, 0.18, "triangle", 0.026, 0.05);
      return;
    }

    if (weatherModifier === "harbor-haze" || scenery === "harbor") {
      this.playTone(196, 0.18, "sawtooth", 0.05);
      this.playTone(293.66, 0.16, "triangle", 0.035, 0.04);
      return;
    }

    if (weatherModifier === "neon-mist" || scenery === "neon") {
      this.playTone(783.99, 0.12, "triangle", 0.04);
      this.playTone(1174.66, 0.14, "sine", 0.03, 0.04);
      return;
    }

    this.playTone(523.25, 0.1, "triangle", 0.032);
  }

  private startSequencer() {
    if (!this.context || !this.currentMusicPack || !this.musicBus) {
      return;
    }

    this.stopMusic();
    this.step = 0;

    const stepDurationMs = (60 / this.currentMusicPack.bpm / 2) * 1000;
    this.sequencerId = window.setInterval(() => {
      if (!this.context || !this.musicBus || !this.currentMusicPack || !this.options.musicEnabled) {
        return;
      }

      const now = this.context.currentTime;
      const section = this.currentMusicPack.sections[this.currentSection];
      const lead = section.leadPattern[this.step % section.leadPattern.length];
      const bass = section.bassPattern[Math.floor(this.step / 2) % section.bassPattern.length];
      const pad = section.padPattern[Math.floor(this.step / 4) % section.padPattern.length];
      const accent =
        section.accentPattern[Math.floor(this.step / 2) % section.accentPattern.length];

      this.playSynthNote(
        this.noteToFrequency(this.currentMusicPack.rootHz, lead),
        0.14,
        "triangle",
        0.055,
        now,
      );
      this.playSynthNote(
        this.noteToFrequency(this.currentMusicPack.rootHz / 2, bass),
        0.24,
        "sawtooth",
        0.075,
        now,
      );

      if (this.step % 2 === 0) {
        this.playSynthNote(
          this.noteToFrequency(this.currentMusicPack.rootHz, pad),
          0.48,
          "sine",
          0.04,
          now,
        );
      }

      if (this.step % 4 === 0) {
        this.playSynthNote(
          this.noteToFrequency(this.currentMusicPack.rootHz * 2, accent),
          0.08,
          "square",
          0.024,
          now,
        );
      }

      this.step += 1;
    }, stepDurationMs);
  }

  private ensureEngineVoice() {
    if (
      !this.context ||
      !this.effectsBus ||
      this.engineOsc ||
      this.engineGain ||
      this.engineFilter
    ) {
      return;
    }

    this.engineOsc = this.context.createOscillator();
    this.engineGain = this.context.createGain();
    this.engineFilter = this.context.createBiquadFilter();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 54;
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 280;
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.effectsBus);
    this.engineOsc.start();
  }

  private applyOptionMix() {
    if (!this.context || !this.master || !this.musicBus || !this.effectsBus) {
      return;
    }

    this.musicBus.gain.linearRampToValueAtTime(
      this.options.musicEnabled ? 0.12 : 0,
      this.context.currentTime + 0.08,
    );
    this.effectsBus.gain.linearRampToValueAtTime(
      this.options.effectsEnabled ? 0.18 : 0,
      this.context.currentTime + 0.08,
    );
  }

  private playPatternSting(pattern: number[], rootHz: number, gainAmount: number) {
    if (!this.context || !this.effectsBus || !this.options.effectsEnabled) {
      return;
    }

    const currentTime = this.context.currentTime;
    const effectsBus = this.effectsBus;
    pattern.forEach((semitone, index) => {
      this.playSynthNote(
        this.noteToFrequency(rootHz, semitone),
        0.14,
        "triangle",
        gainAmount,
        currentTime + index * 0.04,
        effectsBus,
      );
    });
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainAmount: number,
    offset = 0,
  ) {
    if (!this.context || !this.effectsBus || !this.options.effectsEnabled) {
      return;
    }

    this.playSynthNote(
      frequency,
      duration,
      type,
      gainAmount,
      this.context.currentTime + offset,
      this.effectsBus,
    );
  }

  private playSynthNote(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainAmount: number,
    when: number,
    destination = this.musicBus,
  ) {
    if (!this.context || !destination) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(type === "sawtooth" ? 920 : 2400, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(gainAmount, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.03);
  }

  private noteToFrequency(rootHz: number, semitoneOffset: number) {
    return rootHz * 2 ** (semitoneOffset / 12);
  }
}
