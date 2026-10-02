const directionDetails = {
  up: { symbol: '↑', label: 'increased' },
  down: { symbol: '↓', label: 'decreased' },
  neutral: { symbol: '→', label: 'unchanged' },
}

export function StatsHighlight({ stats = [] }) {
  if (!Array.isArray(stats) || stats.length === 0) return null

  return <section className="stats-highlight" aria-label="LankaGo journey statistics"><div className="stats-highlight__grid">{stats.map((stat, index) => {
    const direction = directionDetails[stat.badgeDirection] ? stat.badgeDirection : 'neutral'
    const { symbol, label } = directionDetails[direction]
    const title = stat.title || 'Statistic'

    return <article className="stats-highlight__card" key={`${title}-${index}`}><div className="stats-highlight__heading"><h2>{title}</h2>{stat.subtitle && <p>{stat.subtitle}</p>}</div><strong className="stats-highlight__value">{stat.value || '—'}</strong><div className="stats-highlight__change"><span className={`stats-highlight__badge stats-highlight__badge--${direction}`} aria-label={`${stat.badgeText || 'No change'} ${label}`}><span aria-hidden="true">{symbol}</span>{stat.badgeText || 'No change'}</span>{stat.subtext && <span className="stats-highlight__subtext">{stat.subtext}</span>}</div></article>
  })}</div></section>
}