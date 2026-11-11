'use strict';

const storySound = (() => {
  let context;
  let gain;
  let rain;
  let rainLevel;
  let enabled = false;

  function unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    if (!context) {
      context = new Audio();
      gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
    }
    context.resume().catch(() => {});
    enabled = true;
    gain.gain.setTargetAtTime(.46, context.currentTime, .04);
    return true;
  }

  function stop() {
    enabled = false;
    if (gain) gain.gain.setTargetAtTime(0, context.currentTime, .045);
    if (rain) {
      rain.stop(context.currentTime + .2);
      rain = null;
    }
  }

  function rainAt(volume) {
    if (!enabled) return;
    if (!rain) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1350;
      filter.Q.value = .65;
      rainLevel = context.createGain();
      rainLevel.gain.value = 0;
      rain = context.createBufferSource();
      rain.buffer = buffer;
      rain.loop = true;
      rain.connect(filter).connect(rainLevel).connect(gain);
      rain.start();
    }
    rainLevel.gain.setTargetAtTime(volume, context.currentTime, .3);
  }

  function tone(start, end, length, volume, type, delay = 0, formant = 0) {
    const at = context.currentTime + delay;
    const wave = context.createOscillator();
    const envelope = context.createGain();
    wave.type = type;
    wave.frequency.setValueAtTime(start, at);
    wave.frequency.exponentialRampToValueAtTime(end, at + length);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + Math.min(.09, length * .25));
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    if (formant) {
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = formant;
      filter.Q.value = 1.6;
      wave.connect(filter).connect(envelope);
    } else {
      wave.connect(envelope);
    }
    envelope.connect(gain);
    wave.start(at);
    wave.stop(at + length);
  }

  function play(shot) {
    if (!enabled) return;
    rainAt(shot === 'door' || shot === 'crack' ? .015 : shot === 'key' ? .035 : .12);
    if (shot === 'look') {
      tone(690, 380, .63, .23, 'triangle', 0, 1000);
      tone(1380, 760, .56, .042, 'sine', .02);
    }
    if (shot === 'turn' || shot === 'approach') {
      [.18, .79].forEach(delay => tone(127, 66, .22, .11, 'triangle', delay));
    }
    if (shot === 'key') {
      tone(1740, 1690, .32, .1, 'sine', .35);
      tone(2670, 2630, .23, .035, 'sine', .39);
    }
    if (shot === 'crack') {
      tone(244, 180, .55, .09, 'triangle', 0, 420);
    }
  }

  return {unlock, stop, play, get enabled(){return enabled}};
})();
