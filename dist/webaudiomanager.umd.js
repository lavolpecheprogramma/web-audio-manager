(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.WebAudioManager = factory());
}(this, (function () { 'use strict';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var GainNode = function () {
  function GainNode(audioCtx) {
    classCallCheck(this, GainNode);

    if (audioCtx === undefined) {
      return;
    }
    this.audioCtx = audioCtx;
    this.node = audioCtx.createGain(audioCtx);
  }

  createClass(GainNode, [{
    key: "connectNode",
    value: function connectNode(nodeTo) {
      this.node.connect(nodeTo.node || nodeTo);
      this.parentNode = nodeTo;
    }
  }, {
    key: "disconnectNode",
    value: function disconnectNode() {
      if (this.parentNode) {
        this.node.disconnect(this.parentNode.node || this.parentNode);
      }
    }
  }, {
    key: "connectBuffer",
    value: function connectBuffer(buffer, loop) {
      if (this.audioCtx === undefined) {
        return;
      }
      this.disconnectBuffer();

      // creating source node
      this.currentSource = this.audioCtx.createBufferSource();
      this.currentSource.buffer = buffer;

      if (loop !== undefined) {
        this.currentSource.loop = loop;
      } else {
        this.currentSource.loop = false;
      }
      this.currentSource.connect(this.node);
    }
  }, {
    key: "disconnectBuffer",
    value: function disconnectBuffer() {
      if (this.currentSource) {
        this.currentSource.disconnect(this.gain);
        this.currentSource = undefined;
      }
    }
  }, {
    key: "setVolume",
    value: function setVolume(volume, fadeDuration) {
      this.node.gain.linearRampToValueAtTime(volume, this.audioCtx.currentTime + (fadeDuration || 0));
    }
  }, {
    key: "play",
    value: function play(atTime) {
      this.currentSource.start(this.audioCtx.currentTime, atTime);
    }
  }, {
    key: "pause",
    value: function pause(delay) {
      this.node.gain.cancelScheduledValues(this.audioCtx.currentTime);
      if (!this.currentSource.playbackState || this.currentSource.playbackState === 2) {
        this.currentSource.stop(this.audioCtx.currentTime + delay);
      }
    }
  }, {
    key: "stop",
    value: function stop(delay) {
      this.node.gain.cancelScheduledValues(this.audioCtx.currentTime);
      if (!this.currentSource.playbackState || this.currentSource.playbackState === 2) {
        this.currentSource.stop(this.audioCtx.currentTime + delay);
      }
    }
  }, {
    key: "remove",
    value: function remove() {
      this.disconnectBuffer();
      this.disconnectNode();
      delete this.node;
    }
  }]);
  return GainNode;
}();

var AudioManager = function () {
  function AudioManager(audioCtx) {
    classCallCheck(this, AudioManager);

    this.audioCtx = audioCtx;
    this.maxVolume = 1;
    this.groups = {};

    this.onTouchStart = this.onTouchStart.bind(this);

    this.setupGain();
    this.setupListeners();
  }

  createClass(AudioManager, [{
    key: 'setupGain',
    value: function setupGain() {
      this.gainNode = new GainNode(this.audioCtx);
      this.gainNode.connectNode(this.audioCtx.destination);
      this.gainNode.setVolume(this.maxVolume);
    }
  }, {
    key: 'setupListeners',
    value: function setupListeners() {
      if ('ontouchstart' in window) {
        window.addEventListener('touchstart', this.onTouchStart, false);
      }
    }
  }, {
    key: 'onChangePageVisibility',
    value: function onChangePageVisibility(pageIsVisible) {
      if (this.audioCtx === undefined) {
        return;
      }
      this.gainNode.setVolume(pageIsVisible ? this.maxVolume : 0);
    }
  }, {
    key: 'onTouchStart',
    value: function onTouchStart() {
      this.unLockWebAudio();
      window.removeEventListener('touchstart', this.onTouchStart, false);
    }
  }, {
    key: 'unLockWebAudio',
    value: function unLockWebAudio() {
      // create empty buffer
      var buffer = this.audioCtx.createBuffer(1, 1, 44100);
      var source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      source.connect(this.audioCtx.destination);
      source.start(0);
    }
  }, {
    key: 'ctx',
    get: function get$$1() {
      return this.audioCtx;
    }
  }, {
    key: 'gain',
    get: function get$$1() {
      return this.gainNode;
    }
  }]);
  return AudioManager;
}();

var AudioTrack = function () {
  function AudioTrack(audioCtx, trackData) {
    classCallCheck(this, AudioTrack);

    this.audioCtx = audioCtx;
    this.trackData = trackData;
    this.gainNode = new GainNode(audioCtx);
    this.startOffset = 0;
    this.volume = 1;
    if (trackData.preload) this.load();
  }

  createClass(AudioTrack, [{
    key: 'connectBuffer',
    value: function connectBuffer(loop) {
      this.gainNode.connectBuffer(this.buffer, loop);
    }
  }, {
    key: 'remove',
    value: function remove() {
      this.stop();
      this.gainNode.remove();
    }
  }, {
    key: 'setVolume',
    value: function setVolume(volume) {
      this.volume = volume;
      this.gainNode.setVolume(volume);
    }
  }, {
    key: 'load',
    value: function load() {
      var _this = this;

      if (this.loadPromise) {
        return this.loadPromise;
      }
      this.loadPromise = new Promise(function (success, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', _this.trackData.url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
          _this.audioCtx.decodeAudioData(request.response, function (buffer) {
            _this.buffer = buffer;
            _this.loaded = true;
            success();
          });
        };
        request.send();
      });
      return this.loadPromise;
    }
  }, {
    key: 'play',
    value: function play(loop, startVolume) {
      var _this2 = this;

      if (this.audioCtx === undefined) {
        return Promise.reject();
      }

      return new Promise(function (success, reject) {
        _this2.load().then(function () {
          _this2.connectBuffer(loop);
          if (startVolume !== undefined) _this2.gainNode.setVolume(startVolume);

          _this2.gainNode.play(_this2.startOffset % _this2.buffer.duration);
          _this2.startTime = _this2.audioCtx.currentTime;
          success();
        });
      });
    }
  }, {
    key: 'stop',
    value: function stop(delay) {
      if (this.audioCtx === undefined || !this.gainNode.currentSource) {
        return;
      }
      delay = delay || 0;

      this.isPaused = false;
      this.pausedAt = 0;
      this.startOffset = 0;
      this.gainNode.stop(delay);
    }
  }, {
    key: 'pause',
    value: function pause(delay) {
      if (this.audioCtx === undefined || !this.gainNode.currentSource) {
        return;
      }
      var delay = delay || 0;

      this.isPaused = true;
      this.startOffset += this.audioCtx.currentTime - this.startTime + delay;

      this.gainNode.pause(delay);
    }
  }, {
    key: 'fade',
    value: function fade(type, time, loop) {
      var _this3 = this;

      time = time || 0.5;
      if (type == 'out') {
        this.pause(time);
        this.gainNode.setVolume(0, time);
      } else {
        this.play(loop, 0).then(function () {
          _this3.gainNode.setVolume(_this3.volume, time);
        });
      }
    }
  }, {
    key: 'gain',
    get: function get$$1() {
      return this.gainNode;
    }
  }]);
  return AudioTrack;
}();

var AudioGroup = function () {
  function AudioGroup(audioCtx) {
    classCallCheck(this, AudioGroup);

    this.audioCtx = audioCtx;
    this.gainNode = new GainNode(audioCtx);
    this.tracks = {};
  }

  createClass(AudioGroup, [{
    key: 'addTrack',
    value: function addTrack(trackData) {
      this.tracks[trackData.id] = new AudioTrack(this.audioCtx, trackData);
      this.tracks[trackData.id].gain.connectNode(this.gainNode);
    }
  }, {
    key: 'remove',
    value: function remove() {
      for (var id in this.tracks) {
        this.removeTrack(id);
      }
    }
  }, {
    key: 'removeTrack',
    value: function removeTrack(id) {
      if (!this.tracks[id]) return;
      this.tracks[id].remove();
    }
  }, {
    key: 'getTrack',
    value: function getTrack(id) {
      return this.tracks[id];
    }
  }, {
    key: 'setTrack',
    value: function setTrack(id, fade, loop) {
      if (!this.tracks[id]) return;
      if (this.currentTrack) this.tracks[this.currentTrack].fade('out', fade);
      this.currentTrack = id;
      this.tracks[id].fade('in', fade, loop);
    }
  }, {
    key: 'gain',
    get: function get$$1() {
      return this.gainNode;
    }
  }]);
  return AudioGroup;
}();

var AnalyzerNode = function () {
	function AnalyzerNode(audioCtx) {
		classCallCheck(this, AnalyzerNode);

		if (audioCtx === undefined) {
			return;
		}
		this.audioCtx = audioCtx;
		this.node = this.audioCtx.createAnalyser();
		this.setupAnalyzer();
	}

	createClass(AnalyzerNode, [{
		key: 'connectNode',
		value: function connectNode(nodeTo) {
			this.node.connect(nodeTo.node || nodeTo);
			this.parentNode = nodeTo;
		}
	}, {
		key: 'disconnectNode',
		value: function disconnectNode() {
			if (this.parentNode) {
				this.node.disconnect(this.parentNode.node || this.parentNode);
			}
		}
	}, {
		key: 'setupAnalyzer',
		value: function setupAnalyzer() {
			this.node.smoothingTimeConstant = 0.8; //0<->1. 0 is no time smoothing
			this.node.fftSize = 1024;
			this.binCount = this.node.frequencyBinCount; // = 512
			this.freqByteData = new Uint8Array(this.binCount);
		}
	}, {
		key: 'setupBeatDetection',
		value: function setupBeatDetection(opts) {
			this.binCount = this.node.frequencyBinCount; // = 512
			this.freqByteData = new Uint8Array(this.binCount);

			this.registerBand('beat', 0, 18000);

			if (!opts) opts = {};

			this.levelHistory = []; //last 256 ave norm levels
			this.BEAT_HOLD_TIME = opts.holdTime || 60; //num of frames to hold a beat
			this.BEAT_DECAY_RATE = opts.decay || 0.98;
			this.BEAT_MIN = opts.beatMin || 0.35; //a volume less than this is no beat
			this.beatCutOff = 0;
			this.beatTime = 0;
		}
	}, {
		key: 'detectBeat',
		value: function detectBeat() {
			var level = this.getFreqBand('beat');
			this.levelHistory.push(level);
			this.levelHistory.shift(1);

			if (level > this.beatCutOff && level > this.BEAT_MIN) {
				this.beatCutOff = level * 1.1;
				this.beatTime = 0;
			} else {
				if (this.beatTime <= this.BEAT_HOLD_TIME) {
					this.beatTime++;
				} else {
					this.beatCutOff *= this.BEAT_DECAY_RATE;
					this.beatCutOff = Math.max(this.beatCutOff, this.BEAT_MIN);
				}
			}

			return this.beatTime;
		}
	}, {
		key: 'connectNode',
		value: function connectNode(nodeTo) {
			this.node.connect(nodeTo.node || nodeTo);
			this.parentNode = nodeTo;
		}
	}, {
		key: 'disconnectNode',
		value: function disconnectNode() {
			if (this.parentNode) {
				this.node.disconnect(this.parentNode.node || this.parentNode);
			}
		}
	}, {
		key: 'registerBand',
		value: function registerBand(name, start, end) {
			if (this.registeredBands == undefined) this.registeredBands = {};
			if (this.registeredBands[name] != undefined) return;

			this.registeredBands[name] = {
				start: this.frequencyToIndex(start, this.node.context.sampleRate, this.node.frequencyBinCount),
				end: this.frequencyToIndex(end, this.node.context.sampleRate, this.node.frequencyBinCount)
			};
		}
	}, {
		key: 'getFreqBand',
		value: function getFreqBand(id) {
			if (!this.registeredBands[id]) return -1;

			return this.getAverage(this.registeredBands[id].start, this.registeredBands[id].end, this.freqByteData);
		}
	}, {
		key: 'getAllFreqBand',
		value: function getAllFreqBand() {
			var frequencies = {};
			for (var band in this.registeredBands) {
				frequencies[band] = this.getAverage(this.registeredBands[band].start, this.registeredBands[band].end, this.freqByteData);
			}
			return frequencies;
		}
	}, {
		key: 'update',
		value: function update() {
			// update data audio
			this.node.getByteFrequencyData(this.freqByteData);
		}

		// Utils

	}, {
		key: 'clamp',
		value: function clamp(value, min, max) {
			return min < max ? value < min ? min : value > max ? max : value : value < max ? max : value > min ? min : value;
		}
	}, {
		key: 'frequencyToIndex',
		value: function frequencyToIndex(frequency, sampleRate, frequencyBinCount) {
			var nyquist = sampleRate / 2;
			var index = Math.round(frequency / nyquist * frequencyBinCount);
			return this.clamp(index, 0, frequencyBinCount);
		}
	}, {
		key: 'getAverage',
		value: function getAverage(start, end, frequencies) {
			var count = end - start;
			var sum = 0;
			for (; start < end; start++) {
				sum += frequencies[start] / 255;
			}
			return count === 0 ? 0 : sum / count;
		}
	}]);
	return AnalyzerNode;
}();

function getWebAudioCtx() {
  if (window.AudioContext || window.webkitAudioContext) {
    return new (window.AudioContext || window.webkitAudioContext)();
  }
  throw new Error('WebAudio Api Unsupported');
}

var props = {
  GainNode: GainNode,
  AudioTrack: AudioTrack,
  AudioGroup: AudioGroup,
  AnalyzerNode: AnalyzerNode
};

var ctx = void 0;

function onClickWindow(e) {
  window.removeEventListener('click', onClickWindow);
  ctx.resume().then(function () {
    console.log('Playback resumed successfully');
  });
}

var WebAudioManager = function WebAudioManager() {
  ctx = getWebAudioCtx();
  var WAM = new AudioManager(ctx);
  window.addEventListener('click', onClickWindow);
  // Bind every prop to the audio context.

  var _loop = function _loop(k) {
    WAM[k] = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var curriedArgs = [ctx].concat(args);
      return new (Function.prototype.bind.apply(props[k], [null].concat(toConsumableArray(curriedArgs))))();
    };
  };

  for (var k in props) {
    _loop(k);
  }

  return WAM;
};

return WebAudioManager;

})));
