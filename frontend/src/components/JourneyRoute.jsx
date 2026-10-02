function journeyPlace(name, area, fullAddress) {
  return {
    name: name || fullAddress || 'Unknown place',
    area: area || '',
    fullAddress: fullAddress || name || 'Unknown place',
  }
}

export function JourneyRoute({ from, to, fromName, fromArea, fromFullAddress, toName, toArea, toFullAddress, discloseAddress = false, className = '' }) {
  const origin = from || journeyPlace(fromName, fromArea, fromFullAddress)
  const destination = to || journeyPlace(toName, toArea, toFullAddress)
  return <div className={`journey-route ${className}`.trim()} aria-label={`Journey from ${origin.name} to ${destination.name}`}>
    <div className="journey-route__stop"><span className="journey-route__marker" aria-hidden="true" /><div><strong>{origin.name}</strong>{origin.area && <small>{origin.area}</small>}</div></div>
    <span className="journey-route__line" aria-hidden="true" />
    <div className="journey-route__stop"><span className="journey-route__marker journey-route__marker--destination" aria-hidden="true" /><div><strong>{destination.name}</strong>{destination.area && <small>{destination.area}</small>}</div></div>
    {discloseAddress && <details className="journey-route__addresses"><summary>View full addresses</summary><p><strong>From:</strong> {origin.fullAddress}</p><p><strong>To:</strong> {destination.fullAddress}</p></details>}
  </div>
}