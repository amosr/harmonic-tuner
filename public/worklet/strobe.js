function Strobe(freq, sampleRate) {
  const f = 2 * Math.PI * (freq / sampleRate);

  return { freq: freq, f: f, sin: 0.0, cos: 1.0, angle: 0.0, norm: 0.0, angle_diff: 0.0 };
}
function strobeGenSample(strobe) {
  strobe.sin = strobe.sin + strobe.f * strobe.cos;
  strobe.cos = strobe.cos - strobe.f * strobe.sin;
  return strobe.sin;
}

class StrobeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    this.sampleRate = options.processorOptions.sampleRate;
    this.updatePeriod = options.processorOptions.updatePeriod ?? 5;
    this.filterNorm = options.processorOptions.filterNorm ?? 0.99;
    this.filterRms = options.processorOptions.filterRms ?? 0.99;
    this.filterAngle = options.processorOptions.filterAngle ?? 0.99;

    this.updateEvery = 0;
    this.rms = 0.0;
    this.strobes = [];

    this.port.onmessage = (e) => {
      const data = e.data;
      const strobes = [];
      data.freqs.forEach(f => {
        strobes.push(Strobe(f, this.sampleRate))
      })

      this.strobes = strobes;

      if (data.tapGenFreq) {
        this.tapGenFreq = Strobe(data.tapGenFreq, this.sampleRate);
      } else {
        this.tapGenFreq = null;
      }
    };

  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const ss = Array(this.strobes.length);
    const cc = Array(this.strobes.length);
    for (let j = 0; j != this.strobes.length; ++j) {
      ss[j] = 0.0;
      cc[j] = 0.0;
    }

    let rms = 0;

    for (let i = 0; i != input.length; ++i) {
      let v = input[i];

      if (this.tapGenFreq) {
        v = strobeGenSample(this.tapGenFreq);
      }

      rms += v * v;

      for (let j = 0; j != this.strobes.length; ++j) {
        const strobe = this.strobes[j];
        strobeGenSample(strobe);

        ss[j] += strobe.sin * v;
        cc[j] += strobe.cos * v;
      }
    }

    rms = Math.sqrt(rms / input.length);

    for (let j = 0; j != this.strobes.length; ++j) {
      ss[j] /= input.length;
      cc[j] /= input.length;

      let norm = Math.sqrt(ss[j] * ss[j] + cc[j] * cc[j]);
      if (norm > 0) {
        ss[j] /= norm;
        cc[j] /= norm;
      }
      if (rms > 0)
        norm /= rms;

      const angle = Math.atan2(cc[j], ss[j]);
      if (angle - this.strobes[j].angle > Math.PI) {
        this.strobes[j].angle += 2 * Math.PI;
      } else if (this.strobes[j].angle - angle > Math.PI) {
        this.strobes[j].angle -= 2 * Math.PI;
      }

      const angle_diff = angle - this.strobes[j].angle;
      if (Math.abs(angle_diff) > Math.PI)
        console.warn('internal error: angle_diff should be <= pi', angle_diff, angle, this.strobes[j].angle);

      this.strobes[j].norm = this.strobes[j].norm * this.filterNorm + norm * (1.0 - this.filterNorm);
      this.strobes[j].angle = angle;

      // TODO convert angular diff to cents
      this.strobes[j].angle_diff = this.strobes[j].angle_diff * this.filterAngle + angle_diff * (1.0 - this.filterAngle);

    }

    this.rms = this.rms * this.filterRms + rms * (1.0 - this.filterRms);

    this.updateEvery--;
    if (this.updateEvery <= 0) {
      this.updateEvery = this.updatePeriod;
      this.port.postMessage({ strobes: this.strobes, rms: this.rms });
    }

    return true;
  }
}

registerProcessor("strobe-processor", StrobeProcessor);