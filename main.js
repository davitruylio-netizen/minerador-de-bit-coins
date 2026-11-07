
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// ==========================================
// SKYFORGE FLIGHT — PRIMEIRA VERSÃO
// ==========================================

const sceneElement = document.getElementById("flightScene");
const loadingScreen = document.getElementById("loadingScreen");
const startScreen = document.getElementById("startScreen");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b9df);
scene.fog = new THREE.Fog(0x87b9df, 300, 1800);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

sceneElement.appendChild(renderer.domElement);

// ==========================================
// ILUMINAÇÃO
// ==========================================

const hemisphere = new THREE.HemisphereLight(
  0xc9e7ff,
  0x526044,
  2
);
scene.add(hemisphere);

const sunlight = new THREE.DirectionalLight(0xffe3b5, 3);
sunlight.position.set(-300, 500, 200);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -400;
sunlight.shadow.camera.right = 400;
sunlight.shadow.camera.top = 400;
sunlight.shadow.camera.bottom = -400;
scene.add(sunlight);

// ==========================================
// MATERIAIS
// ==========================================

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x527b43 }),
  asphalt: new THREE.MeshStandardMaterial({ color: 0x303943, roughness: 0.95 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9b9c98 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8edf0, metalness: 0.25, roughness: 0.35 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x18232e, metalness: 0.4, roughness: 0.4 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x173f70, metalness: 0.35, roughness: 0.3 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x173d55,
    metalness: 0.45,
    roughness: 0.12,
    transparent: true,
    opacity: 0.85
  }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xffd34e, emissive: 0x332000 })
};

// ==========================================
// FUNÇÕES DE CONSTRUÇÃO
// ==========================================

function box(parent, width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radiusTop, radiusBottom, length, material, x, y, z, rotationZ = 0) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 24),
    material
  );
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotationZ;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ==========================================
// TERRENO E AEROPORTO
// ==========================================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  materials.grass
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2;
ground.receiveShadow = true;
scene.add(ground);

const runway = new THREE.Mesh(
  new THREE.BoxGeometry(100, 0.5, 1500),
  materials.asphalt
);
runway.position.set(0, -1.5, 0);
runway.receiveShadow = true;
scene.add(runway);

// Linhas centrais da pista
for (let z = -700; z <= 700; z += 80) {
  box(scene, 2, 0.15, 35, materials.white, 0, -1.15, z);
}

// Laterais da pista
for (const side of [-47, 47]) {
  box(scene, 1.5, 0.15, 1500, materials.white, side, -1.15, 0);
}

// Pátio do aeroporto
const apron = new THREE.Mesh(
  new THREE.BoxGeometry(500, 0.4, 350),
  materials.concrete
);
apron.position.set(350, -1.6, -100);
scene.add(apron);

// Hangares
function createHangar(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  box(group, 100, 35, 100, materials.white, 0, 17, 0);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(72, 22, 4),
    materials.dark
  );
  roof.position.y = 45;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.8;
  group.add(roof);

  box(group, 65, 24, 2, materials.blue, 0, 12, 51);

  scene.add(group);
}

createHangar(350, -350);
createHangar(520, -350);
createHangar(350, 100);

// Luzes da pista
for (let z = -700; z <= 700; z += 45) {
  for (const x of [-53, 53]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    lamp.position.set(x, 0, z);
    scene.add(lamp);
  }
}

// ==========================================
// AVIÃO 3D
// ==========================================

const aircraft = new THREE.Group();
scene.add(aircraft);

// O avião aponta para a direção -Z.
const fuselage = new THREE.Mesh(
  new THREE.CylinderGeometry(3.2, 3.8, 34, 32),
  materials.white
);
fuselage.rotation.x = Math.PI / 2;
fuselage.position.y = 0;
fuselage.position.z = 0;
fuselage.scale.set(1, 1, 1);
fuselage.castShadow = true;
aircraft.add(fuselage);

// Nariz arredondado
const nose = new THREE.Mesh(
  new THREE.SphereGeometry(3.2, 24, 16),
  materials.white
);
nose.position.set(0, 0, -17);
nose.scale.set(1, 0.85, 1.5);
aircraft.add(nose);

// Cauda traseira
const tailCone = new THREE.Mesh(
  new THREE.ConeGeometry(3.2, 8, 24),
  materials.white
);
tailCone.rotation.x = -Math.PI / 2;
tailCone.position.z = 20;
aircraft.add(tailCone);

// Asa principal
const wing = new THREE.Mesh(
  new THREE.BoxGeometry(62, 1.1, 10),
  materials.white
);
wing.position.set(0, -1, 1);
wing.castShadow = true;
aircraft.add(wing);

// Pontas das asas
for (const side of [-1, 1]) {
  const tip = box(aircraft, 5, 1, 7, materials.blue, side * 32, -1, 1);
  tip.rotation.z = side * -0.12;
}

// Asa traseira
const rearWing = box(
  aircraft, 25, 0.7, 5, materials.white, 0, 1, 16
);

// Estabilizador vertical
const fin = new THREE.Mesh(
  new THREE.BoxGeometry(1, 10, 6),
  materials.blue
);
fin.position.set(0, 5, 17);
fin.rotation.x = -0.2;
aircraft.add(fin);

// Motores
const engines = [];

for (const side of [-1, 1]) {
  const engine = new THREE.Group();
  engine.position.set(side * 16, -3, 1);
  aircraft.add(engine);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 9, 24),
    materials.dark
  );
  body.rotation.x = Math.PI / 2;
  engine.add(body);

  const intake = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.2, 0.5, 24),
    materials.blue
  );
  intake.rotation.x = Math.PI / 2;
  intake.position.z = -4.5;
  engine.add(intake);

  const fan = new THREE.Group();
  fan.position.z = -4.8;
  engine.add(fan);

  for (let i = 0; i < 8; i++) {
    const blade = box(engine, 0.35, 2.8, 0.12, materials.white, 0, 0, 0);
    blade.position.set(0, 0, 0);
    blade.rotation.z = (Math.PI * 2 * i) / 8;
    fan.add(blade);
  }

  engines.push(fan);
}

// Janelas do cockpit
const cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(2.8, 24, 16),
  materials.glass
);
cockpit.position.set(0, 1.7, -13);
cockpit.scale.set(1, 0.65, 1.6);
aircraft.add(cockpit);

// Fileira de janelas
for (const side of [-1, 1]) {
  for (let z = -9; z <= 10; z += 3) {
    const windowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 8),
      materials.glass
    );
    windowMesh.position.set(side * 3.05, 1.2, z);
    windowMesh.scale.set(0.3, 0.7, 1.3);
    aircraft.add(windowMesh);
  }
}

// Trem de pouso
function createWheel(x, z) {
  const strut = cylinder(
    aircraft, 0.25, 0.25, 3, materials.dark,
    x, -3, z
  );

  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.7, 20),
    materials.rubber
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, -4.5, z);
  aircraft.add(wheel);
}

createWheel(-7, 8);
createWheel(7, 8);
createWheel(0, -14);

aircraft.position.set(0, 18, 400);

// ==========================================
// CÂMERA
// ==========================================

let cameraMode = 0;

const cameraPositions = [
  new THREE.Vector3(0, 18, 65),
  new THREE.Vector3(0, 9, 30),
  new THREE.Vector3(0, 5, -25)
];

function updateCamera() {
  const offset = cameraPositions[cameraMode];
  const targetPosition = offset.clone().applyQuaternion(aircraft.quaternion);
  targetPosition.add(aircraft.position);

  camera.position.lerp(targetPosition, 0.06);
  const lookTarget = aircraft.position.clone();
  lookTarget.y += 1;
  camera.lookAt(lookTarget);
}

// ==========================================
// CONTROLES DE VOO
// ==========================================

const keys = {};
let started = false;
let speed = 0;
let altitude = 18;
let throttle = 0;
let pitch = 0;
let roll = 0;

window.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

function updateFlight(delta) {
  if (!started) return;

  if (keys["w"] || keys["arrowup"]) pitch = Math.min(pitch + delta * 0.5, 0.5);
  if (keys["s"] || keys["arrowdown"]) pitch = Math.max(pitch - delta * 0.5, -0.5);
  if (keys["a"] || keys["arrowleft"]) roll = Math.min(roll + delta * 0.8, 0.7);
  if (keys["d"] || keys["arrowright"]) roll = Math.max(roll - delta * 0.8, -0.7);

  if (keys["shift"]) throttle = Math.min(throttle + delta * 0.2, 1);
  if (keys["control"]) throttle = Math.max(throttle - delta * 0.2, 0);

  speed += (throttle * 180 - speed) * delta * 0.15;
  aircraft.rotation.x += (pitch - aircraft.rotation.x) * delta * 1.5;
  aircraft.rotation.z += (roll - aircraft.rotation.z) * delta * 1.5;

  aircraft.translateZ(-speed * delta * 0.25);
  aircraft.position.y += Math.sin(pitch) * speed * delta * 0.08;
  aircraft.position.y = Math.max(4, Math.min(aircraft.position.y, 1000));

  altitude = aircraft.position.y;

  engines.forEach((fan) => {
    fan.rotation.z += delta * (10 + throttle * 100);
  });

  updateHUD();
}

// ==========================================
// HUD
// ==========================================

function updateHUD() {
  const speedElement = document.getElementById("speedValue");
  const altitudeElement = document.getElementById("altitudeValue");
  const powerElement = document.getElementById("powerValue");

  if (speedElement) speedElement.textContent = Math.round(speed) + " km/h";
  if (altitudeElement) altitudeElement.textContent = Math.round(altitude) + " m";
  if (powerElement) powerElement.textContent = Math.round(throttle * 100) + "%";
}

// ==========================================
// BOTÕES
// ==========================================

const startButton = document.getElementById("startButton");
if (startButton) {
  startButton.addEventListener("click", () => {
    started = true;
    if (startScreen) startScreen.classList.add("hidden");
  });
}

const cameraButton = document.getElementById("cameraButton");
if (cameraButton) {
  cameraButton.addEventListener("click", () => {
    cameraMode = (cameraMode + 1) % cameraPositions.length;
  });
}

const menuButton = document.getElementById("menuButton");
const flightMenu = document.getElementById("flightMenu");

if (menuButton && flightMenu) {
  menuButton.addEventListener("click", () => {
    flightMenu.classList.toggle("hidden");
  });
}

// ==========================================
// RESIZE
// ==========================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// LOOP PRINCIPAL
// ==========================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updateFlight(delta);
  updateCamera();

  renderer.render(scene, camera);
}

updateCamera();
animate();

if (loadingScreen) {
  loadingScreen.classList.add("hidden");
}

console.log("SKYFORGE FLIGHT iniciado com sucesso!");
