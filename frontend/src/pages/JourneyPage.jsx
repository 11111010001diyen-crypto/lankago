import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createJourney, STOPS } from '../three/journeyScene'

const CHAPTERS = [
  { name: 'Colombo', photo: { src: '/journey/colombo.jpg', alt: 'Colombo skyline with the Lotus Tower at night', author: 'Gihanud2001', license: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:Colombo_city_skyline_at_night.png' }, region: 'Western Province', headline: 'Where every journey begins.', body: "Start in Sri Lanka's busy commercial capital, where Colombo Fort station, city buses and tuk-tuks connect you to the whole island.", tip: 'Colombo Fort is the main hub for trains to Kandy, Ella and Galle.' },
  { name: 'Sigiriya', photo: { src: '/journey/sigiriya.jpg', alt: 'Aerial view of Sigiriya rock above the jungle', author: 'dronepicr', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Sigiriya_lion_rock_aerial_(29448590113).jpg' }, region: 'Central Province', headline: 'The Lion Rock.', body: 'Head north into the Cultural Triangle and climb Sigiriya, the ancient rock fortress rising above the jungle, a UNESCO World Heritage Site.', tip: 'Climb early in the morning to avoid the midday heat.' },
  { name: 'Kandy', photo: { src: '/journey/kandy.jpg', alt: 'Temple of the Sacred Tooth Relic beside Kandy Lake', author: 'Dan arndt', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Kandy_Lake_-_Temple_of_the_Tooth.jpg' }, region: 'Central Province', headline: 'The hill capital.', body: 'Wind into the hills to Kandy Lake and the Temple of the Sacred Tooth Relic, the cultural heart of the island.', tip: 'Compare a car, bus or train from Sigiriya to Kandy in LankaGo.' },
  { name: 'Ella', photo: { src: '/journey/ella.jpg', alt: 'The Nine Arch Bridge near Ella', author: 'Dbulathwatta', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Nine_arch_bridge_1.jpg' }, region: 'Uva Province', headline: 'Tea country by rail.', body: 'Ride past tea estates and cross the Nine Arch Bridge on what is often called one of the most scenic train journeys in the world.', tip: 'Reserved train seats sell out early in peak season, so plan ahead.' },
  { name: 'Galle', photo: { src: '/journey/galle.jpg', alt: 'Galle Fort ramparts and lighthouse', author: 'Jan Kranendonk', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Galle_Fort_wall_and_lighthouse.jpg' }, region: 'Southern Province', headline: 'Sunset on the southern coast.', body: 'Finish by the sea inside Galle Fort, with its old ramparts, lighthouse and stilt fishermen along the shore.', tip: 'Compare the coastal train with an expressway bus in LankaGo.' },
]

const stopProgress = STOPS.map((s) => Math.max(0, (s - 0.006) / 0.95))

export function JourneyPage() {
  const trackRef = useRef(null)
  const mountRef = useRef(null)
  const journeyRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [supported, setSupported] = useState(true)
  const reduceMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    try {
      journeyRef.current = createJourney(mountRef.current, { reduceMotion })
    } catch {
      setSupported(false)
    }
    const onScroll = () => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const value = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - window.innerHeight)))
      setProgress(value)
      journeyRef.current?.setProgress(value)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      journeyRef.current?.dispose()
      journeyRef.current = null
    }
  }, [reduceMotion])

  const active = stopProgress.reduce((best, s, i) => (Math.abs(s - progress) < Math.abs(stopProgress[best] - progress) ? i : best), 0)
  const chapter = CHAPTERS[active]
  const isLast = active === CHAPTERS.length - 1

  const goTo = (index) => {
    const track = trackRef.current
    if (!track) return
    const top = track.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + stopProgress[index] * (track.offsetHeight - window.innerHeight) + 2, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <main className="journey">
      <div ref={trackRef} className="journey__track">
        <div className="journey__stage">
          <div ref={mountRef} className="journey__canvas" aria-hidden="true" />
          <div className="journey__veil" />
          <header className="journey__bar">
            <Link to="/home" className="journey__brand">Lanka<span>Go</span></Link>
            <Link to="/home" className="journey__cta">Plan a trip <span aria-hidden="true">↗</span></Link>
          </header>

          <section key={active} className="journey__chapter" aria-live="polite">
            <p className="journey__eyebrow">{String(active + 1).padStart(2, '0')} / 0{CHAPTERS.length} · {chapter.region}</p>
            <h1>{chapter.name}</h1>
            <h2>{chapter.headline}</h2>
            <p className="journey__body">{chapter.body}</p>
            <p className="journey__tip"><span className="journey__tip-dot" aria-hidden="true" /><span><strong>Travel tip</strong> · {chapter.tip}</span></p>
            {isLast && <Link to="/home" className="journey__final">Plan this journey with LankaGo <span aria-hidden="true">↗</span></Link>}
            {!supported && <p className="journey__note">3D view isn't available in this browser, but you can still read the journey.</p>}
          </section>

          <figure key={`photo-${active}`} className="journey__photo">
            <img src={chapter.photo.src} alt={chapter.photo.alt} loading="lazy" />
            <figcaption><span>Real photo · {chapter.name}</span><a href={chapter.photo.source} target="_blank" rel="noreferrer">{chapter.photo.author} · {chapter.photo.license}</a></figcaption>
          </figure>

          {progress < 0.015 && <p className="journey__hint"><span className="journey__mouse" aria-hidden="true" />Scroll to explore</p>}

          <nav className="journey__timeline" aria-label="Journey stops">
            <div className="journey__stops">
              {CHAPTERS.map((c, i) => (
                <button key={c.name} type="button" className={`journey__stop${i === active ? ' journey__stop--active' : ''}`} aria-current={i === active ? 'step' : undefined} onClick={() => goTo(i)}>{c.name}</button>
              ))}
            </div>
            <div className="journey__progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
          </nav>
        </div>
      </div>
    </main>
  )
}

export default JourneyPage
