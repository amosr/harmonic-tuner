function Osc(phase) {
  return { sin: Math.sin(phase), cos: Math.cos(phase) };
}

function oscGenSample(osc, f) {
  osc.sin = osc.sin + f * osc.cos;
  osc.cos = osc.cos - f * osc.sin;
  return osc.sin;
}

function Strobe(freq, sampleRate, numGens) {
  const f = 2 * Math.PI * (freq / sampleRate);
  const gens = [];
  const angles = [];
  for (let i = 0; i != numGens; ++i) {
    gens.push(Osc((2 * Math.PI / numGens) * i));
    angles.push(0.0);
  }

  return { freq: freq, f: f, gens: gens, angles: angles, norm: 0.0, angle_diff: 0.0, angle_diff_variance: 0.0, angle_diff_filtered: 0.0 };
}
function strobeGenSample(strobe, gen) {
  return oscGenSample(gen, strobe.f);
}

function CircularBuf(length) {
  const data = new Array(length);
  for (let i = 0; i != length; ++i) {
    data[i] = 0.0;
  }
  const index = 0;
  return { data, index }
}

function circularBufPush(buf, value) {
  buf.data[buf.index] = value;
  buf.index = (buf.index + 1) % buf.data.length;
}

function arrayMean(data) {
  let sum = 0.0;
  for (let i = 0; i != data.length; ++i) {
    sum += data[i];
  }
  return sum / data.length;
}

function arrayStddev(data) {
  // xxx variance?
  const mean = arrayMean(data);
  let dev = 0.0;
  for (let i = 0; i != data.length; ++i) {
    const v = data[i] - mean;
    dev += Math.abs(v);
    // dev += v * v;
  }
  return dev / data.length;
  // return Math.sqrt(dev / data.length);
}

class StrobeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    this.sampleRate = options.processorOptions.sampleRate;
    this.updatePeriod = options.processorOptions.updatePeriod;
    this.filterNorm = options.processorOptions.filterNorm;
    this.filterRms = options.processorOptions.filterRms;
    this.filterAngle = options.processorOptions.filterAngle;

    this.bufferLength = options.processorOptions.bufferLength;
    this.phaseCount = options.processorOptions.phaseCount ?? 1;

    this.updateEvery = 0;
    this.rms = 0.0;
    this.strobes = [];

    this.buffers = [];
    this.ss = [];
    this.cc = [];
    this.rms = 0.0;

    this.port.onmessage = (e) => {
      const data = e.data;
      const strobes = [];
      const buffers = [];
      data.freqs.forEach(f => {
        strobes.push(Strobe(f, this.sampleRate, this.phaseCount))
        buffers.push(CircularBuf(data.bufferLength));
      })
      if (buffers[0])
        console.log('circular buf', buffers[0].data.length);
      this.filterAngle = data.filterAngle ?? this.filterAngle;
      this.updatePeriod = data.updatePeriod ?? this.updatePeriod;

      this.strobes = strobes;
      this.buffers = buffers;

      if (data.tapGenFreq) {
        this.tapGenFreq = Strobe(data.tapGenFreq, this.sampleRate, 1);
      } else {
        this.tapGenFreq = null;
      }

      this.ss = Array(this.strobes.length * this.phaseCount);
      this.cc = Array(this.strobes.length * this.phaseCount);
      this.rms = 0.0;
    };

  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const ss = this.ss;
    const cc = this.cc;
    for (let j = 0; j != ss.length; ++j) {
      ss[j] = 0.0;
      cc[j] = 0.0;
    }

    for (let i = 0; i != input.length; ++i) {
      let v = input[i];

      if (this.tapGenFreq) {
        v = strobeGenSample(this.tapGenFreq, this.tapGenFreq.gens[0]);
      }

      this.rms += v * v;

      for (let j = 0; j != this.strobes.length; ++j) {
        const strobe = this.strobes[j];
        for (let k = 0; k != this.phaseCount; ++k) {
          const gen = strobe.gens[k];
          strobeGenSample(strobe, gen);

          ss[j * this.phaseCount + k] += gen.sin * v;
          cc[j * this.phaseCount + k] += gen.cos * v;
        }
      }
    }

    rms = Math.sqrt(rms / input.length);

    for (let j = 0; j != this.strobes.length; ++j) {
      let norms = 0.0;
      let angle_diffs = 0.0;

      for (let k = 0; k != this.phaseCount; ++k) {
        const ix = j * this.phaseCount + k;
        ss[ix] /= input.length;
        cc[ix] /= input.length;

        let norm = Math.sqrt(ss[ix] * ss[ix] + cc[ix] * cc[ix]);
        if (norm > 0) {
          ss[ix] /= norm;
          cc[ix] /= norm;
        }
        if (rms > 0)
          norm /= rms;

        const angle = Math.atan2(ss[ix], cc[ix]);

        if (angle - this.strobes[j].angles[k] > Math.PI) {
          this.strobes[j].angles[k] += 2 * Math.PI;
        } else if (this.strobes[j].angles[k] - angle > Math.PI) {
          this.strobes[j].angles[k] -= 2 * Math.PI;
        }

        const angle_diff = this.strobes[j].angles[k] - angle;
        if (Math.abs(angle_diff) > Math.PI)
          console.warn('internal error: angle_diff should be <= pi', angle_diff, angle, this.strobes[j].angles[k]);

        this.strobes[j].angles[k] = angle;
        norms += norm;
        angle_diffs += angle_diff;
      }


      const norm = norms / this.phaseCount;
      const angle_diff = angle_diffs / this.phaseCount;

      this.strobes[j].norm = this.strobes[j].norm * this.filterNorm + norm * (1.0 - this.filterNorm);

      circularBufPush(this.buffers[j], angle_diff);

      const angle_diff_mean = arrayMean(this.buffers[j].data);
      this.strobes[j].angle_diff_variance = arrayStddev(this.buffers[j].data);

      this.strobes[j].angle_diff = angle_diff_mean;
      this.strobes[j].angle_diff_filtered = this.strobes[j].angle_diff_filtered * this.filterAngle + angle_diff_mean * (1.0 - this.filterAngle);

    }

    // TODO nan
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