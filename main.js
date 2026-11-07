
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// ======================================================
// SKYFORGE FLIGHT — CORE ENGINE
// ======================================================

const $ = (id) => document.getElementById(id);

const flightScene = $("flightScene");
const loading = $("loading");
const startScreen = $("startScreen");
const flightMenu = $("flightMenu");

if (!flightScene) {
  throw new Error("Elemento flightScene não encontrado no HTML.");
}

// ======================================================
// CONFIGURAÇÃO DA CENA
// ======================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c5e8);
scene.fog = new THREE.Fog(0x91c5e8, 500, 2600);

const camera = new THREE.PerspectiveCamera(
  65,
  flightScene.clientWidth / flightScene.clientHeight,
  0.1,
  6000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(flightScene.clientWidth, flightScene.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

renderer.domElement.style.position = "absolute";
renderer.domElement.style.inset = "0";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";

flightScene.appendChild(renderer.domElement);

// ======================================================
// ILUMINAÇÃO
// ======================================================

scene.add(new THREE.HemisphereLight(0xd8efff, 0x536044, 2.2));

const sun = new THREE.DirectionalLight(0xffe5bd, 3.2);
sun.position.set(-300, 500, 200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -350;
sun.shadow.camera.right = 350;
sun.shadow.camera.top = 350;
sun.shadow.camera.bottom = -350;
scene.add(sun);

// ======================================================
// MATERIAIS
// ======================================================

const mat = {
  grass: new THREE.MeshStandardMaterial({ color: 0x527b43 }),
  asphalt: new THREE.MeshStandardMaterial({ color: 0x303943, roughness: 0.95 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x999d9d }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8edf0, metalness: 0.2, roughness: 0.38 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x17232e, metalness: 0.45 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x174c7c, metalness: 0.3 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x17435b,
    metalness: 0.35,
    roughness: 0.12,
    transparent: true,
    opacity: 0.85
  }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x111111 }),
  yellow: new THREE.MeshBasicMaterial({ color: 0xffd34e })
};

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function createBox(parent, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  return mesh;
}

function createCylinder(parent, radius, length, material, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 24),
    material
  );

  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);

  return mesh;
}

// ======================================================
// TERRENO
// ======================================================

const terrain = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  mat.grass
);

terrain.rotation.x = -Math.PI / 2;
terrain.position.y = -2;
terrain.receiveShadow = true;
scene.add(terrain);

// ======================================================
// PISTA
// ======================================================

const runway = new THREE.Mesh(
  new THREE.BoxGeometry(110, 0.5, 1600),
  mat.asphalt
);

runway.position.set(0, -1.5, 0);
runway.receiveShadow = true;
scene.add(runway);

// Faixas centrais
for (let z = -740; z <= 740; z += 80) {
  createBox(scene, 2, 0.15, 35, mat.white, 0, -1.15, z);
}

// Laterais
for (const x of [-52, 52]) {
  createBox(scene, 1.5, 0.15, 1600, mat.white, x, -1.15, 0);
}

// Pátio
const apron = new THREE.Mesh(
  new THREE.BoxGeometry(550, 0.4, 400),
  mat.concrete
);

apron.position.set(390, -1.6, -120);
scene.add(apron);

// ======================================================
// HANGARES
// ======================================================

function createHangar(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  createBox(group, 100, 35, 100, mat.white, 0, 17, 0);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(75, 20, 4),
    mat.dark
  );

  roof.position.y = 44;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  createBox(group, 65, 24, 2, mat.blue, 0, 12, 51);

  scene.add(group);
}

createHangar(350, -350);
createHangar(520, -350);
createHangar(350, 100);

// ======================================================
// ILUMINAÇÃO DA PISTA
// ======================================================

for (let z = -700; z <= 700; z += 50) {
  for (const x of [-58, 58]) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    light.position.set(x, 0, z);
    scene.add(light);
  }
}

// ======================================================
// AVIÃO
// ======================================================

const aircraft = new THREE.Group();
scene.add(aircraft);

// Fuselagem
const fuselage = new THREE.Mesh(
  new THREE.CylinderGeometry(3.1, 3.6, 36, 32),
  mat.white
);

fuselage.rotation.x = Math.PI / 2;
fuselage.castShadow = true;
aircraft.add(fuselage);

// Nariz
const nose = new THREE.Mesh(
  new THREE.SphereGeometry(3.1, 24, 16),
  mat.white
);

nose.position.z = -17;
nose.scale.set(1, 0.85, 1.5);
aircraft.add(nose);

// Cauda
const tail = new THREE.Mesh(
  new THREE.ConeGeometry(3.2, 8, 24),
  mat.white
);

tail.rotation.x = -Math.PI / 2;
tail.position.z = 21;
aircraft.add(tail);

// Asa principal
createBox(aircraft, 65, 1, 11, mat.white, 0, -1, 1);

// Pontas das asas
createBox(aircraft, 5, 1, 7, mat.blue, -33, -1, 1);
createBox(aircraft, 5, 1, 7, mat.blue, 33, -1, 1);

// Asa traseira
createBox(aircraft, 26, 0.7, 5, mat.white, 0, 1, 17);

// Estabilizador vertical
createBox(aircraft, 1, 10, 6, mat.blue, 0, 5, 17);

// Cockpit
const cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(2.8, 24, 16),
  mat.glass
);

cockpit.position.set(0, 1.7, -13);
cockpit.scale.set(1, 0.65, 1.6);
aircraft.add(cockpit);

// Janelas
for (const side of [-1, 1]) {
  for (let z = -9; z <= 10; z += 3) {
    const windowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 8),
      mat.glass
    );

    windowMesh.position.set(side * 3.05, 1.2, z);
    windowMesh.scale.set(0.3, 0.7, 1.3);
    aircraft.add(windowMesh);
  }
}

// ======================================================
// MOTORES
// ======================================================

const engines = [];

for (const side of [-1, 1]) {
  const engine = new THREE.Group();
  engine.position.set(side * 16, -3, 1);
  aircraft.add(engine);

  const body = createCylinder(engine, 2.4, 9, mat.dark, 0, 0, 0);

  const intake = createCylinder(
    engine, 1.9, 0.5, mat.blue, 0, 0, -4.5
  );

  const fan = new THREE.Group();
  fan.position.z = -4.8;
  engine.add(fan);

  for (let i = 0; i < 8; i++) {
    const blade = createBox(
      fan, 0.35, 2.8, 0.12, mat.white, 0, 1.2, 0
    );

    blade.rotation.z = (Math.PI * 2 * i) / 8;
  }

  engines.push(fan);
}

// ======================================================
// TREM DE POUSO
// ======================================================

function createWheel(x, z) {
  createCylinder(aircraft, 0.25, 3, mat.dark, x, -3, z);

  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.7, 20),
    mat.rubber
  );

  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, -4.5, z);
  aircraft.add(wheel);
}

createWheel(-7, 8);
createWheel(7, 8);
createWheel(0, -14);

// Posição inicial
aircraft.position.set(0, 18, 400);

// ======================================================
// CÂMERA
// ======================================================

let cameraMode = 0;

const cameraOffsets = [
  new THREE.Vector3(0, 18, 65),
  new THREE.Vector3(0, 9, 32),
  new THREE.Vector3(0, 5, -25)
];

function updateCamera() {
  const offset = cameraOffsets[cameraMode]
    .clone()
    .applyQuaternion(aircraft.quaternion);

  const desiredPosition = aircraft.position.clone().add(offset);

  camera.position.lerp(desiredPosition, 0.08);

  const target = aircraft.position.clone();
  target.y += 1;

  camera.lookAt(target);
}

// ======================================================
// ESTADO DO VOO
// ======================================================

const keys = {};

let started = false;
let speed = 0;
let throttle = 0;
let pitch = 0;
let roll = 0;
let altitude = 18;
let verticalSpeed = 0;

window.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach(key => keys[key] = false);
});

// ======================================================
// CONTROLES E FÍSICA INICIAL
// ======================================================

function updateFlight(delta) {
  if (!started) return;

  if (keys["w"] || keys["arrowup"]) {
    pitch = Math.min(pitch + delta * 0.5, 0.5);
  }

  if (keys["s"] || keys["arrowdown"]) {
    pitch = Math.max(pitch - delta * 0.5, -0.5);
  }

  if (keys["a"] || keys["arrowleft"]) {
    roll = Math.min(roll + delta * 0.8, 0.7);
  }

  if (keys["d"] || keys["arrowright"]) {
    roll = Math.max(roll - delta * 0.8, -0.7);
  }

  if (keys["shift"]) {
    throttle = Math.min(throttle + delta * 0.2, 1);
  }

  if (keys["control"]) {
    throttle = Math.max(throttle - delta * 0.2, 0);
  }

  speed += (throttle * 220 - speed) * delta * 0.15;

  aircraft.rotation.x +=
    (pitch - aircraft.rotation.x) * delta * 1.5;

  aircraft.rotation.z +=
    (roll - aircraft.rotation.z) * delta * 1.5;

  aircraft.translateZ(-speed * delta * 0.25);

  verticalSpeed = Math.sin(pitch) * speed * 0.08;
  aircraft.position.y += verticalSpeed * delta;

  aircraft.position.y = Math.max(
    4,
    Math.min(aircraft.position.y, 1500)
  );

  altitude = aircraft.position.y;

  engines.forEach((fan) => {
    fan.rotation.z += delta * (10 + throttle * 100);
  });

  updateHUD();
}

// ======================================================
// HUD — IDS DO HTML REAL
// ======================================================

function updateHUD() {
  if ($("speed")) {
    $("speed").textContent = String(Math.round(speed)).padStart(3, "0");
  }

  if ($("altitude")) {
    $("altitude").textContent = String(Math.round(altitude * 3.28084)).padStart(4, "0");
  }

  if ($("verticalSpeed")) {
    $("verticalSpeed").textContent = String(Math.round(verticalSpeed * 196.85)).padStart(3, "0");
  }

  if ($("enginePower")) {
    $("enginePower").textContent = String(Math.round(throttle * 100)).padStart(3, "0");
  }
}

// ======================================================
// BOTÃO INICIAR
// ======================================================

$("startButton")?.addEventListener("click", () => {
  started = true;

  if (startScreen) {
    startScreen.style.display = "none";
  }
});

// ======================================================
// BOTÃO CÂMERA
// ======================================================

$("cameraButton")?.addEventListener("click", () => {
  cameraMode = (cameraMode + 1) % cameraOffsets.length;
});

// ======================================================
// MENU
// ======================================================

$("menuButton")?.addEventListener("click", () => {
  if (flightMenu) {
    flightMenu.classList.remove("hidden");
    flightMenu.style.display = "flex";
  }
});

$("closeMenu")?.addEventListener("click", () => {
  if (flightMenu) {
    flightMenu.classList.add("hidden");
    flightMenu.style.display = "none";
  }
});

$("returnHangar")?.addEventListener("click", () => {
  started = false;

  aircraft.position.set(0, 18, 400);
  aircraft.rotation.set(0, 0, 0);

  speed = 0;
  throttle = 0;
  pitch = 0;
  roll = 0;
  altitude = 18;
  verticalSpeed = 0;

  if (startScreen) {
    startScreen.style.display = "flex";
  }

  if (flightMenu) {
    flightMenu.classList.add("hidden");
    flightMenu.style.display = "none";
  }

  updateHUD();
});

// ======================================================
// RESPONSIVIDADE
// ======================================================

function resize() {
  const width = flightScene.clientWidth;
  const height = flightScene.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

window.addEventListener("resize", resize);

// ======================================================
// LOOP PRINCIPAL
// ======================================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updateFlight(delta);
  updateCamera();

  renderer.render(scene, camera);
}

// ======================================================
// INICIALIZAÇÃO
// ======================================================

updateHUD();
resize();
updateCamera();
animate();

// Esconde o carregamento somente depois da primeira renderização.
renderer.render(scene, camera);

if (loading) {
  loading.style.display = "none";
}

console.log("SKYFORGE FLIGHT: sistemas inicializados.");
