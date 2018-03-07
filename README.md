# WAM - Web Audio Manager
WAM is a small, flexible and dependency free library that helps you manage sounds on your website trough [Web Audio Api](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)!

## Live Demo

https://lavolpecheprogramma.github.io/web-audio-manager

## Basic config
To play a single track in loop on your site:

``` javascript
//create webaudio context
const wam = new WebAudioManager();

// create an AudioTrack and start to load
const track = new WebAudioManager.AudioTrack({
	url: './test.mp3',
	preload: true
});

// connect the track to speakers
track.gain.connectNode(wam.gain);

// play the track in loop
track.play(true);

...

// you can pause the track
track.pause()
// or fadeout in a given time
track.fade('out', 1);
```


## Advanced usage

### AudioGroup
To switch between tracks you can create an `AudioGroup`, which provides a fade transition between tracks. 

``` javascript
group.setTrack(id, fadeDuration, loop);
```

It is useful if you have a set of background tracks that have to play once at time and another set of sounds (like FX) that you want to play indipendently.

``` javascript
// create a manager, which will bind to a new [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
const wam = new WebAudioManager();

// create an AudioGroup
const backgroundGroup = new WebAudioManager.AudioGroup();

// add tracks to it
backgroundGroup({id: 'firstSample', url: './background1.mp3', preload: true});
backgroundGroup({id: 'secondSample', url: './background2.mp3', preload: true});

//connect group to speakers
group.gain.connectNode(wam.gain);

// play first track by id
group.setTrack('firstSample', 2);

// for example we have a button to change the track
button.addEventListener('click', function(){
	// play the second track with a fade transition of 2 seconds
	group.setTrack('secondSample', 2); 
});
```
### Analyzer
Often you want some action to happen in reaction to audio, you can use `AnalyzerNode`, which provides you with utilities for doing so.

#### Beat Detection
Here is code for basic beat detection:


First you initialize an `AnalyzerNode`, connect it to a `GainNode` and call `setupBeatDetection`

``` javascript	
const analyzer = new WebAudioManager.AnalyzerNode()

analyzer.connectNode(wam.gain);

const analyzerSettings = {
    holdTime: 30, //num of frames to hold a beat
    decay: 0.98,
    beatMin: 0.5 //a volume less than this is no beat
};

analyzer.setupBeatDetection(analyzerSettings)
```	
	
In this example you can see a basic configuration, but you can play around with the settings to obtain detection of different patterns.

Then you can do

``` javascript	
	analyzer.update()
	const framesSinceLastBeat = analyzer.detectBeat()
```	
This will provide you the number of frames since the last beat peak was detected.
This way you can set frames on your animations, or simply check when the beat starts and fire them.

**You have to call `analyzer.update()`** before `analyzer.detectBeat()` if you need the most recent info about the audio being analyzed.

Using the above configuration we can now do:
``` javascript	
//create an AudioTrack and start to load
const track = new WebAudioManager.AudioTrack({
	url: './test.mp3',
	preload: true
}, wam.ctx());

// connect the track to analyzer
track.gain.connectNode(analyzer);

// example function of beat detection
function analyzeAudio(){
	// every frame call this function
    window.requestAnimationFrame(analyzeAudio);

    // update track data 
    analyzer.update();

    // return the number of frame from last detection
    var isBeatDetected = analyzer.detectBeat();

    //if is the first frame after detection
    if(isBeatDetected < 1){
	console.log('[WAM] Beat detected!');
    }
}

// start to analyze audio that come to the analyzer
analyzeAudio();
```

#### Analyze specific frequency band

If you want to customize further the analyzer and **watch for specific frequencies**, you can do so by using
	
	analyzer.registerFreqBand(id, startFreq, endFreq)
	
Calling `getFreqBand(id)` will provide you with a value between 0 and 1 which is the volume of those frequency bands.

Calling `getAllFreqBand()` instead will provide you with an object where each key is the band id you choose when setting it up, and the value is the frequency band volume, always between 0 and 1.

``` javascript
// setup analyzer
analyzer.registerBand('kick', 50, 70);
analyzer.registerBand('highFreq', 1500, 2200);

// example function of beat detection
function analyzeAudio(){
	...

	// update track data 
	analyzer.update();

	const kickLevel = analyzer.getFreqBand('kick');

	// scale an element according to kick level
	div.style.transform = 'scale('+ kickLevel +')';
}
```

## WebAudioManager

### Constructor
Return the instance of WebAudioManager.
Accept one parameter that is the maxVolume of the master gain so you can easily control the volume of all your sounds.

``` javascript
const wam = new WebAudioManager();
```
or

``` javascript
const wam = new WebAudioManager(0.8);
```


### wam.ctx
Return the AudioCtx.

It is important because **you have to pass it during creation of other nodes.**

``` javascript
// create an analyzer
const analyzer = new WebAudioManager.AnalyzerNode(wam.ctx);
```
or

``` javascript
//create an AudioTrack and start to load
const track = new WebAudioManager.AudioTrack({
    url: './test.mp3',
    preload: true
});
```

### wam.gain
Return the gainNode instance attached to webaudio manager, **it is automatically attached to speakers**.
It is useful to attach other nodes to speakers or if you want to change the volume of all you sounds;

``` javascript
analyzer.connectNode(wam.gain);
```
or

``` javascript
wam.gain.setVolume(1);
```


### onChangePageVisibility(pageIsVisible)
This method allow you to automatically toggle volume on page visibility

``` javascript
var hidden, visibilityChange; 
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}

function handleVisibilityChange() {
	wam.onChangePageVisibility(!document[hidden]);
	
	//.... other things to do on page visibility changes
}

// Warn if the browser doesn't support addEventListener or the Page Visibility API
if (typeof document.addEventListener === "undefined" || typeof document.hidden === "undefined") {
  console.log("Your browser doesn't support Page Visibility API.");
} else {
  // Handle page visibility change   
  document.addEventListener(visibilityChange, handleVisibilityChange, false);
}


```

## AudioTrack

### Constructor
Return the instance of AudioTrack.
Accept two parameters:

- An object that define the information of track: 

``` javascript
const dataTrack = {
	id: 'sample', // required only when a track is added to an AudioGroup
	url: './test.mp3', // path to audio file
	preload: true	 // (optional) load on creation of AudioTrack
};
```
- The webaudio context

So to create a new AudioTrack you can do something like this:

``` javascript
//create an AudioTrack and start to load
const track = new WebAudioManager.AudioTrack({
    url: './test.mp3',
    preload: true
});
```

### track.gain
Return the gainNode instance attached to the instance.
It is useful to attach the track to a node or to change the volume.

``` javascript
analyzer.connectNode(track.gain);
```
or

``` javascript
track.gain.setVolume(1);
```

### track.load()
Start to load the audio file.
Return a promise.

``` javascript
track.load()
```

### play(loop, startVolume)
Play the audio file when loaded is completed.
The startVolume is useful if you want to play the sound, and then do a fade in of audio.
Return a promise.

``` javascript
// play the track not in loop
track.play()
```
or

``` javascript
// play the track in loop
track.play(true)
```
or

``` javascript
// play the track in loop, and with a start volume of 0;
track.play(true, 0)
```

### stop(delay)
Stop the audio file.
You can pass a delay to stop the track after n seconds (default is 0)
Return a promise.

``` javascript
track.stop()
```

or

``` javascript
//stop track after 1 second
track.stop(1)
```

### pause(delay)
Pause the audio file, you can use it if you want to play again the track from the last state.
You can pass a delay to pause the track after n seconds (default is 0).
Return a promise.

``` javascript
track.pause()
```

or

``` javascript
//pause track after 1 second
track.pause(1)
```

### fade(type, time, loop)
It allow you to create an audio fade (in/out) with a specified time (default is 0.5s).
If you make a fadeIn you can control if the track that fade in have to play in loop or not.

``` javascript
track.fade("in")
```

or

``` javascript
// fade out of 1 second
track.fade("out", 1)
```

or

``` javascript
track.fade("in", 0.5, true)
```

### remove()
This function stop the track if it's playing, disconnect and remove the gain attached to the track.

``` javascript
track.remove();
```

## AudioGroup

### Constructor
Return the instance of AudioTrack.
Audio context required.


``` javascript
//create an AudioGroup
const group = new WebAudioManager.AudioGroup(wam.ctx);
```

### group.gain
Return the gainNode instance attached to the instance.
It is useful to attach the group to a node or to change the volume.

``` javascript
analyzer.connectNode(group.gain);
```
or

``` javascript
group.gain.setVolume(1);
```

### group.addTrack(trackData)
Add an instance of track by id and connect the track gain to the AudioGroup gain.

``` javascript
group.addTrack({id: 'sample', url: './test.mp3', preload: true})
```

### group.getTrack(id)
Return an instance of track by id.

``` javascript
group.getTrack('sample')
```

### group.removeTrack(id)
Remove single instance of track by id.

``` javascript
group.removeTrack('sample');
```


### group.setCurrentTrack(id, fade, loop)
Set the new track to play by id.
Optionally you can set the fade in of the track and if it have to play in loop or not.
If another track in this group is playing, it will fade out automatically with the same duration fade you have passed like param.

``` javascript
// play the track without transition
group.setCurrentTrack('sample'); 
```
or

``` javascript
// play the track with a fade transition of 2 seconds
group.setCurrentTrack('sample', 2); 
```
or

``` javascript
// play the track in loop with a fade transition of 2 seconds
group.setCurrentTrack('sample', 2, true); 
```


### group.remove()
Remove all instance of tracks instanciated in this group.

``` javascript
group.remove();
```

## GainNode

### Constructor
Return the instance of GainNode.

``` javascript
gainNode = new GainNode();
```


### gainNode.connectNode(nodeTo)

``` javascript
gainNode.connectNode(wam.gain)
```

### gainNode.disconnectNode()

``` javascript
gainNode.disconnectNode()
```

### gainNode.connectBuffer(buffer, loop)

``` javascript
gainNode.connectBuffer(buffer, loop)
```


### gainNode.disconnectBuffer()

``` javascript
gainNode.disconnectNode()
```


### gainNode.setVolume(volume, fadeDuration)

``` javascript
gainNode.setVolume(1, 1)
```

### gainNode.play(atTime){

``` javascript
gainNode.play(6472234)
```

### gainNode.pause(delay){

``` javascript
gainNode.pause(1)
```

### gainNode.stop(delay){

``` javascript
gainNode.stop(1)
```

### gainNode.remove(){

``` javascript
gainNode.remove()
```


## AnalyzerNode

### Constructor
``` javascript
const analyzer = new WebAudioManager.AnalyzerNode();
```	

### connectNode(nodeTo)
``` javascript
analyzer.connectNode(wam.gain);
```
### disconnectNode()
``` javascript
analyzer.disconnectNode()
```

### setupBeatDetection(opts)
``` javascript
analyzer.setupBeatDetection({
	holdTime: 30, //num of frames to hold a beat
    decay: 0.98,
    beatMin: 0.5 //a volume less than this is no beat
})
```
### detectBeat()
``` javascript
analyzer.detectBeat()
```

### registerBand(name, start, end)
``` javascript
analyzer.registerBand('kick', 50, 70);
```
### getFreqBand(id)
``` javascript
const currentKickLevel = analyzer.getFreqBand('kick')
```
### getAllFreqBand()
``` javascript
const allRegistererBandLevel = analyzer.getAllFreqBand();
```

### update()
``` javascript
analyzer.update()
```



## License

[MIT](LICENSE).
