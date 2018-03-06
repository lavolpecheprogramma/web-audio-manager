export default class AnalyzerNode {
	constructor(audioCtx) {
		if (audioCtx === undefined) { return; }
		this.audioCtx = audioCtx;
		this.node = this.audioCtx.createAnalyser();
		this.setupAnalyzer();
	}
	
	connectNode(nodeTo){
	   this.node.connect((nodeTo.node || nodeTo));
	   this.parentNode = nodeTo;
	}

	disconnectNode(){
	   if(this.parentNode){
		   this.node.disconnect((this.parentNode.node || this.parentNode));
	   }
	}

	setupAnalyzer(){
		this.node.smoothingTimeConstant = 0.8; //0<->1. 0 is no time smoothing
		this.node.fftSize = 1024;
		this.binCount = this.node.frequencyBinCount; // = 512
		this.freqByteData = new Uint8Array(this.binCount);
	}

	setupBeatDetection(opts){
		this.binCount = this.node.frequencyBinCount; // = 512
		this.freqByteData = new Uint8Array(this.binCount);
		
		this.registerBand('beat',0, 18000);

		if(!opts) opts = {};

		this.levelHistory = []; //last 256 ave norm levels
		this.BEAT_HOLD_TIME = opts.holdTime || 60; //num of frames to hold a beat
		this.BEAT_DECAY_RATE = opts.decay || 0.98;
		this.BEAT_MIN = opts.beatMin || 0.35; //a volume less than this is no beat
		this.beatCutOff = 0;
		this.beatTime = 0;
	}

	detectBeat(){
		var level = this.getFreqBand('beat');
		this.levelHistory.push(level);
		this.levelHistory.shift(1);

		if (level  > this.beatCutOff && level > this.BEAT_MIN){
			this.beatCutOff = level *1.1;
			this.beatTime = 0;
		}else{
			if (this.beatTime <= this.BEAT_HOLD_TIME){
				this.beatTime ++;
			}else{
				this.beatCutOff *= this.BEAT_DECAY_RATE;
				this.beatCutOff = Math.max(this.beatCutOff,this.BEAT_MIN);
			}
		}

		return this.beatTime;
	}
	
	connectNode(nodeTo){
		this.node.connect((nodeTo.node || nodeTo));
		this.parentNode = nodeTo;
	}

	disconnectNode(){
		if(this.parentNode){
			this.node.disconnect((this.parentNode.node || this.parentNode));
		}
	}

	registerBand(name, start, end){
		if(this.registeredBands == undefined) this.registeredBands = {};
		if(this.registeredBands[name] != undefined) return;

		this.registeredBands[name] = { 
			start: this.frequencyToIndex( 
				start, 
				this.node.context.sampleRate, 
				this.node.frequencyBinCount 
			),
			end: this.frequencyToIndex( 
				end, 
				this.node.context.sampleRate, 
				this.node.frequencyBinCount 
			)
		};
	}

	getFreqBand(id){
		if(!this.registeredBands[id]) return -1;

		return this.getAverage(
			this.registeredBands[id].start,
			this.registeredBands[id].end,
			this.freqByteData
		);
	}
	getAllFreqBand(){
		var frequencies = {};
		for(var band in this.registeredBands){
			frequencies[band] = this.getAverage(this.registeredBands[band].start, this.registeredBands[band].end, this.freqByteData );
		}
		return frequencies;
	}

	update(){
		// update data audio
		this.node.getByteFrequencyData(this.freqByteData);
	}

	// Utils
	clamp(value, min, max) {
	  return min < max
		? (value < min ? min : value > max ? max : value)
		: (value < max ? max : value > min ? min : value)
	}

	frequencyToIndex(frequency, sampleRate, frequencyBinCount) {
	  var nyquist = sampleRate / 2
	  var index = Math.round(frequency / nyquist * frequencyBinCount)
	  return this.clamp(index, 0, frequencyBinCount)
	}

	getAverage(start, end, frequencies){
		var count = end - start;
		var sum = 0
		for (; start < end; start++) {
			sum += frequencies[start] / 255
		}
		return count === 0 ? 0 : (sum / count)
	}
}
