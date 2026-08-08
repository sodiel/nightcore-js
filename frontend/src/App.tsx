import {useState} from "react";





function App() {


  const [trackQuery, setTrackQuery] = useState("");
  const [nightcore, setNightcore] = useState("");


  async function getNightcore(trackQuery: string){
    const url = "http://localhost:3001"
    try {
      console.log(trackQuery);
      const response = await fetch(url, {method: "POST", body: JSON.stringify({trackQuery}), headers: {
          "Content-Type": "application/json",
        },});
      if (!response.ok) {
        throw new Error(`Response: ${response.status}`);
      }
      const track = await response.text();
      setNightcore(track);
    } catch (error) {
      console.error(error.message)
    }
  }

  return (
      <section className={"h-screen flex flex-col justify-center items-center bg-purple-100 dark:bg-purple-950 text-black dark:text-white font-roboto font-display"}>
          <form className={"flex flex-row "}>
            <input className={"focus:outline-none border rounded-md rounded-tl-2xl text-nowrap p-2 mr-1"} onChange={e => setTrackQuery(e.target.value)} type="text" placeholder="Enter song name or paste URL" />
            <button type="submit" className={"border p-2 rounded-md rounded-tr-2xl bg-white/20"} onClick={(e) => {e.preventDefault(); getNightcore(trackQuery)}}>Nightcore</button>
          </form>
        <figure>
          <audio controls src={nightcore}></audio>
          <a href={nightcore}> Download audio </a>
        </figure>

      </section>
  )
}

export default App
