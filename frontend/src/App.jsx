import React, { useState, useRef } from 'react'
import axios from 'axios'

export default function App(){
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [vocalsUrl, setVocalsUrl] = useState('')
  const [musicUrl, setMusicUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const inputRef = useRef(null)

  const backend = (import.meta.env.VITE_BACKEND_URL) || ''

  const upload = async ()=>{
    if(!file) return alert('Select a file, genius')
    const fd = new FormData();
    fd.append('file', file, file.name)
    setLoading(true); setProgress(5)
    try{
      const resp = await axios.post(`${backend}/separate`, fd, {
        headers: {'Content-Type': 'multipart/form-data'},
        onUploadProgress: e => setProgress(Math.round((e.loaded/e.total)*40)+5)
      })
      setProgress(50)
      // then poll for results existance or just use returned urls
      setVocalsUrl(backend + resp.data.vocals_url)
      setMusicUrl(backend + resp.data.music_url)
      setProgress(100)
    }catch(err){
      console.error(err)
      alert('Separation failed. Check server logs.')
    }finally{ setLoading(false); setTimeout(()=>setProgress(0),800) }
  }

  const onDrop = e=>{
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if(f) setFile(f)
  }

  return (
    <div className="wrapper">
      <header className="header">
        <h1>Spleeter Studio ✂️🎶</h1>
        <p className="muted">Upload a song, get vocals and music separated. Deploy backend to Render and update VITE_BACKEND_URL.</p>
      </header>

      <main>
        <div className="upload" onDrop={onDrop} onDragOver={e=>e.preventDefault()}>
          <input ref={inputRef} type="file" accept="audio/*" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])} />
          <button className="btn" onClick={()=>inputRef.current.click()}>Choose file</button>
          <div className="filename">{file?file.name:'Or drag & drop an audio file here'}</div>
          <div className="actions">
            <button className="btn primary" onClick={upload} disabled={loading}>Separate</button>
          </div>
          {loading && <div className="progress"><div style={{width:progress+'%'}}/></div>}
        </div>

        <div className="results">
          {vocalsUrl && (
            <div className="card">
              <h3>Vocals</h3>
              <audio controls src={vocalsUrl}></audio>
              <a className="download" href={vocalsUrl} download>Download</a>
            </div>
          )}
          {musicUrl && (
            <div className="card">
              <h3>Music / Instrumental</h3>
              <audio controls src={musicUrl}></audio>
              <a className="download" href={musicUrl} download>Download</a>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">Made with fire and Spleeter • .crafted.by.sugam</footer>
    </div>
  )
}
