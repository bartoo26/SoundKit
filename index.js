window.onload = loadData;
//global variables
var audio;
var pads;
var playButtons;
var recButtons;
var recorders = [];
const shortcuts = {
    pads: ["q", "w", "e", "a", "s", "d", "z", "x", "c"],
    tracks: ["1", "2", "3", "4"]
}
const samples = ["./Samples/clap-808.wav", "./Samples/hihat-808.wav", "./Samples/cowbell-808.wav", "./Samples/kick-808.wav", "./Samples/kick-electro01.wav", "./Samples/openhat-808.wav", "./Samples/snare-big.wav", "./Samples/tom-808.wav", "./Samples/snare-punch.wav"]

function loadData() {
    //store pads divs as array of DOM elements
    let padsCollection = document.getElementsByClassName('pad');
    pads = Array.from(padsCollection);

    audio = [];
    //pushing samples as audio object and files
    samples.forEach((s, i) => {
        let request = new XMLHttpRequest();
        request.open('GET', s, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {
            audio.push({
                audio: new Audio(s),
                file: request.response
            })
            if (i === samples.length - 1) {
                padsSamples();
            }
        }
        request.send();
    })

    //store record buttons as array of DOM elements
    let recButtonsColl = document.getElementsByClassName("notRec");
    recButtons = Array.from(recButtonsColl);

    //initializing recoders
    recButtons.forEach(el => {
        //pushing objects into global variable storing track id and media recorder object
        recorders.push({
            track: el.id,
            audio: null,
            audioCxt: null,
            audioBuffers: [],
            recording: false,
            start: startRecording,
            stop: stopRecording,
            getSounds: getSounds,
            play: playRecording
        });
    })

    playButtons = document.getElementsByClassName("playButton");
    playButtons = Array.from(playButtons);
    playButtons.forEach((btn, i) => {
        btn.onclick = () => {
            if (!btn.className.includes("paused")) {
                recorders[i].play();
                btn.className = btn.className + " paused"
            } else {
                btn.className = "playButton";
                recorders[i].play();
            }
        }
    })
}

function instructions() {
    //showing shortcuts for pads
    pads.forEach((pad, i) => {
        pad.innerHTML = `<div class="shortcut"><h3> ${shortcuts.pads[i]} </h3></div>`
    })
}

function padsSamples() {
    //show keyboard shortcuts and etc
    instructions();
    //for each pad div click play other audiofile from array
    pads.forEach((pad, i) => {
        pad.onclick = (e) => {
            //play the sound and pass it to active recorders
            audio[i].audio.play();
            recorders.forEach(r => {
                if (r.recording) r.getSounds(audio[i].file.slice(0))
            })
        }
        //giving each div attribute 'shortcut' that stores key it is fired by
        pad.shortcut = shortcuts.pads[i];
    })
    //keyboard shortcuts
    document.addEventListener("keydown", e => {
        let keyName = e.key;
        //using variable storing shortcuts
        shortcuts.pads.forEach((shortcut, i) => {
            if (keyName === shortcut) {
                audio[i].audio.play();
                recorders.forEach(r => {
                    if (r.recording) r.getSounds(audio[i].file.slice(0))
                })
            }
        })
    })

    //allow to record tracks
    recordTracks()
}

function recordTracks() {
    recButtons.forEach(btn => {
        btn.onclick = (e) => {
            //switch class according to button state (recording or not)
            e.target.className = e.target.className === "notRec" ? "rec" : "notRec";
            //finding the right recorder to start/stop (with the same id as button pressed)
            let recorder = recorders.find(el => el.track === e.target.id);
            //if target new class is 'rec' start recording
            if (e.target.className === "rec") {
                recorder.start()
            } else {
                recorder.stop();
            }
        }
    })
}

function getSounds(sound) {
    if (this.recording) {
        let audioCxt = this.audioCxt;
        audioCxt.decodeAudioData(sound, function (buffer) {
            //store array buffer and time its clicked, then when stopping save sum at times
            this.audioBuffers.push({
                time: audioCxt.currentTime,
                audioBuffer: buffer
            });
        }.bind(this))
    }
}

function startRecording() {
    this.recording = !this.recording;
    console.log(`Recording ${this.track}`)
    this.audioCxt = new AudioContext();
    if (this.audioBuffers.length) {
        let c = confirm("Would like to edit current track?")
        if (c) {
            //leave audio buffers from previous time recording on this track
        } else {
            this.audioBuffers = [];
        }
    }
}

function stopRecording() {
    this.recording = !this.recording;
    //we are adding to record length duration of last sound so index never is larger then buffer size
    let frameCount = this.audioCxt.sampleRate * this.audioCxt.currentTime;
    let lastSound = this.audioBuffers[this.audioBuffers.length - 1];
    //if last sound duration exceeds the duration of whole recording
    if (lastSound.audioBuffer.duration + lastSound.time) {
        //make the recording long enough
        frameCount += lastSound.audioBuffer.duration * this.audioCxt.sampleRate;
    }
    let newBuff = this.audioCxt.createBuffer(2, frameCount, this.audioCxt.sampleRate)
    for (var channel = 0; channel < 2; channel++) {
        var nowBuffering = newBuff.getChannelData(channel);
        //fill array with zeros
        nowBuffering.fill(0);
        //for each stored audio replace zeros with array buffer corresponding to sound
        this.audioBuffers.forEach(el => {
            let indexStart = Math.floor(el.time * this.audioCxt.sampleRate);
            //set at right index the audio buffer stored in recording
            nowBuffering.set(el.audioBuffer.getChannelData(0), indexStart);
        })
    }
    this.audio = newBuff;
    let x = parseInt(this.track[this.track.length - 1]) - 1;
    playButtons[x].style = "display: block";
}

function playRecording() {
    this.source =  this.source ? this.source : this.audioCxt.createBufferSource();
    this.source.buffer = this.audio;
    let offset = this.offset ? this.offset : 0;
    if(this.state!=="playing"){
        this.state = "playing";
        this.playedAt = this.audioCxt.currentTime;
        this.source.connect(this.audioCxt.destination);
        console.log(this.source);
        if(offset) this.source.start(0, offset);
        else this.source.start(0);
        console.log(`Playing ${this.track}`);
        console.log(this.state)
        let i = parseInt(this.track[this.track.length - 1]) - 1;
        this.source.onended = function() {
            playButtons[i].className = "playButton";
            this.state = "paused";
            this.offset = 0;
            this.playedAt = null;
            this.pausedAt = null;
            this.source = null;
        }.bind(this);
    }else{
        this.source.disconnect();
        this.source.stop(0);
        this.source = null;
        this.state = "paused";
        this.pausedAt = this.audioCxt.currentTime;
        this.offset = this.pausedAt && this.playedAt ? Math.abs(this.pausedAt-this.playedAt) : 0;
    }
}