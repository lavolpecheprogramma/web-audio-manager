import GainNode from './nodes/GainNode';
import AnalyzerNode from './nodes/AnalyzerNode';

import AudioTrack from './AudioTrack';
import AudioGroup from './AudioGroup';

export default class AudioManager {
	constructor(audioCtx) {
		this.audioCtx = audioCtx;
		this.maxVolume = 0.5;
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
