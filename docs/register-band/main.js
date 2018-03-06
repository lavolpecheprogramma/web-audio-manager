//create webaudio context
const wam = new WebAudioManager();

// create an analyzer
const analyzer = new wam.AnalyzerNode();

// connect the analyzer to speakers
analyzer.connectNode(wam.gain);

// setup analyzer
analyzer.registerBand('kick', 50, 70);

//create an AudioTrack and start to load
const track = new wam.AudioTrack({
    url: '/audio/2.mp3',
    preload: true
});

// connect the track to analyzer
track.gain.connectNode(analyzer);

track.play(true);


const div = document.querySelector('.kick');

// example function of beat detection
function analyzeAudio(){
    // every frame call this function
    window.requestAnimationFrame(analyzeAudio);

    // update track data
    analyzer.update();

    // console.log('kick', analyzer.getFreqBand('kick'));
    // console.log('highFreq', analyzer.getFreqBand('highFreq'));

    div.style.transform = 'scale('+ analyzer.getFreqBand('kick') +')'
}
// start to analyze audio that come to the analyzer
analyzeAudio();



// const wam = new WebAudioManager.default();
// const analyzer = new WebAudioManager.AnalyzerNode(wam.ctx)
// const group = new WebAudioManager.AudioGroup(wam.ctx);
// group.addTrack({id: 'test', url: './test.mp3', preload: true});
// group.addTrack({id: 'loop', url: './loop.mp3', preload: true});
// analyzer.connectNode(wam.gain);
// analyzer.setupBeatDetection({
//     holdTime: 30, //num of frames to hold a beat
//     decay: 0.98,
//     beatMin: 0.5 //a volume less than this is no beat
// });

// group.gain.connectNode(analyzer);
// group.setTrack('test', 2);

// function analyzeAudio(){
//     window.requestAnimationFrame(analyzeAudio);
//     analyzer.update();

//     // return the number of frame from last detection
//     var isBeatDetected = analyzer.detectBeat();
//     if(isBeatDetected < 1){
//         console.log('BEAT');
//     }
// }

// analyzeAudio();

// const wam = new WebAudioManager.default();
// const group = new WebAudioManager.AudioGroup(wam.ctx);
// group.addTrack({id: 'test', url: './test.mp3', preload: true});
// group.addTrack({id: 'loop', url: './loop.mp3', preload: true});
// group.gain.connectNode(wam.gain);
// group.setTrack('test', 2);
// setTimeout(function(){
//     console.log('start transition');
//     group.setTrack('loop', 5, true);

// },3000)


// track.fade('out', 2);
// setTimeout(function(){
//     console.log('remove');
//     track.fade('in', 2);
// },4000)

// const track = new WebAudioManager.AudioTrack({url: './test.mp3', preload: true}, wam.getCtx());
// track.getGain().connectNode(wam.getGain());
// track.play(true);
// setTimeout(function(){
//  console.log('start transition');
//  track.fade('out', 2);
   //  setTimeout(function(){
//      console.log('remove');
      //   track.fade('in', 2);
   //  },4000)
// },3000)
