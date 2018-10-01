class GainNode {
    constructor(audioCtx) {
        if (audioCtx === undefined) { return; }
        this.audioCtx = audioCtx;
        this.node = audioCtx.createGain(audioCtx);
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

    connectBuffer(buffer, loop){
        if(this.audioCtx === undefined){ return; }
        this.disconnectBuffer();

        //creating source node
        this.currentSource = this.audioCtx.createBufferSource();
        this.currentSource.buffer = buffer;

        if(loop !== undefined){
            this.currentSource.loop = loop;
        }else{
            this.currentSource.loop = false;
        }
        this.currentSource.connect(this.node);
    }

    disconnectBuffer(){
        if(this.currentSource){
            this.currentSource.disconnect(this.gain);
            this.currentSource = undefined;
        }
    }

    setVolume(volume, fadeDuration){
        this.node.gain.linearRampToValueAtTime(volume, this.audioCtx.currentTime + (fadeDuration || 0));
    }

    play(atTime){
        this.currentSource.start(
            this.audioCtx.currentTime,
            atTime
        );
    }

    pause(delay){
        this.node.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.currentSource.stop(this.audioCtx.currentTime + delay);
    }

    stop(delay){
        this.node.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.currentSource.stop(this.audioCtx.currentTime + delay);
    }

    remove(){
        this.disconnectBuffer();
        this.disconnectNode();
        delete this.node;
    }
}

class AnalyzerNode {
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
	  var nyquist = sampleRate / 2;
	  var index = Math.round(frequency / nyquist * frequencyBinCount);
	  return this.clamp(index, 0, frequencyBinCount)
	}

	getAverage(start, end, frequencies){
		var count = end - start;
		var sum = 0;
		for (; start < end; start++) {
			sum += frequencies[start] / 255;
		}
		return count === 0 ? 0 : (sum / count)
	}
}

class AudioTrack {
    constructor(audioCtx, trackData) {
        this.audioCtx = audioCtx;
        this.trackData = trackData;
        this.gainNode = new GainNode(audioCtx);
        this.startOffset = 0;
        this.volume = 1;
        if(trackData.preload) this.load();
    }

    connectBuffer(loop){
        this.gainNode.connectBuffer(this.buffer, loop);
    }

    get gain() {
        return this.gainNode;
    }

    remove(){
        this.stop();
        this.gainNode.remove();
    }

    setVolume(volume){
        this.volume = volume;
        this.gainNode.setVolume(volume);
    }

    load(){
        if(this.loadPromise) { return this.loadPromise; }
        this.loadPromise = new Promise((success, reject) =>{
            var request = new XMLHttpRequest();
            request.open("GET", this.trackData.url,true);
            request.responseType= 'arraybuffer';
            request.onload = () => {
                this.audioCtx.decodeAudioData(request.response, (buffer) =>{
                    this.buffer = buffer;
                    this.loaded = true;
                    success();
                });
            };
            request.send();
        });
        return this.loadPromise;
    }

    play(loop, startVolume){
        if(this.audioCtx === undefined){ return Promise.reject(); }

        return new Promise((success, reject) =>{
            this.load()
            .then(() => {
                this.connectBuffer(loop);
                if(startVolume !== undefined) this.gainNode.setVolume(startVolume);

                this.gainNode.play(this.startOffset%this.buffer.duration);
                this.startTime = this.audioCtx.currentTime;
                success();
            });
        });
    }

    stop(delay){
        if(this.audioCtx === undefined || !this.gainNode.currentSource){ return; }
        delay = delay || 0;

        this.isPaused = false;
        this.pausedAt = 0;
        this.startOffset = 0;
        this.gainNode.stop(delay);
    }

    pause(delay){
        if(this.audioCtx === undefined || !this.gainNode.currentSource){ return; }
        var delay = delay || 0;

        this.isPaused = true;
        this.startOffset += this.audioCtx.currentTime - this.startTime + delay;

        this.gainNode.pause(delay);
    }

    fade(type, time, loop){
        time = time || 0.5;
        if(type == 'out'){
            this.pause(time);
            this.gainNode.setVolume(0, time);
        }else{
            this.play(loop, 0)
            .then(() => {
                this.gainNode.setVolume(this.volume, time);
            });
        }
    }
}

class AudioGroup {
	constructor(audioCtx) {
		this.audioCtx = audioCtx;
		this.gainNode = new GainNode(audioCtx);
		this.tracks = {};
	}

	addTrack(trackData) {
		this.tracks[trackData.id] = new AudioTrack(trackData, this.audioCtx);
		this.tracks[trackData.id].gain.connectNode(this.gainNode);
	}

	remove(){
		for (let id in this.tracks){
			this.removeTrack(id);
		}
	}

	get gain() {
		return this.gainNode;
	}

	removeTrack(id) {
		if(!this.tracks[id]) return;
		this.tracks[id].remove();
	}

	getTrack(id) {
		return tracks[id];
	}

	setTrack(id, fade, loop){
		if(!this.tracks[id]) return;
		if(this.currentTrack) this.tracks[this.currentTrack].fade('out', fade);
		this.currentTrack = id;
		this.tracks[id].fade('in', fade, loop);
	}
}

class AudioManager {
	constructor(audioCtx) {
		this.audioCtx = audioCtx;
		this.maxVolume = 1;
		this.groups = {};

		this.onTouchStart = this.onTouchStart.bind(this);

		this.setupGain();
		this.setupListeners();
	}

	setupGain(){
		this.gainNode = new GainNode(this.audioCtx);
		this.gainNode.connectNode(this.audioCtx.destination);
		this.gainNode.setVolume(this.maxVolume);
	}

	get ctx(){
	  return this.audioCtx;
	}


	get gain() {
	  return this.gainNode;
	}

	addGroup(group) {}

	getGroup(groupId) {}

	getTrack(groupId, trackId) {}

	setupListeners(){
		if('ontouchstart' in window){
			window.addEventListener('touchstart', this.onTouchStart, false);
		}
	}

	onChangePageVisibility(pageIsVisible){
		if(this.audioCtx === undefined){ return; }
		this.gainNode.setVolume(pageIsVisible ? this.maxVolume : 0);
	}

	onTouchStart() {
		this.unLockWebAudio();
		window.removeEventListener('touchstart', this.onTouchStart, false);
	}

	unLockWebAudio(){
		// create empty buffer
		var buffer = this.audioCtx.createBuffer(1, 1, 44100);
		var source = this.audioCtx.createBufferSource();
		source.buffer = buffer;

		source.connect(this.audioCtx.destination);
		source.start(0);
	}
}

// const AudioManager = require('mylibrary');

// const myManager = new AudioManager(ctx);
// const gainNode = new AudioManager.GainNode(ctx);

// const track = new AudioManager.AudioTrack({/*data*/});
// const group = new AudioManager.AudioGroup({/*data*/});

// group.add(track);

// myManager.addGroup(group);

function getWebAudioCtx() {
	if(window.AudioContext || window.webkitAudioContext){
		return new (window.AudioContext || window.webkitAudioContext)();
	} else {
		throw new Error('WebAudio Api Unsupported')
	}
}

const props = {
	GainNode,
	AudioTrack,
	AudioGroup,
	AnalyzerNode
};

let ctx;

function onClickWindow (e){
	window.removeEventListener('click', onClickWindow);
	ctx.resume().then(() => {
		console.log('Playback resumed successfully');
	});
}

const WebAudioManager = function() {

	ctx = getWebAudioCtx();
	const WAM = new AudioManager(ctx);
	window.addEventListener('click', onClickWindow);
	// Bind every prop to the audio context.
	for (let k in props) {
		WAM[k] = function(...args) {
			const curriedArgs = [ctx].concat(args);
			return new props[k](...curriedArgs);
		};
	}

	return WAM;
};

export default WebAudioManager;
