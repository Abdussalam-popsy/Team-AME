import { TEAM } from '../data/team'

export default function Team() {
  return (
    <>
      <section className="hero">
        <h1>The Accelerate ME team.</h1>
        <p>
          Who you actually work with, depending on the track you choose. Student-led, Manchester
          based, running the UK&apos;s largest student startup accelerator.
        </p>
      </section>

      <div className="grid">
        {TEAM.map((member) => (
          <article className="grave" key={member.id}>
            <h3>{member.name}</h3>
            <p className="tagline">{member.title}</p>
            <p className="epitaph">{member.achievement}</p>
            <p className="sub">{member.focus}</p>
            <div className="meta">
              <a href={member.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </div>
            <div className="meta" style={{ marginTop: 10 }}>
              {member.helpWith.map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
