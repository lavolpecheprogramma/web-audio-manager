import GainNode from './nodes/GainNode';

export default class AudioTrack {
    constructor(audioCtx, trackData) {
        this.audioCtx = audioCtx;
        this.trackData = trackData;
        this.gainNode = new GainNode(audioCtx);
        this.startOffset = 0;

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
        })
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
                this.gainNode.setVolume(1, time);
            });
        }
    }
}
