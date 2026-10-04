import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { reverseSriLankanPlace } from '../utils/geocode'

const sriLankaCentre = [7.8731, 80.7718]

export function PlacePickerMapModal({ initialPlace, onClose, onSelect }) {
  const mapElement = useRef(null)
  const markerRef = useRef(null)
  const requestRef = useRef(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [status, setStatus] = useState('Tap the map or drag the pin to choose a location.')

  useEffect(() => {
    const centre = initialPlace && Number.isFinite(initialPlace.latitude) && Number.isFinite(initialPlace.longitude) ? [initialPlace.latitude, initialPlace.longitude] : sriLankaCentre
    const map = L.map(mapElement.current, { center: centre, zoom: initialPlace ? 13 : 8, minZoom: 7, maxBounds: [[5.7, 79.25], [10.1, 82.25]], maxBoundsViscosity: 0.8 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
    const chooseCoordinates = (latitude, longitude) => {
      if (!markerRef.current) {
        markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', () => {
          const point = markerRef.current.getLatLng()
          chooseCoordinates(point.lat, point.lng)
        })
      } else markerRef.current.setLatLng([latitude, longitude])
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      setSelectedPlace(null)
      setStatus('Labelling your selected point…')
      reverseSriLankanPlace(latitude, longitude, controller.signal).then((place) => {
        if (!controller.signal.aborted) {
          setSelectedPlace(place)
          setStatus('Location ready to use.')
        }
      }).catch((error) => {
        if (!controller.signal.aborted) setStatus(error.message || 'We could not label this point. Try another location.')
      })
    }
    map.on('click', (event) => chooseCoordinates(event.latlng.lat, event.latlng.lng))
    if (initialPlace) chooseCoordinates(centre[0], centre[1])
    window.setTimeout(() => map.invalidateSize(), 0)
    return () => {
      requestRef.current?.abort()
      map.remove()
      markerRef.current = null
    }
  }, [initialPlace])

  return <div className="map-modal" role="dialog" aria-modal="true" aria-labelledby="map-picker-title"><div className="map-modal__panel"><div className="map-modal__heading"><div><h2 id="map-picker-title">Pick a location on the map</h2><p>{status}</p></div><button type="button" className="text-button" onClick={onClose}>Close</button></div><div className="map-modal__map" ref={mapElement} /><div className="map-modal__selection">{selectedPlace ? <><strong>{selectedPlace.name}</strong><small>{[selectedPlace.area, selectedPlace.district, selectedPlace.province].filter(Boolean).join(' · ')}</small></> : <span>Choose a point within Sri Lanka to continue.</span>}<div><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><button type="button" className="button button--primary" disabled={!selectedPlace} onClick={() => onSelect(selectedPlace)}>Use this location</button></div></div></div></div>
}