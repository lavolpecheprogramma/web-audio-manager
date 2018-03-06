import AudioManager from './AudioManager';

import AudioTrack from './AudioTrack';
import AudioGroup from './AudioGroup';

import AnalyzerNode from './nodes/AnalyzerNode';
import GainNode from './nodes/GainNode';

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

const WebAudioManager = function() {

	const ctx = getWebAudioCtx();
	const WAM = new AudioManager(ctx);

	// Bind every prop to the audio context.
	for (let k in props) {
		WAM[k] = function(...args) {
			const curriedArgs = [ctx].concat(args);
			return new props[k](...curriedArgs);
		}
	}

	return WAM;
};

export default WebAudioManager;
