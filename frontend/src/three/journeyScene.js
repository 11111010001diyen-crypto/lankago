import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Scroll-driven 3D journey across a stylised Sri Lanka.
// The camera glides along a road through five stops; progress (0-1) comes from page scroll.

export const STOPS = [0.05, 0.27, 0.49, 0.71, 0.92]
const SKY = 0xe9eef0
const LANDMARK_AHEAD = 0.04

function seeded(seed) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createJourney(mount, { reduceMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(pixelRatio)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  mount.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY)
  scene.fog = new THREE.Fog(SKY, 38, 150)
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400)

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8aa37a, 1.25))
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.1)
  sun.castShadow = true
  sun.shadow.mapSize.set(1536, 1536)
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 })
  sun.shadow.bias = -0.0006
  scene.add(sun, sun.target)

  const materials = new Map()
  const mat = (color, extra) => {
    const key = `${color}|${extra ? JSON.stringify(extra) : ''}`
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true, ...extra }))
    return materials.get(key)
  }
  const mesh = (geometry, color, extra) => {
    const m = new THREE.Mesh(geometry, mat(color, extra))
    m.castShadow = true
    m.receiveShadow = true
    return m
  }
  const put = (parent, object, x, y, z, ry = 0) => {
    object.position.set(x, y, z)
    object.rotation.y = ry
    parent.add(object)
    return object
  }

  // ---- The road ----
  const control = [[0, 30], [0, 0], [-12, -40], [6, -85], [22, -125], [4, -165], [-20, -205], [-12, -250], [14, -290], [26, -330], [8, -370], [-14, -410], [-6, -450], [0, -485]]
  const curve = new THREE.CatmullRomCurve3(control.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
  const rightOf = (u) => {
    const t = curve.getTangentAt(u)
    return new THREE.Vector3(-t.z, 0, t.x).normalize()
  }
  const frame = (u, side, distance) => {
    const group = new THREE.Group()
    group.position.copy(curve.getPointAt(u)).addScaledVector(rightOf(u), side * distance)
    const t = curve.getTangentAt(u)
    group.rotation.y = Math.atan2(t.x, t.z)
    scene.add(group)
    return group
  }
  const exclusions = []
  const focus = []
  const addFocus = (group, x, y, z, top) => {
    group.updateMatrixWorld(true)
    const look = group.localToWorld(new THREE.Vector3(x, y, z))
    focus.push({ look, pin: new THREE.Vector3(look.x, top, look.z) })
  }
  const exclude = (group, radius) => exclusions.push({ x: group.position.x, z: group.position.z, r: radius })

  const ribbon = (halfWidth, y, color) => {
    const steps = 800
    const positions = []
    const index = []
    for (let i = 0; i <= steps; i += 1) {
      const u = i / steps
      const p = curve.getPointAt(u)
      const r = rightOf(u)
      positions.push(p.x + r.x * halfWidth, y, p.z + r.z * halfWidth, p.x - r.x * halfWidth, y, p.z - r.z * halfWidth)
      if (i < steps) {
        const a = i * 2
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(index)
    geometry.computeVertexNormals()
    const m = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }))
    m.receiveShadow = true
    scene.add(m)
    return m
  }

  const ground = mesh(new THREE.PlaneGeometry(1000, 1000), 0xa8c48d)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, 0, -230)
  ground.castShadow = false
  scene.add(ground)
  ribbon(3.4, 0.015, 0xd9caa6)
  ribbon(2.3, 0.03, 0x9a948a)

  const ROUTE_SEGMENTS = 700
  const routeGeometry = new THREE.TubeGeometry(curve, ROUTE_SEGMENTS, 0.14, 6, false)
  routeGeometry.translate(0, 0.1, 0)
  const route = new THREE.Mesh(routeGeometry, new THREE.MeshStandardMaterial({ color: 0xe0892a, emissive: 0xe0892a, emissiveIntensity: 0.45, roughness: 0.5 }))
  scene.add(route)

  // ---- Landmarks ----
  const rnd = seeded(7)
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
  const pyramidRoof = (size, height, stretch = 1) => {
    const g = new THREE.ConeGeometry(size, height, 4)
    g.rotateY(Math.PI / 4)
    g.scale(1, 1, stretch)
    return g
  }

  // 1. Colombo: modern skyline with the Lotus Tower (green shaft, maroon lotus bud) and the Fort station
  {
    const city = frame(STOPS[0] + LANDMARK_AHEAD + 0.03, 1, 28)
    exclude(city, 22)
    const colonial = [0xf3ede2, 0xeee6d6, 0xe7dccb]
    for (let gz = -2; gz <= 2; gz += 1) {
      const h = 3 + rnd() * 2.5
      put(city, mesh(box(3.4, h, 3.8), colonial[Math.floor(rnd() * 3)]), 5, h / 2, gz * 4.6)
      put(city, mesh(pyramidRoof(2.7, 1.5, 1.1), 0xb5523a), 5, h + 0.75, gz * 4.6)
    }
    const glass = { roughness: 0.35, metalness: 0.08, flatShading: false }
    ;[[-2, -7, 22], [1.6, -7, 22], [-3, 3, 14], [0, 9, 11], [-6, -1, 17]].forEach(([x, z, h]) => {
      put(city, mesh(box(3, h, 3), 0xb3c8d2, glass), x, h / 2, z)
      put(city, mesh(box(3.1, 0.4, 3.1), 0x8a9ca6), x, h + 0.2, z)
    })
    const lotus = new THREE.Group()
    put(lotus, mesh(new THREE.CylinderGeometry(4.2, 5, 2.4, 10), 0xd9a0b4), 0, 1.2, 0)
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2
      const petal = put(lotus, mesh(new THREE.ConeGeometry(1.2, 3.4, 4), 0xe2b3c4), Math.cos(a) * 4.4, 2.6, Math.sin(a) * 4.4)
      petal.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5)
    }
    put(lotus, mesh(new THREE.CylinderGeometry(0.7, 1.15, 30, 18), 0x8fc7a4, { flatShading: false, roughness: 0.6 }), 0, 17, 0)
    put(lotus, mesh(new THREE.ConeGeometry(2.4, 1.8, 8), 0x5c9a6a), 0, 32.4, 0).rotation.x = Math.PI
    put(lotus, mesh(new THREE.CylinderGeometry(2.5, 2.2, 0.9, 20), 0xe9dcc0, { flatShading: false }), 0, 33.4, 0)
    const bud = new THREE.LatheGeometry([[0, 0], [1.7, 0.3], [2.7, 1.4], [3, 2.7], [2.7, 3.9], [1.9, 4.9], [0.7, 5.7], [0, 6]].map(([x, y]) => new THREE.Vector2(x, y)), 8)
    put(lotus, mesh(bud, 0x7a2436), 0, 33.9, 0)
    put(lotus, mesh(new THREE.CylinderGeometry(0.12, 0.3, 7, 8), 0xe9e4ea), 0, 43, 0)
    lotus.scale.setScalar(0.8)
    put(city, lotus, -12, 0, 2)
    addFocus(city, -6, 12, 0, 41)

    const fort = frame(STOPS[0] + LANDMARK_AHEAD * 0.6, -1, 11)
    exclude(fort, 9)
    put(fort, mesh(box(4, 3.4, 13), 0xefe3cc), 0, 1.7, 0)
    put(fort, mesh(pyramidRoof(3, 2, 3.4), 0xb6553a), 0, 4.4, 0)
    put(fort, mesh(box(1.8, 8, 1.8), 0xefe3cc), 0, 4, 5.5)
    put(fort, mesh(pyramidRoof(1.6, 1.8), 0xb6553a), 0, 8.9, 5.5)
  }

  // 2. Sigiriya: a wide, flat-topped rock with sheer cliffs, the Lion Paw terrace and the water gardens
  {
    const site = frame(STOPS[1] + LANDMARK_AHEAD + 0.02, 1, 48)
    exclude(site, 34)
    const H = 17
    const rockGeometry = new THREE.CylinderGeometry(1, 1, 1, 48, 10)
    const normal = rockGeometry.attributes.normal
    const position = rockGeometry.attributes.position
    const colors = []
    const cliff = new THREE.Color(0xa0603e)
    const grey = new THREE.Color(0x7f7266)
    const summit = new THREE.Color(0x7d8a56)
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const z = position.getZ(i)
      const t = position.getY(i) + 0.5
      const angle = Math.atan2(z, x)
      const radial = Math.hypot(x, z)
      const isTop = normal.getY(i) > 0.9
      const shoulder = t > 0.8 ? 1 - 0.22 * ((t - 0.8) / 0.2) ** 2 : 1
      const wobble = 1 + 0.05 * Math.sin(angle * 7 + t * 2) + 0.035 * Math.sin(angle * 15 + 1.3) + 0.02 * Math.sin(angle * 29 + t * 9)
      const r = radial * (1 + 0.16 * (1 - t) ** 4) * (1 + 0.035 * Math.sin(t * Math.PI)) * shoulder * wobble * (isTop ? 0.78 : 1)
      const y = isTop ? H + 1.1 * (1 - radial * radial) + 0.25 * Math.sin(angle * 5) * radial : t * H
      position.setXYZ(i, Math.cos(angle) * r * 16, y, Math.sin(angle) * r * 9.5)
      const streak = 0.5 + 0.3 * Math.sin(angle * 11 + t * 1.5) + 0.2 * Math.sin(angle * 23 + 0.7)
      const c = isTop ? summit.clone() : t > 0.9 ? cliff.clone().lerp(summit, (t - 0.9) * 6) : cliff.clone().lerp(grey, streak).multiplyScalar(0.8 + 0.2 * t)
      colors.push(c.r, c.g, c.b)
    }
    rockGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    rockGeometry.computeVertexNormals()
    put(site, mesh(rockGeometry, 0xffffff, { vertexColors: true }), 0, 1.6, 0)
    put(site, mesh(new THREE.CylinderGeometry(22, 25, 1.8, 14), 0x6e8f52), 0, 0.9, 0)
    put(site, mesh(box(6, 5, 12), 0xa8906e), 19, 2.5, 0)
    ;[-2.4, 2.4].forEach((z) => {
      put(site, mesh(box(2.2, 2.4, 2.4), 0xb59b74), 21, 6.2, z)
      ;[-0.6, 0, 0.6].forEach((dz) => put(site, mesh(new THREE.SphereGeometry(0.5, 8, 6), 0xb59b74), 22.3, 5.3, z + dz))
    })
    const stairs = put(site, mesh(box(0.45, 7, 1.4), 0x3d3a36), 16.6, 9.2, 0)
    stairs.rotation.z = 0.1
    put(site, mesh(box(16, 0.12, 1.6), 0xd8c9a6), 33, 0.08, 0)
    for (let k = 0; k < 4; k += 1) {
      ;[-2.8, 2.8].forEach((z) => {
        put(site, mesh(box(3, 0.3, 2.6), 0xd8cdb4), 27.5 + k * 3.7, 0.15, z)
        put(site, mesh(box(2.5, 0.33, 2.1), 0x7fb3c4, { roughness: 0.3, flatShading: false }), 27.5 + k * 3.7, 0.17, z)
      })
    }
    put(site, mesh(box(2.4, 0.3, 34), 0xd8cdb4), 42, 0.15, 0)
    put(site, mesh(box(1.8, 0.33, 34), 0x6fa7b8, { roughness: 0.3, flatShading: false }), 42, 0.17, 0)
    addFocus(site, 2, 9, 0, 22)
  }

  // 3. Kandy: the lake, the octagonal Pattirippuwa, red-tiled shrine buildings and the scalloped cloud wall
  {
    const kandy = frame(STOPS[2] + LANDMARK_AHEAD, 1, 22)
    exclude(kandy, 26)
    const shore = put(kandy, mesh(new THREE.CircleGeometry(8.6, 32), 0xd9cfb3), 0, 0.04, 0)
    shore.rotation.x = -Math.PI / 2
    shore.scale.set(1, 1.75, 1)
    const lake = put(kandy, mesh(new THREE.CircleGeometry(8, 32), 0x6f9fae, { roughness: 0.3, flatShading: false }), 0, 0.06, 0)
    lake.rotation.x = -Math.PI / 2
    lake.scale.set(1, 1.75, 1)
    for (let a = Math.PI * 0.62; a <= Math.PI * 1.32; a += 0.05) {
      const x = Math.cos(a) * 8.9
      const z = -Math.sin(a) * 8.9 * 1.75
      put(kandy, mesh(box(0.4, 0.8, 0.8), 0xf6f2e8), x, 0.4, z)
      put(kandy, mesh(new THREE.SphereGeometry(0.34, 8, 6), 0xf6f2e8), x, 0.85, z).scale.set(1, 0.6, 1)
    }
    const white = 0xf6f1e7
    const tiles = 0x5d5853
    put(kandy, mesh(new THREE.CylinderGeometry(3, 3, 3.2, 8), white), -11, 1.6, 3)
    put(kandy, mesh(new THREE.ConeGeometry(4.3, 1.4, 8), tiles), -11, 3.9, 3)
    put(kandy, mesh(new THREE.CylinderGeometry(2.1, 2.1, 2, 8), white), -11, 5.4, 3)
    put(kandy, mesh(new THREE.ConeGeometry(3, 1.6, 8), tiles), -11, 7.2, 3)
    put(kandy, mesh(new THREE.ConeGeometry(0.25, 1.2, 6), 0xd4a43a), -11, 8.6, 3)
    put(kandy, mesh(box(5, 3.2, 9), white), -17, 1.6, -3)
    put(kandy, mesh(pyramidRoof(3.9, 2, 1.9), 0xb5523a), -17, 4.2, -3)
    put(kandy, mesh(box(4.4, 2.8, 6), white), -16, 1.4, 9)
    put(kandy, mesh(pyramidRoof(3.4, 1.8, 1.45), 0xb5523a), -16, 3.7, 9)
    put(kandy, mesh(box(2.2, 2.2, 2.2), white), -15, 1.1, 4)
    put(kandy, mesh(pyramidRoof(2, 1.6), 0xd9a84a, { metalness: 0.5, roughness: 0.4 }), -15, 3, 4)
    put(kandy, mesh(new THREE.SphereGeometry(18, 9, 6), 0x5f8f55), -36, -6, 0).scale.set(1, 0.7, 1.3)
    addFocus(kandy, -11, 3, 2, 12)
  }

  // 4. Ella: tea rows and the curved Nine Arch Bridge with a passing train
  const train = []
  const BRIDGE_R = 34
  const SPAN = 4.4
  const BRIDGE_TOP = 10.2
  {
    const tea = frame(STOPS[3] + LANDMARK_AHEAD * 0.4, -1, 6)
    exclude(tea, 16)
    const bush = new THREE.IcosahedronGeometry(0.62, 0)
    bush.scale(1, 0.7, 1)
    const rows = []
    for (let x = 1; x <= 16; x += 1.7) for (let z = -14; z <= 14; z += 1.05) rows.push([x, z])
    const bushes = new THREE.InstancedMesh(bush, mat(0xffffff), rows.length)
    const dummy = new THREE.Object3D()
    rows.forEach(([x, z], i) => {
      dummy.position.set(x, 0.35, z)
      dummy.updateMatrix()
      bushes.setMatrixAt(i, dummy.matrix)
      bushes.setColorAt(i, new THREE.Color(Math.round(x / 1.7) % 2 ? 0x4a8a4c : 0x3d7a42))
    })
    bushes.castShadow = true
    bushes.receiveShadow = true
    bushes.frustumCulled = false
    tea.add(bushes)
    put(tea, mesh(new THREE.ConeGeometry(18, 13, 8), 0x7fa86e), 32, 6.5, 0)

    const bridgeSite = frame(STOPS[3] + LANDMARK_AHEAD + 0.02, 1, 40)
    exclude(bridgeSite, 26)
    const bridge = put(bridgeSite, new THREE.Group(), 0, 0, -BRIDGE_R * 0.5, 1.2)
    const a = 1.55
    const spring = 7.2
    const shape = new THREE.Shape()
    shape.moveTo(-SPAN / 2, 0)
    shape.lineTo(-SPAN / 2, BRIDGE_TOP)
    shape.lineTo(SPAN / 2, BRIDGE_TOP)
    shape.lineTo(SPAN / 2, 0)
    shape.lineTo(a, 0)
    shape.lineTo(a, spring)
    shape.absarc(0, spring, a, 0, Math.PI, false)
    shape.lineTo(-a, 0)
    shape.lineTo(-SPAN / 2, 0)
    const panel = new THREE.ExtrudeGeometry(shape, { depth: 1.7, bevelEnabled: false, curveSegments: 10 })
    panel.translate(0, 0, -0.85)
    for (let i = 0; i < 9; i += 1) {
      const theta = ((i - 4) * SPAN) / BRIDGE_R
      const p = put(bridge, mesh(panel, 0x7d7064), BRIDGE_R * Math.sin(theta), 0, BRIDGE_R * (1 - Math.cos(theta)), -theta)
      put(p, mesh(box(SPAN, 0.5, 0.2), 0x6e6358), 0, BRIDGE_TOP + 0.25, 0.75)
      put(p, mesh(box(SPAN, 0.5, 0.2), 0x6e6358), 0, BRIDGE_TOP + 0.25, -0.75)
      put(p, mesh(box(1.2, 2.4, 2.4), 0x6e6358), SPAN / 2, 1.2, 0)
    }
    for (let i = 0; i < 3; i += 1) {
      const car = new THREE.Group()
      put(car, mesh(box(1.4, 1.2, 3.3), 0x2f5fa8), 0, 0.6, 0)
      put(car, mesh(box(1.42, 0.18, 3.32), 0xf2c230), 0, 0.35, 0)
      put(car, mesh(box(1.44, 0.34, 2.9), 0xa9d4ef, { roughness: 0.3 }), 0, 0.85, 0)
      put(car, mesh(box(1.3, 0.14, 3.2), 0x1e447d), 0, 1.27, 0)
      bridge.add(car)
      train.push(car)
    }
    addFocus(bridgeSite, 0, 5, -BRIDGE_R * 0.4, 15)
  }

  // 5. Galle: sloped fort ramparts, the white lighthouse on its bastion, the mosque, the sea and stilt fishermen
  {
    const sea = frame(STOPS[4] + 0.03, 1, 112)
    const water = put(sea, mesh(new THREE.PlaneGeometry(200, 130), 0x6fb0c2, { roughness: 0.35, metalness: 0.05, flatShading: false }), 0, 0.07, 0)
    water.rotation.x = -Math.PI / 2
    water.receiveShadow = true
    water.castShadow = false
    const beach = frame(STOPS[4] + 0.03, 1, 8)
    const sand = put(beach, mesh(new THREE.PlaneGeometry(9, 70), 0xe8d6ae), 0, 0.045, 0)
    sand.rotation.x = -Math.PI / 2
    sand.castShadow = false

    const fort = frame(STOPS[4] + LANDMARK_AHEAD, 1, 10.5)
    exclude(fort, 16)
    const section = new THREE.Shape([new THREE.Vector2(-2, 0), new THREE.Vector2(2, 0), new THREE.Vector2(1.2, 3), new THREE.Vector2(-1.2, 3)])
    const rampart = new THREE.ExtrudeGeometry(section, { depth: 22, bevelEnabled: false })
    rampart.translate(0, 0, -11)
    put(fort, mesh(rampart, 0x9c8f78), 0, 0, 2)
    put(fort, mesh(box(2.4, 0.2, 22), 0x7fa466), 0, 3.1, 2)
    put(fort, mesh(new THREE.CylinderGeometry(4.2, 5, 3, 5), 0x9c8f78), -0.5, 1.5, 13)
    put(fort, mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.2, 5), 0x7fa466), -0.5, 3.1, 13)
    const smooth = { flatShading: false, roughness: 0.6 }
    put(fort, mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.4, 24), 0xf2efe7, smooth), -0.5, 3.8, 13)
    put(fort, mesh(new THREE.CylinderGeometry(0.75, 1.05, 10, 24), 0xf7f5ef, smooth), -0.5, 9.5, 13)
    put(fort, mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.25, 24), 0xe9e6de, smooth), -0.5, 14.6, 13)
    put(fort, mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 16), 0x3a4448, { roughness: 0.25 }), -0.5, 15.3, 13)
    put(fort, mesh(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf7f5ef, smooth), -0.5, 15.85, 13)
    put(fort, mesh(box(3.4, 3.4, 5), 0xf6f3ec), 4.2, 1.7, -7)
    ;[[2.9, -5], [5.5, -5], [2.9, -9], [5.5, -9]].forEach(([x, z]) => {
      put(fort, mesh(new THREE.CylinderGeometry(0.22, 0.26, 5.2, 10), 0xf6f3ec, smooth), x, 2.6, z)
      put(fort, mesh(new THREE.SphereGeometry(0.34, 10, 6), 0xf6f3ec, smooth), x, 5.35, z)
    })
    put(fort, mesh(new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf6f3ec, smooth), 4.2, 3.4, -7)
    addFocus(fort, -0.5, 8, 10, 20)

    ;[0.9, 0.915, 0.93, 0.945].forEach((u, i) => {
      const spot = frame(u + 0.02, 1, 24 + (i % 2) * 6)
      put(spot, mesh(box(0.12, 3.4, 0.12), 0x6b4f36), 0, 1.7, 0)
      put(spot, mesh(box(0.9, 0.09, 0.09), 0x6b4f36), 0, 2.3, 0)
      put(spot, mesh(new THREE.CapsuleGeometry(0.18, 0.42, 3, 8), [0x0e7c7b, 0xe8a33d, 0xc0392b, 0x3b5bdb][i]), 0, 2.85, 0)
      put(spot, mesh(new THREE.SphereGeometry(0.16, 8, 8), 0x8d5524), 0, 3.35, 0)
    })
  }

  // ---- Trees, palms and distant hills ----
  const inSea = (u, side) => side > 0 && u > STOPS[4] - 0.035
  const blocked = (x, z) => exclusions.some((e) => (x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r)
  const scatter = (count, near, far, allowSea) => {
    const spots = []
    let guard = 0
    while (spots.length < count && guard < count * 20) {
      guard += 1
      const u = rnd()
      const side = rnd() < 0.5 ? -1 : 1
      const d = near + (far - near) * rnd() ** 1.6
      if (inSea(u, side) && !(allowSea && d < 12)) continue
      const p = curve.getPointAt(u).addScaledVector(rightOf(u), side * d)
      if (blocked(p.x, p.z)) continue
      spots.push(p)
    }
    return spots
  }
  const dummy = new THREE.Object3D()
  const plant = (geometry, color, spots, scaleRange, colorFn) => {
    const inst = new THREE.InstancedMesh(geometry, mat(colorFn ? 0xffffff : color), spots.length)
    spots.forEach((p, i) => {
      const s = scaleRange[0] + (scaleRange[1] - scaleRange[0]) * p.userScale
      dummy.position.set(p.x, 0, p.z)
      dummy.rotation.set(0, p.userRot, 0)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
      if (colorFn) inst.setColorAt(i, colorFn(i))
    })
    inst.castShadow = true
    inst.receiveShadow = true
    inst.frustumCulled = false
    scene.add(inst)
  }
  const withRandom = (spots) => spots.map((p) => Object.assign(p, { userScale: rnd(), userRot: rnd() * Math.PI * 2 }))

  const trunk = new THREE.CylinderGeometry(0.14, 0.24, 5.4, 5)
  trunk.translate(0, 2.7, 0)
  const leaves = []
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.ConeGeometry(0.34, 2.8, 4)
    leaf.translate(0, 1.4, 0)
    leaf.rotateZ(-1.95)
    leaf.rotateY((i / 7) * Math.PI * 2)
    leaf.translate(0, 5.3, 0)
    leaves.push(leaf)
  }
  const crown = mergeGeometries(leaves)
  const palms = withRandom(scatter(160, 9, 36, true))
  plant(trunk, 0x8b6a45, palms, [0.85, 1.25])
  const greens = [0x3f8a4f, 0x4f9a55, 0x367d47].map((c) => new THREE.Color(c))
  plant(crown, 0x3f8a4f, palms, [0.85, 1.25], (i) => greens[i % 3])

  const stem = new THREE.CylinderGeometry(0.18, 0.26, 1.6, 5)
  stem.translate(0, 0.8, 0)
  const canopy = new THREE.IcosahedronGeometry(1.5, 0)
  canopy.translate(0, 2.6, 0)
  const trees = withRandom(scatter(210, 10, 48, false))
  plant(stem, 0x7a5a3a, trees, [0.8, 1.5])
  const leafy = [0x5e9a52, 0x6fa85e, 0x4d8a4a, 0x86b069].map((c) => new THREE.Color(c))
  plant(canopy, 0x5e9a52, trees, [0.8, 1.5], (i) => leafy[i % 4])

  const hillColors = [0x8fb47e, 0x7ea672, 0x9cbc88, 0x86ad79]
  for (let i = 0; i < 70; i += 1) {
    const u = rnd()
    const side = rnd() < 0.5 ? -1 : 1
    if (inSea(u, side)) continue
    const p = curve.getPointAt(u).addScaledVector(rightOf(u), side * (60 + rnd() * 70))
    const hill = mesh(new THREE.ConeGeometry(18 + rnd() * 20, 10 + rnd() * 18, 7), hillColors[i % 4])
    hill.castShadow = false
    put(scene, hill, p.x, hill.geometry.parameters.height / 2 - 0.5, p.z, rnd() * Math.PI)
  }

  // ---- The lead tuk-tuk ----
  const tuk = new THREE.Group()
  put(tuk, mesh(box(1, 0.9, 1.6), 0x8c2f2f), 0, 0.75, 0)
  put(tuk, mesh(box(1.08, 0.14, 1.7), 0x2a2a2a), 0, 1.75, 0)
  put(tuk, mesh(box(0.95, 0.5, 0.06), 0xa9d4ef, { roughness: 0.3 }), 0, 1.4, 0.78)
  ;[[-0.48, 1.05], [0.48, 1.05], [-0.48, -0.75], [0.48, -0.75]].forEach(([x, z]) => put(tuk, mesh(box(0.06, 0.6, 0.06), 0x2a2a2a), x, 1.45, z * 0.75))
  ;[[0, 0.62], [-0.45, -0.55], [0.45, -0.55]].forEach(([x, z]) => {
    const w = put(tuk, mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 12), 0x1f1f1f), x, 0.22, z)
    w.rotation.z = Math.PI / 2
  })
  scene.add(tuk)

  // ---- Animation ----
  let target = 0
  let current = 0
  let width = 1
  let height = 1
  const look = new THREE.Vector3()
  const resize = () => {
    width = mount.clientWidth || 1
    height = mount.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.fov = width < 700 ? 58 : 42
    // Shift the picture so the scenery sits beside (desktop) or below (phone) the chapter text.
    if (width >= 700) camera.setViewOffset(width, height, -width * 0.17, 0, width, height)
    else camera.setViewOffset(width, height, 0, -height * 0.14, width, height)
    camera.updateProjectionMatrix()
  }
  resize()
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(mount)

  const uFor = (p) => 0.006 + p * 0.95
  const clock = new THREE.Clock()
  let frameId = 0
  let last = performance.now()
  let frames = 0
  let sampleTime = 0
  let sampleFrames = 0
  const draw = () => {
    const now = performance.now()
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    frames += 1
    // Adaptive quality: if the device is slow, render fewer pixels, then drop shadows.
    sampleTime += dt
    sampleFrames += 1
    if (sampleTime > 2) {
      const fps = sampleFrames / sampleTime
      if (fps < 28 && pixelRatio > 1) {
        pixelRatio = 1
        renderer.setPixelRatio(1)
        resize()
      } else if (fps < 24 && renderer.shadowMap.enabled) {
        renderer.shadowMap.enabled = false
        scene.traverse((o) => { if (o.material) o.material.needsUpdate = true })
      }
      sampleTime = 0
      sampleFrames = 0
    }
    current += (target - current) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 4.5))
    const time = reduceMotion ? 0 : clock.getElapsedTime()
    const u = uFor(current)
    const p = curve.getPointAt(u)
    camera.position.copy(p).addScaledVector(rightOf(u), 2.6)
    camera.position.y = 7.4
    look.copy(curve.getPointAt(Math.min(u + 0.032, 1)))
    look.y = 1.4
    const near = STOPS.reduce((best, s, i) => (Math.abs(s - u) < Math.abs(STOPS[best] - u) ? i : best), 0)
    const weight = Math.max(0, 1 - Math.abs(u - STOPS[near]) / 0.11)
    look.lerp(focus[near].look, 0.8 * weight * weight * (3 - 2 * weight))
    camera.lookAt(look)
    sun.target.position.copy(look)
    sun.position.copy(look).add(new THREE.Vector3(32, 46, 18))

    const nextStop = STOPS.find((s) => s + LANDMARK_AHEAD > u + 0.01) ?? 1
    route.geometry.setDrawRange(0, Math.floor(Math.min(nextStop + LANDMARK_AHEAD, 1) * ROUTE_SEGMENTS) * 36)

    const tu = Math.min(u + 0.024, 1)
    const t = curve.getTangentAt(tu)
    tuk.position.copy(curve.getPointAt(tu)).addScaledVector(rightOf(tu), 0.9)
    tuk.position.y = Math.sin(time * 9) * 0.02
    tuk.rotation.y = Math.atan2(t.x, t.z)


    const halfArc = (4.5 * SPAN) / BRIDGE_R
    const leadTheta = (((time * 0.08) % 1) * 2 - 1) * halfArc * 1.6
    train.forEach((car, i) => {
      const theta = leadTheta - (i * 3.5) / BRIDGE_R
      car.position.set(BRIDGE_R * Math.sin(theta), BRIDGE_TOP, BRIDGE_R * (1 - Math.cos(theta)))
      car.rotation.y = Math.atan2(Math.cos(theta), Math.sin(theta))
      car.visible = Math.abs(theta) < halfArc - 0.04
    })
    renderer.render(scene, camera)
  }
  const loop = () => {
    frameId = requestAnimationFrame(loop)
    if (document.hidden) return
    draw()
  }
  loop()
  if (import.meta.env.DEV) window.__lankagoJourney = { camera, curve, focus, state: () => ({ target, current, frames }), step: (n = 40) => { for (let i = 0; i < n; i += 1) { last -= 100; draw() } } }

  return {
    setProgress(value) {
      target = Math.min(1, Math.max(0, value))
    },
    progressToStop: (index) => (STOPS[index] - 0.006) / 0.95,
    dispose() {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      scene.traverse((object) => {
        object.geometry?.dispose()
        if (object.material && !Array.isArray(object.material)) object.material.dispose()
      })
      materials.forEach((m) => m.dispose())
      route.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
