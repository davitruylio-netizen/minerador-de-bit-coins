
/* =========================================================
   SKYFORGE FLIGHT — MOTOR PRINCIPAL
   Three.js | Simulador 3D para navegador
   ========================================================= */

const $ = (id) => document.getElementById(id);

const ui = {
  scene: $("flightScene"),
  startScreen: $("startScreen"),
  flightMenu: $("flightMenu"),
  startButton: $("startButton"),
  cameraButton: $("cameraButton"),
  menuButton: $("menuButton"),
  closeMenu: $("closeMenu"),
  returnHangar: $("returnHangar"),
  resumeFlight: $("resumeFlight"),
  speed: $("speed"),
  altitude: $("altitude"),
  verticalSpeed: $("verticalSpeed"),
  enginePower: $("enginePower"),
  statusText: $("statusText"),
  touchLeft: $("touchLeft"),
  touchRight: $("touchRight"),
  touchUp: $("touchUp"),
  touchDown: $("touchDown"),
  touchThrottleUp: $("touchThrottleUp"),
  touchThrottleDown: $("touchThrottleDown")
};

let THREE;
let scene;
let camera;
let renderer;
let clock;
let aircraft;
let clouds = [];
let engineFans = [];
let cameraMode = 0;
let started = false;
let paused = false;
let animationFrame = null;

const keys = Object.create(null);

const touch = {
  left: false,
  right: false,
  up: false,
  down: false,
  throttleUp: false,
  throttleDown: false
};

const flight = {
  speed: 0,
  throttle: 0,
  altitude: 3.2,
  verticalSpeed: 0,
  pitch: 0,
  roll: 0,
  yaw: 0,
  onGround: true
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

function material(color, roughness = 0.7, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

function box(parent, name, x, y, z, sx, sy, sz, mat) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    mat
  );

  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  return mesh;
}

function sphere(parent, x, y, z, sx, sy, sz, mat) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    mat
  );

  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  parent.add(mesh);

  return mesh;
}

function cylinder(parent, x, y, z, radius, height, mat, segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    mat
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  return mesh;
}

/* =========================================================
   CENA E ILUMINAÇÃO
   ========================================================= */

function createWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8bbbd8);
  scene.fog = new THREE.Fog(0x9bbbd0, 1200, 7200);

  const width = Math.max(ui.scene.clientWidth, 1);
  const height = Math.max(ui.scene.clientHeight, 1);

  camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 15000);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.zIndex = "0";

  ui.scene.prepend(renderer.domElement);

  clock = new THREE.Clock();

  const ambient = new THREE.HemisphereLight(
    0xdcefff,
    0x4a5b42,
    2.1
  );

  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffedcf, 3);
  sun.position.set(-900, 1500, 700);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -1800;
  sun.shadow.camera.right = 1800;
  sun.shadow.camera.top = 1800;
  sun.shadow.camera.bottom = -1800;
  sun.shadow.camera.far = 5000;

  scene.add(sun);

  createTerrain();
  createAirport();
  createAircraft();
  createClouds();

  camera.position.set(0, 20, 65);
  camera.lookAt(0, 3, 0);
}

/* =========================================================
   TERRENO
   ========================================================= */

function createTerrain() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14000, 14000),
    material(0x536f4d, 1)
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.8;
  ground.receiveShadow = true;
  scene.add(ground);

  const mountainMat = material(0x526d61, 1);

  for (let i = 0; i < 40; i++) {
    const angle = i / 40 * Math.PI * 2;
    const distance = 2700 + Math.random() * 1700;
    const height = 200 + Math.random() * 650;
    const radius = 400 + Math.random() * 600;

    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 6),
      mountainMat
    );

    mountain.position.set(
      Math.cos(angle) * distance,
      height / 2,
      Math.sin(angle) * distance
    );

    mountain.rotation.y = Math.random() * Math.PI;
    mountain.castShadow = true;
    scene.add(mountain);
  }

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(5000, 5000),
    material(0x4689a4, 0.3, 0.12)
  );

  water.rotation.x = -Math.PI / 2;
  water.position.set(4500, -0.65, -2400);
  scene.add(water);

  // Vegetação distante.
  const treeMat = material(0x31553b);
  const trunkMat = material(0x60462e);

  for (let i = 0; i < 75; i++) {
    const x = (Math.random() > 0.5 ? 1 : -1) *
      (350 + Math.random() * 1200);
    const z = -1000 + Math.random() * 2200;
    const h = 10 + Math.random() * 12;

    cylinder(scene, x, h * 0.2, z, 0.8, h * 0.4, trunkMat, 7);

    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(4 + Math.random() * 3, h, 8),
      treeMat
    );

    tree.position.set(x, h * 0.7, z);
    tree.castShadow = true;
    scene.add(tree);
  }
}

/* =========================================================
   AEROPORTO
   ========================================================= */

function createAirport() {
  const airport = new THREE.Group();
  scene.add(airport);

  const asphalt = material(0x30373c, 0.95);
  const concrete = material(0x858d91, 0.95);
  const white = material(0xf4f2e9);
  const yellow = material(0xf3c34b);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x8bbbd0,
    metalness: 0.45,
    roughness: 0.18
  });

  // Pista.
  box(airport, "Runway", 0, -0.42, -550, 100, 0.35, 2100, asphalt);

  for (const x of [-47, 47]) {
    box(airport, "Runway edge", x, -0.20, -550, 1, 0.08, 2100, white);
  }

  for (let z = -1550; z < 500; z += 70) {
    box(airport, "Center line", 0, -0.19, z, 1.4, 0.08, 35, white);
  }

  for (const z of [-1500, 400]) {
    for (let x = -30; x <= 30; x += 10) {
      box(airport, "Runway marking", x, -0.18, z, 2.2, 0.08, 36, white);
    }
  }

  // Taxiway e pátio.
  box(airport, "Taxiway", 105, -0.42, -500, 65, 0.28, 1700, asphalt);
  box(airport, "Apron", 260, -0.39, -330, 340, 0.3, 620, concrete);

  for (let z = -1300; z < 300; z += 70) {
    for (const x of [-56, 56]) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x9bd9ff })
      );

      light.position.set(x, 1, z);
      airport.add(light);
    }
  }

  // Hangar.
  box(airport, "Hangar floor", 260, 0.2, -520, 300, 0.3, 180, concrete);
  box(airport, "Hangar rear wall", 260, 28, -610, 300, 56, 8, material(0x7b858a));
  box(airport, "Hangar left wall", 110, 28, -520, 8, 56, 180, material(0x879197));
  box(airport, "Hangar right wall", 410, 28, -520, 8, 56, 180, material(0x879197));
  box(airport, "Hangar roof", 260, 57, -520, 310, 5, 190, material(0x4a5963));

  for (let x = 140; x <= 380; x += 40) {
    box(airport, "Hangar glass", x, 24, -425, 30, 42, 1.5, glass);
  }

  // Terminal.
  box(airport, "Terminal body", 500, 12, -120, 210, 24, 300, material(0x9da9ad));
  box(airport, "Terminal roof", 500, 25, -120, 220, 3, 310, material(0x394b56));

  for (let x = 405; x <= 595; x += 25) {
    box(airport, "Terminal window", x, 13, 33, 18, 17, 1.2, glass);
  }

  // Torres de iluminação.
  for (const x of [-170, 170, 420, 650]) {
    cylinder(airport, x, 22, -360, 0.8, 44, material(0x737d80), 10);
    box(airport, "Light housing", x, 44, -360, 7, 2, 4, material(0x30383b));

    const light = new THREE.PointLight(0xffe6b0, 0.7, 130);
    light.position.set(x, 44, -360);
    airport.add(light);
  }

  for (let i = 0; i < 5; i++) {
    box(
      airport,
      "Apron line",
      260,
      -0.18,
      -540 + i * 100,
      2,
      0.06,
      70,
      yellow
    );
  }

  box(airport, "Service building", -220, 8, -650, 90, 16, 110, material(0x78858a));
  box(airport, "Service roof", -220, 17, -650, 96, 3, 116, material(0x3d4a50));
}

/* =========================================================
   AVIÃO COMERCIAL
   ========================================================= */

function createAircraft() {
  aircraft = new THREE.Group();
  aircraft.position.set(0, 3.2, 250);
  aircraft.rotation.order = "YXZ";
  scene.add(aircraft);

  const white = material(0xe5e9ec, 0.38, 0.25);
  const metal = material(0x929da4, 0.35, 0.65);
  const dark = material(0x28343d, 0.4, 0.2);
  const blue = material(0x1976a5, 0.35, 0.25);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x183d55,
    metalness: 0.55,
    roughness: 0.18
  });

  // Fuselagem.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.6, 43, 24),
    white
  );

  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  aircraft.add(body);

  sphere(aircraft, 0, 0, -22, 3.05, 3.05, 5.5, white);

  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 3.1, 8, 20),
    white
  );

  tail.rotation.x = Math.PI / 2;
  tail.position.z = 22;
  aircraft.add(tail);

  box(aircraft, "Blue fuselage stripe", 0, -2.2, 0, 5.5, 0.55, 36, blue);

  // Asas.
  box(aircraft, "Main wing", 0, -0.1, -2, 66, 1.1, 10, white);

  for (const side of [-1, 1]) {
    const tip = box(aircraft, "Wing tip", side * 33, 0.3, -2, 2.2, 1.4, 7, blue);
    tip.rotation.z = side * -0.08;
  }

  box(aircraft, "Horizontal stabilizer", 0, 1.2, 20, 25, 0.7, 6, white);
  box(aircraft, "Vertical stabilizer", 0, 5.2, 20, 1.1, 9, 6, blue);

  // Motores.
  for (const side of [-1, 1]) {
    const engine = new THREE.Group();
    engine.position.set(side * 17, -2.5, -3);
    aircraft.add(engine);

    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.8, 8.5, 20),
      metal
    );

    casing.rotation.x = Math.PI / 2;
    engine.add(casing);

    const intake = new THREE.Mesh(
      new THREE.CylinderGeometry(2.45, 2.45, 0.4, 24),
      dark
    );

    intake.rotation.x = Math.PI / 2;
    intake.position.z = -4.2;
    engine.add(intake);

    const fan = new THREE.Group();
    fan.position.z = -4.45;
    engine.add(fan);

    sphere(fan, 0, 0, 0, 0.65, 0.65, 0.45, metal);

    for (let i = 0; i < 10; i++) {
      const angle = i / 10 * Math.PI * 2;
      const blade = box(
        fan,
        "Fan blade",
        Math.cos(angle) * 1.2,
        Math.sin(angle) * 1.2,
        0,
        0.35,
        1.9,
        0.18,
        metal
      );

      blade.rotation.z = angle;
    }

    engineFans.push(fan);
  }

  // Janelas da cabine.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const z = -12 + i * 2.6;
      const windowMesh = box(
        aircraft,
        "Passenger window",
        side * 3.05,
        0.8,
        z,
        0.12,
        1.15,
        1.6,
        glass
      );

      windowMesh.rotation.z = side * 0.04;
    }

    const cockpitWindow = box(
      aircraft,
      "Cockpit side window",
      side * 2.4,
      1.7,
      -18.5,
      0.3,
      1.5,
      3.5,
      glass
    );

    cockpitWindow.rotation.y = side * 0.18;
  }

  const windshield = box(
    aircraft,
    "Front windshield",
    0,
    2,
    -22.3,
    4.5,
    1.8,
    0.35,
    glass
  );

  windshield.rotation.x = -0.12;

  // Trem de pouso.
  const wheelMat = material(0x171b20, 0.9);

  function landingGear(x, z, count) {
    const gear = new THREE.Group();
    gear.position.set(x, -2.4, z);
    aircraft.add(gear);

    cylinder(gear, 0, -1.2, 0, 0.28, 2.4, metal, 10);

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 1.2;

      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.55, 16),
        wheelMat
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(offset, -2.4, 0);
      gear.add(wheel);
    }
  }

  landingGear(0, -15, 2);
  landingGear(-8, 3, 2);
  landingGear(8, 3, 2);

  // Luzes.
  const red = new THREE.PointLight(0xff2424, 1.5, 35);
  red.position.set(-34, 0.5, -2);
  aircraft.add(red);

  const green = new THREE.PointLight(0x24ff8a, 1.5, 35);
  green.position.set(34, 0.5, -2);
  aircraft.add(green);

  const beacon = new THREE.PointLight(0xff2525, 1, 20);
  beacon.position.set(0, 6, 2);
  aircraft.add(beacon);
}

/* =========================================================
   NUVENS
   ========================================================= */

function createClouds() {
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: 0.88
  });

  for (let i = 0; i < 45; i++) {
    const cloud = new THREE.Group();

    cloud.position.set(
      (Math.random() - 0.5) * 6500,
      180 + Math.random() * 650,
      (Math.random() - 0.5) * 7000
    );

    for (let p = 0; p < 5 + Math.floor(Math.random() * 4); p++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 8),
        cloudMaterial
      );

      const scale = 12 + Math.random() * 25;
      puff.scale.set(scale * 1.5, scale * 0.55, scale);

      puff.position.set(
        (Math.random() - 0.5) * 55,
        Math.random() * 12,
        (Math.random() - 0.5) * 35
      );

      cloud.add(puff);
    }

    cloud.userData.speed = 1.5 + Math.random() * 3;
    scene.add(cloud);
    clouds.push(cloud);
  }
}

/* =========================================================
   CONTROLES E FÍSICA
   ========================================================= */

function input(name, keyboard) {
  return keyboard.some((key) => keys[key]) || touch[name];
}

function updateFlight(dt) {
  if (!started || paused) return;

  const left = input("left", ["ArrowLeft", "a", "A"]);
  const right = input("right", ["ArrowRight", "d", "D"]);
  const up = input("up", ["ArrowUp", "w", "W"]);
  const down = input("down", ["ArrowDown", "s", "S"]);
  const throttleUp = input("throttleUp", ["Shift"]);
  const throttleDown = input("throttleDown", ["Control"]);

  if (throttleUp) flight.throttle += dt * 0.32;
  if (throttleDown) flight.throttle -= dt * 0.38;

  flight.throttle = clamp(flight.throttle, 0, 1);

  const thrust = flight.throttle * 48;
  const drag = 0.018 * flight.speed * flight.speed;

  flight.speed = Math.max(
    0,
    flight.speed + (thrust - drag) * dt
  );

  const targetRoll = (left ? 0.55 : 0) + (right ? -0.55 : 0);
  flight.roll = lerp(flight.roll, targetRoll, dt * 1.8);

  const canPitch = !flight.onGround || flight.speed > 48;

  const targetPitch = canPitch
    ? (up ? 0.24 : 0) + (down ? -0.2 : 0)
    : 0;

  flight.pitch = lerp(flight.pitch, targetPitch, dt * 1.25);

  flight.yaw += -flight.roll * clamp(flight.speed / 95, 0, 1.2) * dt * 0.72;

  const speedFactor = clamp(flight.speed / 75, 0, 1.5);
  const lift = speedFactor * speedFactor * 12;
  const gravity = 9.81;

  if (flight.onGround) {
    flight.verticalSpeed = 0;
    flight.altitude = 3.2;

    if (flight.speed > 62 && flight.pitch > 0.055) {
      flight.onGround = false;
      flight.verticalSpeed = 5;
    }
  } else {
    flight.verticalSpeed += (lift - gravity) * dt;
    flight.verticalSpeed += Math.sin(flight.pitch) * flight.speed * 0.16 * dt;
    flight.verticalSpeed = clamp(flight.verticalSpeed, -35, 28);

    flight.altitude += flight.verticalSpeed * dt;

    if (flight.altitude <= 3.2) {
      flight.altitude = 3.2;
      flight.verticalSpeed = 0;
      flight.onGround = true;
      flight.pitch = Math.min(flight.pitch, 0);
      flight.speed *= 0.96;
    }
  }

  aircraft.rotation.set(flight.pitch, flight.yaw, flight.roll, "YXZ");

  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(aircraft.quaternion);

  aircraft.position.addScaledVector(forward, flight.speed * dt);
  aircraft.position.y = flight.altitude;

  for (const fan of engineFans) {
    fan.rotation.z += dt * (5 + flight.throttle * 45);
  }

  updateHUD();
}

function updateHUD() {
  const speed = Math.round(flight.speed * 3.6);
  const altitude = Math.max(0, Math.round(flight.altitude * 3.28084));
  const vertical = Math.round(flight.verticalSpeed * 196.85);

  if (ui.speed) ui.speed.textContent = String(speed);
  if (ui.altitude) ui.altitude.textContent = altitude.toLocaleString("pt-BR");
  if (ui.verticalSpeed) ui.verticalSpeed.textContent = vertical.toLocaleString("pt-BR");
  if (ui.enginePower) ui.enginePower.textContent = `${Math.round(flight.throttle * 100)}%`;

  let status = "EM VOO";

  if (flight.onGround && flight.speed < 2) status = "AERONAVE NO SOLO";
  else if (flight.onGround && flight.speed < 45) status = "TAXI / ACELERAÇÃO";
  else if (flight.onGround) status = "CORRIDA DE DECOLAGEM";
  else if (flight.altitude < 20) status = "APROXIMAÇÃO / POUSO";

  if (ui.statusText) ui.statusText.textContent = status;
}

/* =========================================================
   CÂMERAS
   ========================================================= */

function updateCamera(dt) {
  const forward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(aircraft.quaternion);

  const desired = new THREE.Vector3();
  const target = aircraft.position.clone();

  if (cameraMode === 0) {
    desired.copy(aircraft.position)
      .addScaledVector(forward, -68)
      .add(new THREE.Vector3(0, 23, 0));

    target.addScaledVector(forward, 28);
    target.y += 5;
  } else if (cameraMode === 1) {
    const side = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(aircraft.quaternion);

    desired.copy(aircraft.position)
      .addScaledVector(side, 75);

    desired.y += 12;
  } else if (cameraMode === 2) {
    desired.copy(aircraft.position)
      .addScaledVector(forward, -13);

    desired.y += 2.3;
    target.addScaledVector(forward, 120);
    target.y += 2;
  } else {
    const angle = performance.now() * 0.00012;

    desired.set(
      aircraft.position.x + Math.sin(angle) * 100,
      aircraft.position.y + 35,
      aircraft.position.z + Math.cos(angle) * 100
    );
  }

  const smoothing = 1 - Math.pow(0.001, dt);
  camera.position.lerp(desired, smoothing);
  camera.lookAt(target);
}

/* =========================================================
   ATUALIZAÇÃO DO MUNDO
   ========================================================= */

function updateWorld(dt) {
  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * dt;

    if (cloud.position.x > 3800) {
      cloud.position.x = -3800;
    }
  }
}

function animate() {
  animationFrame = requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  if (!paused) {
    updateFlight(dt);
    updateWorld(dt);
    updateCamera(dt);
  }

  renderer.render(scene, camera);
}

/* =========================================================
   MENU E ESTADO DO JOGO
   ========================================================= */

function startFlight() {
  started = true;
  paused = false;

  if (ui.startScreen) ui.startScreen.classList.add("hidden");
  if (ui.flightMenu) ui.flightMenu.classList.add("hidden");

  flight.throttle = 0.12;
  updateHUD();
}

function openMenu() {
  if (!started) return;

  paused = true;

  if (ui.flightMenu) {
    ui.flightMenu.classList.remove("hidden");
  }
}

function closeMenu() {
  paused = false;

  if (ui.flightMenu) {
    ui.flightMenu.classList.add("hidden");
  }
}

function resetFlight() {
  flight.speed = 0;
  flight.throttle = 0;
  flight.altitude = 3.2;
  flight.verticalSpeed = 0;
  flight.pitch = 0;
  flight.roll = 0;
  flight.yaw = 0;
  flight.onGround = true;

  aircraft.position.set(0, 3.2, 250);
  aircraft.rotation.set(0, 0, 0, "YXZ");

  cameraMode = 0;
  updateHUD();
}

function returnToHangar() {
  resetFlight();
  started = false;
  paused = false;

  if (ui.flightMenu) ui.flightMenu.classList.add("hidden");
  if (ui.startScreen) ui.startScreen.classList.remove("hidden");
}

function changeCamera() {
  cameraMode = (cameraMode + 1) % 4;

  const names = [
    "CÂMERA EXTERNA",
    "CÂMERA LATERAL",
    "COCKPIT",
    "CÂMERA CINEMATOGRÁFICA"
  ];

  if (ui.cameraButton) {
    ui.cameraButton.textContent = names[cameraMode];
  }
}

/* =========================================================
   ENTRADAS DE TECLADO E TOQUE
   ========================================================= */

function bindTouchButton(element, property) {
  if (!element) return;

  const press = (event) => {
    event.preventDefault();
    touch[property] = true;
  };

  const release = (event) => {
    if (event) event.preventDefault();
    touch[property] = false;
  };

  element.addEventListener("pointerdown", press);
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  element.addEventListener("lostpointercapture", release);
  element.addEventListener("contextmenu", (event) => event.preventDefault());
}

function bindControls() {
  window.addEventListener("keydown", (event) => {
    keys[event.key] = true;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === "Escape" && started) {
      if (paused) closeMenu();
      else openMenu();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys[event.key] = false;
  });

  window.addEventListener("blur", () => {
    Object.keys(keys).forEach((key) => keys[key] = false);
    Object.keys(touch).forEach((key) => touch[key] = false);
  });

  bindTouchButton(ui.touchLeft, "left");
  bindTouchButton(ui.touchRight, "right");
  bindTouchButton(ui.touchUp, "up");
  bindTouchButton(ui.touchDown, "down");
  bindTouchButton(ui.touchThrottleUp, "throttleUp");
  bindTouchButton(ui.touchThrottleDown, "throttleDown");

  ui.startButton?.addEventListener("click", startFlight);
  ui.cameraButton?.addEventListener("click", changeCamera);
  ui.menuButton?.addEventListener("click", openMenu);
  ui.closeMenu?.addEventListener("click", closeMenu);
  ui.resumeFlight?.addEventListener("click", closeMenu);
  ui.returnHangar?.addEventListener("click", returnToHangar);

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => {
    setTimeout(resize, 250);
  });
}

function resize() {
  if (!renderer || !camera || !ui.scene) return;

  const width = ui.scene.clientWidth;
  const height = ui.scene.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/* =========================================================
   INICIALIZAÇÃO DIRETA — SEM TELA DE CARREGAMENTO
   ========================================================= */

async function initialize() {
  try {
    // Remove qualquer tela antiga de carregamento que ainda exista no HTML.
    $("loading")?.remove();

    if (!ui.scene) {
      throw new Error("O elemento flightScene não foi encontrado no HTML.");
    }

    THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
    );

    createWorld();
    bindControls();
    resize();
    updateHUD();

    renderer.render(scene, camera);
    animate();

  } catch (error) {
    console.error("SKYFORGE FLIGHT:", error);

    const message = document.createElement("div");
    message.style.cssText = `
      position:absolute;
      inset:20px;
      z-index:9999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      text-align:center;
      color:white;
      background:#101a25;
      font:16px Arial,sans-serif;
      border-radius:12px;
    `;

    message.textContent =
      "Não foi possível iniciar o SKYFORGE FLIGHT. Verifique a conexão com a internet e tente atualizar a página.";

    document.body.appendChild(message);
  }
}

initialize();
