import logo from './logo.svg';
import './App.css';
import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import guitar from './assets/distortedguitar.sf2';
import * as Pitchfinder from 'pitchfinder';
import notes from './assets/notes.json';

const baseFreq = 440;
const notesArray = notes[baseFreq];

const Button = styled.button`
  background-color: red;
`;

const findClosestNote = function(freq, notes) {
  // Use binary search to find the closest note
  var low = -1, high = notes.length;
  while (high - low > 1) {
      var pivot = Math.round((low + high) / 2);
      if (notes[pivot].frequency <= freq) {
          low = pivot;
      } else {
          high = pivot;
      }
  }

  if(Math.abs(notes[high].frequency - freq) <= Math.abs(notes[low].frequency - freq)) {
      // notes[high] is closer to the frequency we found
      return notes[high];
  }

  return notes[low];
};

const context = new AudioContext();

function App() {
  const playerContainer = useRef(null);
  const apiRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [analyzerNode, setAnalyzerNode] = useState(null);
  const calculationRef = useRef(null);
  const [closestNote, setClosestNote] = useState(null);
  const [sourceReady, setSourceReady] = useState(false);

  const recalculate = () => {
    if (analyzerNode != null) {
      const buffer = new Uint8Array(analyzerNode.fftSize);
      analyzerNode.getByteTimeDomainData(buffer);

      // https://jameshfisher.com/2021/01/18/measuring-audio-volume-in-javascript/
      const pcmData = new Float32Array(analyzerNode.fftSize);
      analyzerNode.getFloatTimeDomainData(pcmData);

      // detect the volume
      let sumSquares = 0.0;
      for (const amplitude of pcmData) {
        sumSquares += amplitude * amplitude;
      }

      const volume = Math.sqrt(sumSquares / pcmData.length);
      // console.log(volume);
      if (volume >= 0.001) {
        const detectPitch = Pitchfinder.AMDF({sampleRate: context.sampleRate});
        const pitch = detectPitch(buffer);

        if (pitch) {
          console.log(pitch, findClosestNote(pitch, notesArray).note, context.currentTime);
          // console.log(findClosestNote(pitch, notesArray));
          // console.log("Current time in seconds:", context.currentTime);
          setClosestNote(findClosestNote(pitch, notesArray)?.note);
        }
      }
    }
    // console.log('here', analyzerNode);
    calculationRef.current = requestAnimationFrame(recalculate);
  };

  useEffect(() => {
    apiRef.current = new window.alphaTab.AlphaTabApi(playerContainer.current, {
      core: {
        tex: true
      },
      display: {
        staveProfile: "Default",
        resources: {
          staffLineColor: "rgb(200, 10, 110)"
        }
      },
      player: {
        scrollMode: "off",
        enablePlayer: true,
        enableAnimatedBeatCursor: false,
        enableUserInteraction: true,
        enableCursor: true,
        soundFont: `https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2`
      }
    });

    // apiRef.current.playerStateChanged.on(e => {
    //     // reset to 1 when stopped
    //     console.log(e);
    //     // if(e.stopped) {
    //     //     console.log(stopped);
    //     // }
    // });
    // apiRef.current.playedBeatChanged.on(e => {
    //   console.log(e);
    //   console.log(apiRef.current.timePosition);
    //     // for (const midi of e.events) { // loop through all played events
    //     //     console.log(midi);
    //     // }
    // });
    // apiRef.current.player.midiEventsPlayed.on(e => {
    //   console.log(e);
    //     console.log(apiRef.current.timePosition);
    //     // for (const midi of e.events) { // loop through all played events
    //     //     console.log(midi);
    //     // }
    // });

    apiRef.current.soundFontLoaded.on(() => {
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const setupContext = async () => {
      // gets a media device and removes any effects from the signal
      // because we're using a guitar, we don't need any of those effects
      // latency 0 allows us to be as real time as possible
      const guitar = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppresion: false,
          latency: 0
        }
      });

      // A workaround to start the audio context without the user interacting with the page (clicking a button)
      if (context.state === 'suspended') {
        await context.resume();
      }

      // analyzers allow us to get information about the signal
      const analyserAudioNode = context.createAnalyser();
      analyserAudioNode.fftSize = 2048;
      setAnalyzerNode(analyserAudioNode);

      // The media stream source
      // we can perform any changes to the signal in this middle step if needed
      const source = context.createMediaStreamSource(guitar);

      // possible
      // source.stop();
      // connect our analyzer to the source media stream
      source.connect(analyserAudioNode);

      setSourceReady(true);

      // connects the source with the destination, in this case the destination is the laptop speakers
      // or whatever browser audio output is connected
      // source.connect(context.destination);

      // You can stop the stream using the mediastream tracks.
      // setTimeout(() => {
      //   source.mediaStream.getTracks().forEach((track) => track.stop());
      // }, 5000);

      // https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext
      // It's possible to use this as the output source rather than listening back
    };

    setupContext()
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (sourceReady) {
      calculationRef.current = requestAnimationFrame(recalculate);
      return () => cancelAnimationFrame(calculationRef.current);
    }
  }, [sourceReady]);

  return (
    <div className="App">
      <button
        onClick={() => {
          apiRef.current.play();
          // apiRef.current.metronomeVolume = 1
        }}
        disabled={!loaded}
      >
        play
      </button>
      <button
        onClick={() => {
          apiRef.current.pause();
        }}
        disabled={!loaded}
      >
        pause
      </button>

      <div ref={playerContainer} data-tex="true">
      \tempo 120
      . \ts 4 4 0.6.8 1.6.8 3.6.8 0.5.8 0.6.8 1.6.8 3.6.8 0.5.8 | 2.5.4 3.5.4 0.4.4 2.4.4 |
        3.4.4 0.3.4 2.3.4 0.2.4 | 1.2.4 3.2.4 0.1.4 1.1.4 |
        3.1.1
      </div>

      <div>
        Closest note: {closestNote}
      </div>
    </div>
  );
}

export default App;
