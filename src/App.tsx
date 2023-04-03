import { useEffect, useState } from 'react'
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
        // console.log(org); 
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
      // Get the current URL, hardcoded for now
      const stream_url = 'https://www.youtube.com/watch?v=ahLiJuj6_tM';

      setEventSource(new EventSource(`http://localhost:5000/start?stream_url=${stream_url}&to_code=${selectedLanguage}`));
      if (eventSource) {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          // console.log(data);
          setTranscription(prevTranscription => {
            // Keep only the last 3 lines of transcription
            const newTranscription = [...prevTranscription, data.transcription].slice(-3);
            return newTranscription;
          });

          setTranslation(prevTranslation => {
            const newTranslation = [...prevTranslation, data.translation].slice(-3)
            return newTranslation;
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const stopTranscription = () => {
    fetch('http://localhost:5000/stop');
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
  }

  useEffect(() => {
    console.log("New eventSource: ", eventSource);
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    }
  }, [eventSource]);

  useEffect(() => {
    console.log("New language: ", selectedLanguage);
    stopTranscription();
    startTranscription();
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
      <button onClick={startTranscription}>Start transcription</button>
      <button onClick={stopTranscription}>Stop transcription</button>
      <p>{transcription}</p>
      <p>{translation}</p>
    </div>
  )
}

export default observer(App)
