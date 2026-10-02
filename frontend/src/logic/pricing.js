export function getPricing(mode, passengers, unitPrice) {
  const safePassengers = Math.max(1, Number.parseInt(passengers, 10) || 1)
  const units = mode === 'car' ? Math.ceil(safePassengers / 4) : mode === 'three-wheel' ? Math.ceil(safePassengers / 3) : safePassengers
  const unitLabel = mode === 'car' || mode === 'three-wheel' ? 'vehicles' : 'tickets'
  const totalPrice = unitPrice * units
  return { passengers: safePassengers, units, unitLabel, unitPrice, totalPrice, perPersonCost: totalPrice / safePassengers }
}

export function pricingBreakdown(mode, passengers, unitPrice) {
  const pricing = getPricing(mode, passengers, unitPrice)
  const unitName = pricing.units === 1 ? pricing.unitLabel.slice(0, -1) : pricing.unitLabel
  return `LKR ${pricing.unitPrice.toLocaleString()} × ${pricing.units} ${unitName} = LKR ${pricing.totalPrice.toLocaleString()} total`
}

export function quoteQuantitySummary(mode, passengers, units, unitPrice) {
  const safePassengers = Math.max(1, Number.parseInt(passengers, 10) || 1)
  const safeUnits = Math.max(1, Number.parseInt(units, 10) || 1)
  const passengerLabel = safePassengers === 1 ? 'person' : 'people'
  const vehicleLabel = safeUnits === 1 ? 'vehicle' : 'vehicles'

  if (mode === 'train' || mode === 'bus') {
    const ticketLabel = safeUnits === 1 ? 'ticket' : 'tickets'
    return `${safeUnits} ${ticketLabel} (1 per person) · LKR ${Number(unitPrice).toLocaleString()} each`
  }

  const capacity = mode === 'car' ? 4 : 3
  const modeLabel = mode === 'car' ? 'car' : 'three-wheel'
  return `${safeUnits} ${vehicleLabel} for ${safePassengers} ${passengerLabel} (up to ${capacity} per ${modeLabel})`
}