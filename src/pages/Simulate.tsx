import { useEffect, useRef, useState } from 'react'

interface Message {
  role: 'user' | 'os'
  text: string
}

const ANSWER = `Simulated against 12 years of Accelerate ME cohorts. Closest precedent: Housr (cohort 6) — property software, founded by Harry Panter.

Most likely outcome (based on what Housr did):

📈 The raise — $6,000,000 in total pre-Series A funding by 2024, currently finalising a $10m private equity deal. Started with AME equity-free funding and the network ("we found our co-founders and CTO through it").

🏗 What they did with it — built the official student housing platform for universities across the UK and US, and hired to a team of 60.

💰 What they made — $10.9m in revenue, scaling $0 → $10m in just 36 months. Founder Harry Panter won the Northern Star Entrepreneurship Award at the Northern Tech Awards.

⚠️ The likelihood — property management software is a crowded sector: most cohort attempts stall at the pilot stage without a distribution wedge. Housr's wedge was students — a market they lived in. Yours needs to be as unfair.

Next step: talk to the AME team (People → AME team) about a cohort place, and open Housr in the Directory for the full trail.`

export default function Simulate() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = () => {
    const prompt = input.trim()
    if (!prompt || thinking) return
    setMessages((m) => [...m, { role: 'user', text: prompt }])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'os', text: ANSWER }])
      setThinking(false)
    }, 2600)
  }

  return (
    <>
      <section className="hero">
        <h1>Ask Founder OS.</h1>
        <p>
          Type a startup idea. Founder OS simulates the possible outcomes — likelihood, raise,
          revenue — cited against what previous Accelerate ME cohorts actually did.
        </p>
      </section>

      <div className="chat">
        <div className="chat-log">
          {messages.length === 0 && !thinking && <div className="chat-hint">Type your startup idea</div>}
          {messages.map((message, i) => (
            <div key={i} className={`chat-msg ${message.role}`}>
              <span className="chat-who">{message.role === 'user' ? 'You' : 'Founder OS'}</span>
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))}
          {thinking && (
            <div className="chat-msg os">
              <span className="chat-who">Founder OS</span>
              <div className="chat-bubble thinking">
                Simulating outcomes across 110+ cohort startups
                <span className="dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') send()
            }}
            aria-label="Describe your startup idea"
          />
          <button type="button" className="btn primary" onClick={send} disabled={thinking}>
            Simulate
          </button>
        </div>
      </div>
    </>
  )
}
