import GainNode from './nodes/GainNode';
import AudioTrack from './AudioTrack';

export default class AudioGroup {
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
