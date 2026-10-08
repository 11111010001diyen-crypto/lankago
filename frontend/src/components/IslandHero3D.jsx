import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { CITY_PINS, SRI_LANKA_OUTLINE } from '../data/sriLankaOutline'

// A slowly turning gold Sri Lanka island with glowing city pins and a tourist route.
// Decorative only: it is hidden from screen readers and skipped when WebGL is unavailable.
const ROUTE = ['Colombo', 'Kandy', 'Ella', 'Galle', 'Colombo']
const DEPTH = 0.16

export function IslandHero3D({ className = '' }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return undefined
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = environment
    scene.environmentIntensity = 0.55

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
    camera.position.set(0, -0.9, 6.2)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const key = new THREE.DirectionalLight(0xfff1d6, 2.4)
    key.position.set(2, 3, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x5fd3c6, 1.6)
    rim.position.set(-3, -1, -2)
    scene.add(rim)

    const island = new THREE.Group()
    island.rotation.x = -0.42
    scene.add(island)

    const shape = new THREE.Shape(SRI_LANKA_OUTLINE.map(([x, y]) => new THREE.Vector2(x, y)))
    const landGeometry = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.025, bevelSegments: 4, curveSegments: 1 })
    landGeometry.translate(0, 0, -DEPTH / 2)
    const capMaterial = new THREE.MeshStandardMaterial({ color: 0xd9a21b, metalness: 0.9, roughness: 0.22 })
    const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5a00, metalness: 0.9, roughness: 0.3 })
    island.add(new THREE.Mesh(landGeometry, [capMaterial, sideMaterial]))

    const topZ = DEPTH / 2 + 0.04
    const pinGeometry = new THREE.SphereGeometry(0.032, 20, 20)
    const pinMaterial = new THREE.MeshStandardMaterial({ color: 0x0e3b3f, emissive: 0x00a3a6, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.3 })
    const ringGeometry = new THREE.RingGeometry(0.045, 0.06, 40)
    const rings = []
    Object.values(CITY_PINS).forEach(([x, y], index) => {
      const pin = new THREE.Mesh(pinGeometry, pinMaterial)
      pin.position.set(x, y, topZ + 0.02)
      island.add(pin)
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x7ef0e6, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.position.set(x, y, topZ + 0.005)
      ring.userData.offset = index * 0.7
      island.add(ring)
      rings.push(ring)
    })

    const routePoints = []
    ROUTE.forEach((city, index) => {
      const [x, y] = CITY_PINS[city]
      routePoints.push(new THREE.Vector3(x, y, topZ + 0.02))
      const next = ROUTE[index + 1]
      if (next) {
        const [nx, ny] = CITY_PINS[next]
        routePoints.push(new THREE.Vector3((x + nx) / 2, (y + ny) / 2, topZ + 0.22))
      }
    })
    const routeCurve = new THREE.CatmullRomCurve3(routePoints, false, 'centripetal')
    const routeGeometry = new THREE.TubeGeometry(routeCurve, 220, 0.009, 8, false)
    const routeMaterial = new THREE.MeshBasicMaterial({ color: 0x7ef0e6, transparent: true, opacity: 0.85 })
    island.add(new THREE.Mesh(routeGeometry, routeMaterial))
    const traveller = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    island.add(traveller)

    const resize = () => {
      const width = mount.clientWidth || 1
      const height = mount.clientHeight || 1
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let visible = true
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    visibilityObserver.observe(mount)

    const clock = new THREE.Clock()
    let frame = 0
    const draw = (time) => {
      island.rotation.y = Math.sin(time * 0.35) * 0.55
      island.position.y = Math.sin(time * 0.8) * 0.03
      rings.forEach((ring) => {
        const t = (time * 0.9 + ring.userData.offset) % 1.6
        ring.scale.setScalar(1 + t * 1.6)
        ring.material.opacity = Math.max(0, 0.8 - t * 0.5)
      })
      traveller.position.copy(routeCurve.getPointAt((time * 0.06) % 1))
      renderer.render(scene, camera)
    }
    const loop = () => {
      frame = requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      draw(clock.getElapsedTime())
    }
    if (reduceMotion) draw(0.6)
    else loop()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      scene.traverse((object) => {
        object.geometry?.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material?.dispose())
      })
      environment.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className={`island-hero-3d ${className}`} aria-hidden="true" />
}

export default IslandHero3D
