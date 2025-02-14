class CentreClipProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    this.limit = options.processorOptions.limit ?? 0.1;

    this.port.onmessage = (e) => {
      const data = e.data;
      this.limit = data.limit ?? this.limit;
    };

  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    for (let i = 0; i != input.length; ++i) {
      let v = input[i];

      let o = 0.0;
      if (v > this.limit) {
        o = v - this.limit;
      } else if (v < -this.limit) {
        o = v + this.limit;
      }
      output[i] = o;
    }


    return true;
  }
}

registerProcessor("centre-clip-processor", CentreClipProcessor);