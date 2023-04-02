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
  const [isSmall, setIsSmall] = useState(true)
  const [hasBorder, setHasBorder] = useState(false)

  const [orgId, setOrgId] = useState<String | undefined>(undefined)

  const [transcription, setTranscription] = useState<string[]>([]);
  const [translation, setTranslation] = useState<string[]>([]);

  useEffect(() => {
    const subscription = orgClient.observable.subscribe({
      next: (org) => {
        console.log(org); // undefined, something wrong here - need to use WSL instead of Windows
        setOrgId(org?.id);
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => { }
    })
    return () => subscription.unsubscribe()
  })

  const setSize = () => {
    if (isSmall) {
      embed.setSize('800px', '800px')
      setIsSmall(false)
    } else {
      embed.setSize('600px', '600px')
      setIsSmall(true)
    }
  }

  const setBorder = () => {
    if (hasBorder) {
      embed.setStyles({
        border: 'none'
      })
      setHasBorder(false)
    } else {
      embed.setStyles({
        border: '5px solid red'
      })
      setHasBorder(true)
    }
  }

  let eventSource: EventSource | null = null;

  const startTranscription = async () => {
    // clear any previous text
    setTranscription([]);
    setTranslation([]);

    if (!eventSource) {
      // TODO: move the localhost url to an env file, change for production
      try {
        // Get the current URL, hardcoded for now
        const stream_url = 'https://www.youtube.com/watch?v=9lMDuugG49c';

        // why is this constantly running?? from where is it being called?
        eventSource = new EventSource(`http://localhost:5000/start?stream_url=${stream_url}`);
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
      } catch (error) {
        console.error(error);
      }
    }
  };

  const stopTranscription = async () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    fetch('http://localhost:5000/stop');
  }

  return (
    <div className="App">
      <button onClick={startTranscription}>Start transcription</button>
      <button onClick={stopTranscription}>Stop transcription</button>
      <p>{transcription}</p>
      <p>{translation}</p>

      <div>Org: {org.name.get()}</div>
      <div>Org ID: {orgId}</div>
      <ul>
        {orgUser.roleConnection.nodes.get()?.map((role) => (
          <li key={role.id}>{role.slug}</li>
        ))}
      </ul>
      <img src={getSrcByImageObj(user.avatarImage.get(), { size: "small" })} />
      <h2>Embed controls</h2>
      <button onClick={setSize}>Toggle Size</button>
      <button onClick={setBorder}>Toggle Border</button>
    </div>
  )
}

export default observer(App)
