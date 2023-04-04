import { useEffect, useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import {
  embed,
  user as userClient,
  getSrcByImageObj,
  org as orgClient,
} from '@trufflehq/sdk'
import { observer } from "@legendapp/state/react";
import { fromSpecObservable } from './from-spec-observable';
import './App.css'
import { event } from '@legendapp/state';

const user = fromSpecObservable(userClient.observable)
const orgUser = fromSpecObservable(userClient.orgUser.observable)
const org = fromSpecObservable(orgClient.observable)

function App() {
  const [orgId, setOrgId] = useState<String | undefined>(undefined)

  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const [transcription, setTranscription] = useState<string[]>([]);
  const [translation, setTranslation] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("fr");

  useEffect(() => {
    const subscription = orgClient.observable.subscribe({
      next: (org) => {
        // undefined, something wrong here - need to use WSL instead of Windows
        setOrgId(org?.id);
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => { }
    })
    return () => subscription.unsubscribe()
  })

  const sleep = (ms: any) => new Promise(r => setTimeout(r, ms));

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    setSelectedLanguage(newLanguage);
  }

  const startTranscription = async () => {
    // clear any previous text
    setTranscription([]);
    setTranslation([]);

    // TODO: move the localhost url to an env file, change for production
    try {
      // Get the current URL, hardcoded for now, needs to be a livestream
      let stream_url = 'https://www.youtube.com/watch?v=hj0YykikOkM';

      // start the audio and transcription threads in the backend
      let response = await fetch(`http://localhost:5000/start?stream_url=${stream_url}&to_code=${selectedLanguage}`);
      console.log("Fetch response: ", response);
      if (response.ok) {
        eventSource?.close(); // just in case
        setEventSource(new EventSource(`http://localhost:5000/stream`));  
      } else {
        throw new Error('Failed to start the audio thread');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const stopTranscription = async () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    let response = await fetch('http://localhost:5000/stop');
    if (!response.ok) {
      throw new Error('Failed to stop the threads');
    }
  };

  useEffect(() => {
    if (eventSource) {
      console.log("New eventSource: ", eventSource);
      eventSource.onmessage = (event) => {
        let data = JSON.parse(event.data);
        // console.log(data);
        setTranscription(prevTranscription => {
          // Keep only the last 3 lines of transcription
          let newTranscription = [...prevTranscription, data.transcription].slice(-3);
          return newTranscription;
        });

        setTranslation(prevTranslation => {
          let newTranslation = [...prevTranslation, data.translation].slice(-3)
          return newTranslation;
        });
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource]);

  useEffect(() => {
    if (eventSource) {
      console.log("New language: ", selectedLanguage);

      const restart = async () => {
        try {
          await stopTranscription();
          await startTranscription();
    
        } catch (error) {
          console.error(error);
        }
      }
      restart();
    }
  }, [selectedLanguage]);

  return (
    <div className="App">
      <label htmlFor="language-select">Select a language: </label>
      <select id="language-select" value={selectedLanguage} onChange={handleLanguageChange}>
        <option value="zh">Chinese</option>
        <option value="hi">Hindi</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
      </select>
      <br />
      <p>{transcription}</p>
      <p>{translation}</p>
      <button onClick={startTranscription}>Start transcription</button>
      <button onClick={stopTranscription}>Stop transcription</button>
    </div>
  )
}

export default observer(App)
