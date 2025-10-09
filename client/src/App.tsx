import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch("http://localhost:8000/ping")
      .then(res => res.json())
      .then(data => setMsg(data.message));
  }, [])

  return (
    <div className="flex items-center justify-center h-screen text-2xl">
      Backend says: {msg || "loading..."}
    </div>
  )
}

export default App
