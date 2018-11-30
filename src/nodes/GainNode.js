export default class GainNode {
  constructor(audioCtx) {
    if (audioCtx === undefined) { return }
    this.audioCtx = audioCtx
    this.node = audioCtx.createGain(audioCtx)
  }

  connectNode(nodeTo) {
    this.node.connect((nodeTo.node || nodeTo))
    this.parentNode = nodeTo
  }

  disconnectNode() {
    if (this.parentNode) {
      this.node.disconnect((this.parentNode.node || this.parentNode))
    }
  }

  connectBuffer(buffer, loop) {
    if (this.audioCtx === undefined) { return }
    this.disconnectBuffer()

    // creating source node
    this.currentSource = this.audioCtx.createBufferSource()
    this.currentSource.buffer = buffer

    if (loop !== undefined) {
      this.currentSource.loop = loop
    } else {
      this.currentSource.loop = false
    }
    this.currentSource.connect(this.node)
  }

  disconnectBuffer() {
    if (this.currentSource) {
      this.currentSource.disconnect(this.gain)
      this.currentSource = undefined
    }
  }

  setVolume(volume, fadeDuration) {
    this.node.gain.linearRampToValueAtTime(volume, this.audioCtx.currentTime + (fadeDuration || 0))
  }

  play(atTime) {
    this.currentSource.start(
      this.audioCtx.currentTime,
      atTime
    )
  }

  pause(delay) {
    this.node.gain.cancelScheduledValues(this.audioCtx.currentTime)
    if (!this.currentSource.playbackState || this.currentSource.playbackState === 2) {
      this.currentSource.stop(this.audioCtx.currentTime + delay)
    }
  }

  stop(delay) {
    this.node.gain.cancelScheduledValues(this.audioCtx.currentTime)
    if (!this.currentSource.playbackState || this.currentSource.playbackState === 2) {
      this.currentSource.stop(this.audioCtx.currentTime + delay)
    }
  }

  remove() {
    this.disconnectBuffer()
    this.disconnectNode()
    delete this.node
  }
}
