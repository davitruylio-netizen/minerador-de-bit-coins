
const loading = document.getElementById("loading");
const loadingMessage = document.getElementById("loadingMessage");

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
let aircraftParts = {};
let airport;
let clouds = [];
let cameraMode = 0;
let started = false;
let paused = false;
let animationFrame = null;

const keys = {};
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
  altitude: 10,
  verticalSpeed: 0,
  pitch: 0,
  roll: 0,
  yaw: 0,
  onGround: true,
  crashed: false
};

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const lerp = (a, b, t) => a + (b - a) * t;

function setLoadingMessage(message) {
  if (loadingMessage) loadingMessage.textContent = message;
}

function hideLoading() {
  if (loading) {
    loading.classList.add("hidden");
    loading.setAttribute("aria-hidden", "true");
  }
}

function showLoadingError(message) {
  if (loading) {
    loading.classList.remove("hidden");
    loading.style.display = "grid";
  }
  setLoadingMessage(message);
}

function createMaterial(color, roughness = 0.65, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

function addBox(parent, name, position, size, material, rotation = null) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material
  );

  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);

  if (rotation) {
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, position, radiusTop, radiusBottom, height, material, segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material
  );

  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, position, scale, material, segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, segments, segments),
    material
  );

  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8bb8d8);
  scene.fog = new THREE.Fog(0x9bbbd0, 900, 6500);

  camera = new THREE.PerspectiveCamera(
    62,
    ui.scene.clientWidth / Math.max(ui.scene.clientHeight, 1),
    0.1,
    14000
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(ui.scene.clientWidth, ui.scene.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  ui.scene.prepend(renderer.domElement);

  clock = new THREE.Clock();

  const hemisphere = new THREE.HemisphereLight(0xd9edff, 0x53634a, 2.0);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff1d6, 3.1);
  sun.position.set(-900, 1400, 700);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -1800;
  sun.shadow.camera.right = 1800;
  sun.shadow.camera.top = 1800;
  sun.shadow.camera.bottom = -1800;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 5000;
  scene.add(sun);

  createEnvironment();
  createAirport();
  createAircraft();
  createClouds();

  camera.position.set(0, 18, 55);
  camera.lookAt(0, 4, -30);
}

function createEnvironment() {
  const groundMaterial = createMaterial(0x536d49, 1);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14000, 14000),
    groundMaterial
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.7;
  ground.receiveShadow = true;
  scene.add(ground);

  const distantGreen = createMaterial(0x526d58, 1);

  for (let i = 0; i < 34; i++) {
    const angle = (i / 34) * Math.PI * 2;
    const distance = 2600 + Math.random() * 1800;
    const width = 450 + Math.random() * 900;
    const height = 180 + Math.random() * 650;

    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(width, height, 5 + Math.floor(Math.random() * 3)),
      distantGreen
    );

    mountain.position.set(
      Math.cos(angle) * distance,
      height / 2 - 5,
      Math.sin(angle) * distance
    );

    mountain.rotation.y = Math.random() * Math.PI;
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    scene.add(mountain);
  }

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b91a8,
    roughness: 0.28,
    metalness: 0.12
  });

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(5000, 5000),
    waterMaterial
  );

  water.rotation.x = -Math.PI / 2;
  water.position.set(4300, -0.62, -2200);
  scene.add(water);

  // Áreas verdes e caminhos ao redor do aeroporto.
  const roadMaterial = createMaterial(0x343b3e, 0.95);
  addBox(scene, "Airport access road", [0, -0.53, 780], [850, 0.12, 24], roadMaterial);

  const treeMaterials = [
    createMaterial(0x284b35),
    createMaterial(0x365b3c),
    createMaterial(0x456b42)
  ];

  for (let i = 0; i < 90; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (300 + Math.random() * 1100);
    const z = -900 + Math.random() * 2200;
    const height = 8 + Math.random() * 15;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.1, height * 0.45, 7),
      createMaterial(0x59422e)
    );

    trunk.position.set(x, height * 0.22, z);
    scene.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(4 + Math.random() * 3, height, 8),
      treeMaterials[i % treeMaterials.length]
    );

    crown.position.set(x, height * 0.75, z);
    crown.castShadow = true;
    scene.add(crown);
  }
}

function createAirport() {
  airport = new THREE.Group();
  scene.add(airport);

  const asphalt = createMaterial(0x30373d, 0.94);
  const concrete = createMaterial(0x858b8d, 0.92);
  const white = createMaterial(0xf1f0e8, 0.65);
  const yellow = createMaterial(0xf4c64e, 0.65);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x8bbbd0,
    metalness: 0.45,
    roughness: 0.18
  });

  // Pista principal.
  addBox(airport, "Runway", [0, -0.42, -550], [100, 0.35, 2100], asphalt);

  // Bordas da pista.
  for (const x of [-47, 47]) {
    addBox(airport, "Runway edge", [x, -0.22, -550], [1.1, 0.08, 2100], white);
  }

  // Linha central tracejada.
  for (let z = -1550; z < 500; z += 70) {
    addBox(airport, "Runway center line", [0, -0.20, z], [1.2, 0.08, 35], white);
  }

  // Marcas de cabeceira.
  for (const z of [-1500, 400]) {
    for (let x = -30; x <= 30; x += 10) {
      addBox(airport, "Runway threshold marking", [x, -0.19, z], [2.2, 0.08, 36], white);
    }
  }

  // Taxiway e pátio.
  addBox(airport, "Taxiway", [105, -0.42, -500], [65, 0.28, 1700], asphalt);
  addBox(airport, "Apron", [260, -0.39, -330], [340, 0.3, 620], concrete);

  for (let z = -1300; z < 300; z += 70) {
    for (const x of [-56, 56]) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x9bd9ff })
      );
      light.position.set(x, 1.1, z);
      airport.add(light);
    }
  }

  // Hangar principal.
  const hangar = new THREE.Group();
  airport.add(hangar);

  addBox(hangar, "Hangar floor", [260, 0.2, -520], [300, 0.3, 180], concrete);
  addBox(hangar, "Hangar rear wall", [260, 28, -610], [300, 56, 8], createMaterial(0x7b858a));
  addBox(hangar, "Hangar left wall", [110, 28, -520], [8, 56, 180], createMaterial(0x879197));
  addBox(hangar, "Hangar right wall", [410, 28, -520], [8, 56, 180], createMaterial(0x879197));
  addBox(hangar, "Hangar roof", [260, 57, -520], [310, 5, 190], createMaterial(0x4a5963));

  for (let x = 140; x <= 380; x += 40) {
    addBox(hangar, "Hangar glass panel", [x, 24, -425], [30, 42, 1.5], glass);
  }

  // Terminal simplificado, com fachada envidraçada.
  const terminal = new THREE.Group();
  airport.add(terminal);

  addBox(terminal, "Terminal base", [500, 12, -120], [210, 24, 300], createMaterial(0x9da9ad));
  addBox(terminal, "Terminal roof", [500, 25, -120], [220, 3, 310], createMaterial(0x394b56));

  for (let x = 405; x <= 595; x += 25) {
    addBox(terminal, "Terminal windows", [x, 13, 33], [18, 17, 1.2], glass);
  }

  // Torres de iluminação.
  for (const x of [-170, 170, 420, 650]) {
    const pole = addCylinder(airport, [x, 22, -360], 0.8, 1.1, 44, createMaterial(0x737d80), 10);
    pole.castShadow = true;

    const lamp = new THREE.PointLight(0xffe6b0, 0.6, 130);
    lamp.position.set(x, 44, -360);
    airport.add(lamp);

    addBox(airport, "Lamp housing", [x, 44, -360], [7, 2, 4], createMaterial(0x30383b));
  }

  // Placas e marcações do pátio.
  for (let i = 0; i < 5; i++) {
    const z = -540 + i * 100;
    addBox(airport, "Apron yellow line", [260, -0.18, z], [2, 0.06, 70], yellow);
  }

  // Pequenas construções de apoio.
  addBox(airport, "Service building", [-220, 8, -650], [90, 16, 110], createMaterial(0x78858a));
  addBox(airport, "Service building roof", [-220, 17, -650], [96, 3, 116], createMaterial(0x3d4a50));
}

function createAircraft() {
  aircraft = new THREE.Group();
  aircraft.position.set(0, 3.2, 250);
  aircraft.rotation.order = "YXZ";
  scene.add(aircraft);

  const fuselage = createMaterial(0xe5e9ec, 0.38, 0.25);
  const belly = createMaterial(0x89949c, 0.5, 0.2);
  const wingMaterial = createMaterial(0xd5dce0, 0.38, 0.25);
  const dark = createMaterial(0x28343d, 0.4, 0.2);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x183d55,
    metalness: 0.55,
    roughness: 0.18
  });
  const accent = createMaterial(0x1976a5, 0.35, 0.25);

  // Fuselagem alongada.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.6, 43, 24, 1, false),
    fuselage
  );

  body.rotation.x = Math.PI / 2;
  body.position.z = 0;
  body.castShadow = true;
  body.receiveShadow = true;
  aircraft.add(body);

  // Nariz arredondado.
  const nose = addSphere(aircraft, [0, 0, -22], [3.05, 3.05, 5.5], fuselage, 20);
  nose.name = "Aircraft nose";

  // Cauda traseira.
  const tailCone = addCylinder(aircraft, [0, 0, 22], 0.7, 3.1, 8, fuselage, 20);
  tailCone.rotation.x = Math.PI / 2;

  // Faixa inferior.
  const bellyStripe = addBox(aircraft, "Lower fuselage stripe", [0, -2.2, 0], [5.5, 0.55, 36], accent);
  bellyStripe.rotation.x = 0;

  // Asas principais.
  const wing = addBox(aircraft, "Main wing", [0, -0.1, -2], [66, 1.1, 10], wingMaterial);
  wing.rotation.z = 0;
  wing.rotation.y = 0.025;

  // Pontas das asas.
  for (const side of [-1, 1]) {
    const wingTip = addBox(
      aircraft,
      "Wing tip",
      [side * 33, 0.3, -2],
      [2.2, 1.4, 7],
      accent
    );
    wingTip.rotation.z = side * -0.08;
  }

  // Profundores e estabilizador vertical.
  addBox(aircraft, "Horizontal tail", [0, 1.2, 20], [25, 0.7, 6], wingMaterial);
  addBox(aircraft, "Vertical tail", [0, 5.2, 20], [1.1, 9, 6], accent);

  // Motores sob as asas.
  const engines = [];

  for (const side of [-1, 1]) {
    const engine = new THREE.Group();
    engine.position.set(side * 17, -2.5, -3);
    aircraft.add(engine);

    const casing = addCylinder(engine, [0, 0, 0], 2.6, 2.8, 8.5, belly, 20);
    casing.rotation.x = Math.PI / 2;

    const intake = addCylinder(engine, [0, 0, -4.2], 2.45, 2.45, 0.4, dark, 24);
    intake.rotation.x = Math.PI / 2;

    const fan = new THREE.Group();
    fan.position.set(0, 0, -4.45);
    engine.add(fan);

    const hub = addSphere(fan, [0, 0, 0], [0.65, 0.65, 0.45], createMaterial(0x8d9aa2, 0.3, 0.7), 12);

    for (let blade = 0; blade < 10; blade++) {
      const angle = (blade / 10) * Math.PI * 2;
      const bladeMesh = addBox(
        fan,
        "Engine fan blade",
        [Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0],
        [0.35, 1.9, 0.18],
        createMaterial(0x9ba7ae, 0.3, 0.7)
      );
      bladeMesh.rotation.z = angle;
    }

    engines.push(fan);
  }

  aircraftParts.engines = engines;

  // Cockpit frontal e fileiras de janelas.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 11; i++) {
      const z = -12 + i * 2.6;
      const windowMesh = addBox(
        aircraft,
        "Passenger window",
        [side * 3.05, 0.8, z],
        [0.12, 1.15, 1.6],
        windowMaterial
      );
      windowMesh.rotation.z = side * 0.04;
    }
  }

  for (let side = -1; side <= 1; side += 2) {
    const cockpitWindow = addBox(
      aircraft,
      "Cockpit side window",
      [side * 2.4, 1.7, -18.5],
      [0.3, 1.5, 3.5],
      windowMaterial
    );
    cockpitWindow.rotation.y = side * 0.18;
  }

  // Para-brisa frontal.
  const windshield = addBox(
    aircraft,
    "Cockpit windshield",
    [0, 2.0, -22.3],
    [4.5, 1.8, 0.35],
    windowMaterial
  );
  windshield.rotation.x = -0.12;

  // Trem de pouso e rodas.
  const wheelMaterial = createMaterial(0x171b20, 0.9);
  const metal = createMaterial(0x929da4, 0.35, 0.65);

  function addLandingGear(x, z, wheelCount = 1) {
    const gear = new THREE.Group();
    gear.position.set(x, -2.4, z);
    aircraft.add(gear);

    addCylinder(gear, [0, -1.2, 0], 0.28, 0.28, 2.4, metal, 10);

    for (let i = 0; i < wheelCount; i++) {
      const offset = (i - (wheelCount - 1) / 2) * 1.2;
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.55, 16),
        wheelMaterial
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(offset, -2.4, 0);
      wheel.castShadow = true;
      gear.add(wheel);
    }
  }

  addLandingGear(0, -15, 2);
  addLandingGear(-8, 3, 2);
  addLandingGear(8, 3, 2);

  // Luzes de navegação.
  const redLight = new THREE.PointLight(0xff2424, 1.5, 35);
  redLight.position.set(-34, 0.5, -2);
  aircraft.add(redLight);

  const greenLight = new THREE.PointLight(0x24ff8a, 1.5, 35);
  greenLight.position.set(34, 0.5, -2);
  aircraft.add(greenLight);

  const beacon = new THREE.PointLight(0xff2525, 1.0, 20);
  beacon.position.set(0, 6, 2);
  aircraft.add(beacon);

  aircraftParts.beacon = beacon;
}

function createClouds() {
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: 0.88
  });

  for (let i = 0; i < 45; i++) {
    const cloud = new THREE.Group();

    const x = (Math.random() - 0.5) * 6500;
    const y = 180 + Math.random() * 650;
    const z = (Math.random() - 0.5) * 7000;

    const puffCount = 4 + Math.floor(Math.random() * 5);

    for (let p = 0; p < puffCount; p++) {
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

    cloud.position.set(x, y, z);
    cloud.userData.speed = 1.5 + Math.random() * 3;
    scene.add(cloud);
    clouds.push(cloud);
  }
}

function setStatus(message) {
  if (ui.statusText) ui.statusText.textContent = message;
}

function updateHUD() {
  const speedKmh = Math.round(flight.speed * 3.6);
  const altitudeFeet = Math.max(0, Math.round(flight.altitude * 3.28084));
  const verticalFeet = Math.round(flight.verticalSpeed * 196.85);

  if (ui.speed) ui.speed.textContent = String(speedKmh);
  if (ui.altitude) ui.altitude.textContent = altitudeFeet.toLocaleString("pt-BR");
  if (ui.verticalSpeed) ui.verticalSpeed.textContent = verticalFeet.toLocaleString("pt-BR");
  if (ui.enginePower) ui.enginePower.textContent = `${Math.round(flight.throttle * 100)}%`;

  if (flight.crashed) {
    setStatus("VOO INTERROMPIDO");
  } else if (flight.onGround && flight.speed < 2) {
    setStatus("AERONAVE NO SOLO");
  } else if (flight.onGround && flight.speed < 45) {
    setStatus("TAXI / ACELERAÇÃO");
  } else if (flight.onGround) {
    setStatus("CORRIDA DE DECOLAGEM");
  } else if (flight.altitude < 20) {
    setStatus("APROXIMAÇÃO / POUSO");
  } else {
    setStatus("EM VOO");
  }
}

function getInput(name, keyboardKeys) {
  return keyboardKeys.some((key) => keys[key]) || touch[name];
}

function updateFlight(delta) {
  if (!started || paused || flight.crashed) return;

  const dt = Math.min(delta, 0.05);

  const left = getInput("left", ["ArrowLeft", "a", "A"]);
  const right = getInput("right", ["ArrowRight", "d", "D"]);
  const up = getInput("up", ["ArrowUp", "w", "W"]);
  const down = getInput("down", ["ArrowDown", "s", "S"]);
  const throttleUp = getInput("throttleUp", ["Shift"]);
  const throttleDown = getInput("throttleDown", ["Control"]);

  if (throttleUp) flight.throttle += dt * 0.32;
  if (throttleDown) flight.throttle -= dt * 0.38;

  flight.throttle = clamp(flight.throttle, 0, 1);

  // Empuxo e resistência do ar.
  const thrust = flight.throttle * 48;
  const drag = 0.018 * flight.speed * flight.speed;
  const acceleration = thrust - drag;

  flight.speed = Math.max(0, flight.speed + acceleration * dt);

  // Resposta dos comandos.
  const targetRoll = (right ? -0.55 : 0) + (left ? 0.55 : 0);
  flight.roll = lerp(flight.roll, targetRoll, dt * 1.8);

  const canPitch = !flight.onGround || flight.speed > 48;
  const targetPitch = canPitch
    ? ((up ? 0.24 : 0) + (down ? -0.2 : 0))
    : 0;

  flight.pitch = lerp(flight.pitch, targetPitch, dt * 1.25);

  // Curva coordenada com inclinação das asas.
  const turnStrength = clamp(flight.speed / 95, 0, 1.2);
  flight.yaw += -flight.roll * turnStrength * dt * 0.72;

  // Sustentação simplificada.
  const speedFactor = clamp(flight.speed / 75, 0, 1.5);
  const lift = speedFactor * speedFactor * 12 * Math.max(0.1, Math.cos(flight.pitch));
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

  // Posição e orientação da aeronave.
  aircraft.rotation.set(flight.pitch, flight.yaw, flight.roll, "YXZ");

  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(aircraft.quaternion);

  aircraft.position.addScaledVector(forward, flight.speed * dt);
  aircraft.position.y = flight.altitude;

  // Animação das turbinas.
  for (const fan of aircraftParts.engines) {
    fan.rotation.z += dt * (5 + flight.throttle * 45);
  }

  if (aircraftParts.beacon) {
    aircraftParts.beacon.intensity = 0.7 + Math.abs(Math.sin(performance.now() * 0.006)) * 1.5;
  }

  // Limite de segurança da simulação.
  if (aircraft.position.y > 4500) {
    flight.verticalSpeed = Math.min(flight.verticalSpeed, 0);
  }

  updateHUD();
}

function updateClouds(delta) {
  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * delta;

    if (cloud.position.x > 3800) {
      cloud.position.x = -3800;
    }
  }
}

function updateCamera(delta) {
  if (!aircraft) return;

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(aircraft.quaternion);
  const up = new THREE.Vector3(0, 1, 0);

  let desiredPosition;
  let target;

  if (cameraMode === 0) {
    // Câmera externa de acompanhamento.
    desiredPosition = aircraft.position.clone()
      .addScaledVector(forward, -68)
      .add(new THREE.Vector3(0, 23, 0));

    target = aircraft.position.clone()
      .addScaledVector(forward, 28)
      .add(new THREE.Vector3(0, 5, 0));
  } else if (cameraMode === 1) {
    // Câmera lateral.
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(aircraft.quaternion);
    desiredPosition = aircraft.position.clone()
      .addScaledVector(side, 75)
      .add(new THREE.Vector3(0, 12, 0));

    target = aircraft.position.clone();
  } else if (cameraMode === 2) {
    // Cockpit.
    desiredPosition = aircraft.position.clone()
      .addScaledVector(forward, -13)
      .add(new THREE.Vector3(0, 2.3, 0));

    target = aircraft.position.clone()
      .addScaledVector(forward, 120)
      .add(new THREE.Vector3(0, 2, 0));
  } else {
    // Câmera distante cinematográfica.
    const orbitAngle = performance.now() * 0.00012;
    desiredPosition = aircraft.position.clone().add(
      new THREE.Vector3(
        Math.sin(orbitAngle) * 100,
        35,
        Math.cos(orbitAngle) * 100
      )
    );
    target = aircraft.position.clone();
  }

  const smooth = 1 - Math.pow(0.001, delta);
  camera.position.lerp(desiredPosition, smooth);
  camera.up.copy(up);
  camera.lookAt(target);
}

function animate() {
  animationFrame = requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (!paused) {
    updateFlight(delta);
    updateClouds(delta);
    updateCamera(delta);
  }

  renderer.render(scene, camera);
}

function resizeRenderer() {
  if (!renderer || !camera || !ui.scene) return;

  const width = ui.scene.clientWidth;
  const height = ui.scene.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
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
  flight.crashed = false;

  aircraft.position.set(0, 3.2, 250);
  aircraft.rotation.set(0, 0, 0, "YXZ");

  cameraMode = 0;
  updateHUD();
}

function startFlight() {
  if (flight.crashed) resetFlight();

  started = true;
  paused = false;

  if (ui.startScreen) ui.startScreen.classList.add("hidden");
  if (ui.flightMenu) ui.flightMenu.classList.add("hidden");

  // Potência inicial baixa para iniciar a operação.
  flight.throttle = 0.12;
  setStatus("AERONAVE PRONTA");
}

function openMenu() {
  if (!started) return;
  paused = true;
  if (ui.flightMenu) ui.flightMenu.classList.remove("hidden");
}

function closeMenu() {
  paused = false;
  if (ui.flightMenu) ui.flightMenu.classList.add("hidden");
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

function bindTouchButton(element, property) {
  if (!element) return;

  const press = (event) => {
    event.preventDefault();
    touch[property] = true;
    if (element.setPointerCapture && event.pointerId !== undefined) {
      try {
        element.setPointerCapture(event.pointerId);
      } catch (_) {}
    }
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

    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)
    ) {
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
    Object.keys(keys).forEach((key) => {
      keys[key] = false;
    });

    Object.keys(touch).forEach((key) => {
      touch[key] = false;
    });
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

  window.addEventListener("resize", resizeRenderer);
  window.addEventListener("orientationchange", () => {
    setTimeout(resizeRenderer, 250);
  });
}

async function initialize() {
  try {
    setLoadingMessage("CARREGANDO MOTOR GRÁFICO...");

    THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
    );

    setLoadingMessage("CONSTRUINDO O AEROPORTO...");

    createScene();

    setLoadingMessage("PREPARANDO A AERONAVE...");

    bindControls();
    resizeRenderer();
    updateHUD();

    renderer.render(scene, camera);

    requestAnimationFrame(() => {
      hideLoading();
      animate();
    });

  } catch (error) {
    console.error("Erro ao iniciar SKYFORGE FLIGHT:", error);

    showLoadingError(
      "Não foi possível carregar o simulador 3D. Verifique sua conexão e tente atualizar a página."
    );
  }
}

initialize();
