
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

/* ==========================================================
   SKYFORGE FLIGHT - FLIGHT ENGINE
   Versão: High Performance Flight
========================================================== */

const $ = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const random = (min, max) => min + Math.random() * (max - min);

const sceneContainer = $("flightScene");

const flight = {
    speed: 50,              // 180 km/h iniciais
    throttle: 1,

    altitude: 0,
    verticalSpeed: 0,

    pitch: 0,
    roll: 0,
    yaw: 0,

    onGround: true,
    started: false,
    paused: false,

    camera: 0
};

const keys = new Set();

const touch = {
    left: false,
    right: false,
    up: false,
    down: false,
    throttleUp: false,
    throttleDown: false
};

let scene;
let camera;
let renderer;
let aircraft;
let clock = new THREE.Clock();

let engineFans = [];
let clouds = [];
let cameraTarget = new THREE.Vector3();

const WORLD_UP = new THREE.Vector3(0, 1, 0);

/* ==========================================================
   MATERIAIS
========================================================== */

const materials = {
    grass: new THREE.MeshStandardMaterial({
        color: 0x536f43,
        roughness: 1
    }),

    asphalt: new THREE.MeshStandardMaterial({
        color: 0x292f37,
        roughness: 0.95
    }),

    concrete: new THREE.MeshStandardMaterial({
        color: 0x92979a,
        roughness: 0.9
    }),

    white: new THREE.MeshStandardMaterial({
        color: 0xf1f4f6,
        roughness: 0.4
    }),

    dark: new THREE.MeshStandardMaterial({
        color: 0x18222c,
        metalness: 0.65,
        roughness: 0.35
    }),

    glass: new THREE.MeshStandardMaterial({
        color: 0x183a50,
        metalness: 0.7,
        roughness: 0.16
    }),

    blue: new THREE.MeshStandardMaterial({
        color: 0x1265a8,
        metalness: 0.5,
        roughness: 0.3
    }),

    metal: new THREE.MeshStandardMaterial({
        color: 0xbac4cd,
        metalness: 0.8,
        roughness: 0.24
    }),

    rubber: new THREE.MeshStandardMaterial({
        color: 0x101317,
        roughness: 0.95
    })
};

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

function initialize() {

    $("loading")?.remove();

    if (!sceneContainer) {
        throw new Error("Elemento flightScene não encontrado.");
    }

    createScene();
    createLighting();
    createWorld();
    createAirport();

    aircraft = createAircraft();
    scene.add(aircraft);

    createClouds();
    createRenderer();
    createEvents();

    updateHUD();
    animate();

    setStatus("AERONAVE PRONTA — POTÊNCIA MÁXIMA");
}

/* ==========================================================
   CENA
========================================================== */

function createScene() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x83b9df);

    scene.fog = new THREE.FogExp2(
        0x9cc5df,
        0.000075
    );

    camera = new THREE.PerspectiveCamera(
        65,
        window.innerWidth / window.innerHeight,
        0.1,
        12000
    );

    camera.position.set(0, 13, 320);
}

/* ==========================================================
   ILUMINAÇÃO
========================================================== */

function createLighting() {

    scene.add(
        new THREE.HemisphereLight(
            0xd8efff,
            0x536344,
            2
        )
    );

    const sunlight = new THREE.DirectionalLight(
        0xfff2d7,
        3.2
    );

    sunlight.position.set(-450, 750, 350);
    sunlight.castShadow = true;

    sunlight.shadow.mapSize.set(2048, 2048);

    sunlight.shadow.camera.left = -700;
    sunlight.shadow.camera.right = 700;
    sunlight.shadow.camera.top = 700;
    sunlight.shadow.camera.bottom = -700;

    scene.add(sunlight);

    const fill = new THREE.DirectionalLight(
        0x83b9ff,
        0.6
    );

    fill.position.set(400, 200, -400);
    scene.add(fill);
}

/* ==========================================================
   GEOMETRIA
========================================================== */

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

function cylinder(parent, radiusTop, radiusBottom, length, material, x, y, z, rotationX = 0) {

    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
            radiusTop,
            radiusBottom,
            length,
            20
        ),
        material
    );

    mesh.position.set(x, y, z);
    mesh.rotation.x = rotationX;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);

    return mesh;
}

function sphere(parent, radius, material, x, y, z) {

    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        material
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;

    parent.add(mesh);

    return mesh;
}

/* ==========================================================
   MUNDO
========================================================== */

function createWorld() {

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10000, 10000),
        materials.grass
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;

    scene.add(ground);

    const water = new THREE.Mesh(
        new THREE.PlaneGeometry(10000, 1500),
        new THREE.MeshStandardMaterial({
            color: 0x3b7890,
            metalness: 0.25,
            roughness: 0.35
        })
    );

    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.8, -5500);

    scene.add(water);

    createMountains();
    createTrees();
}

function createMountains() {

    for (let i = 0; i < 38; i++) {

        const side = i % 2 === 0 ? -1 : 1;
        const height = random(100, 380);
        const radius = random(100, 280);

        const mountain = new THREE.Mesh(
            new THREE.ConeGeometry(radius, height, 7),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(
                    random(0.24, 0.31),
                    random(0.16, 0.3),
                    random(0.2, 0.34)
                ),
                roughness: 1
            })
        );

        mountain.position.set(
            side * random(550, 1600),
            height / 2 - 1,
            random(-2500, 1500)
        );

        mountain.castShadow = true;
        mountain.receiveShadow = true;

        scene.add(mountain);
    }
}

function createTrees() {

    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c4030
    });

    const leavesMaterial = new THREE.MeshStandardMaterial({
        color: 0x315b39,
        roughness: 1
    });

    for (let i = 0; i < 160; i++) {

        const tree = new THREE.Group();

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.8, 8, 7),
            trunkMaterial
        );

        trunk.position.y = 4;
        tree.add(trunk);

        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(random(3, 6), random(12, 20), 7),
            leavesMaterial
        );

        leaves.position.y = 13;
        tree.add(leaves);

        const side = Math.random() < 0.5 ? -1 : 1;

        tree.position.set(
            side * random(100, 700),
            0,
            random(-1800, 600)
        );

        tree.scale.setScalar(random(0.7, 1.5));

        scene.add(tree);
    }
}

/* ==========================================================
   AEROPORTO
========================================================== */

function createAirport() {

    box(
        scene,
        85,
        0.5,
        2100,
        materials.asphalt,
        0,
        0,
        -550
    );

    box(scene, 3, 0.08, 2100, materials.white, -43, 0.3, -550);
    box(scene, 3, 0.08, 2100, materials.white, 43, 0.3, -550);

    for (let i = 0; i < 65; i++) {

        box(
            scene,
            1.5,
            0.09,
            18,
            materials.white,
            0,
            0.34,
            470 - i * 31
        );
    }

    box(
        scene,
        35,
        0.35,
        400,
        materials.asphalt,
        95,
        0,
        -220
    );

    box(
        scene,
        360,
        0.4,
        240,
        materials.concrete,
        130,
        0,
        -30
    );

    for (let i = 0; i < 5; i++) {

        box(
            scene,
            2,
            0.1,
            100,
            materials.white,
            5 + i * 55,
            0.3,
            -30
        );
    }

    createRunwayLights();
    createTerminal();
    createHangars();
}

function createRunwayLights() {

    const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0x9edfff
    });

    const redMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3434
    });

    for (let z = 470; z > -1550; z -= 35) {

        for (let side of [-1, 1]) {

            sphere(
                scene,
                0.8,
                lightMaterial,
                side * 47,
                1,
                z
            );
        }
    }

    for (let side of [-1, 1]) {

        for (let i = 0; i < 5; i++) {

            sphere(
                scene,
                1.3,
                redMaterial,
                side * (40 + i * 4),
                1,
                -1590
            );
        }
    }
}

function createTerminal() {

    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0xc4cdd5,
        metalness: 0.3,
        roughness: 0.65
    });

    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x24445a,
        metalness: 0.6,
        roughness: 0.2
    });

    box(
        scene,
        220,
        22,
        55,
        buildingMaterial,
        175,
        11,
        110
    );

    box(
        scene,
        230,
        2,
        60,
        materials.dark,
        175,
        23,
        110
    );

    for (let i = 0; i < 20; i++) {

        box(
            scene,
            8,
            12,
            0.5,
            windowMaterial,
            70 + i * 11,
            11,
            81.9
        );
    }

    box(
        scene,
        9,
        40,
        9,
        buildingMaterial,
        315,
        20,
        60
    );

    box(
        scene,
        25,
        8,
        25,
        materials.glass,
        315,
        43,
        60
    );

    box(
        scene,
        18,
        2,
        18,
        materials.dark,
        315,
        48,
        60
    );
}

function createHangars() {

    for (let i = 0; i < 3; i++) {

        const x = 390 + i * 90;

        box(
            scene,
            75,
            35,
            100,
            materials.white,
            x,
            17,
            -10
        );

        box(
            scene,
            76,
            3,
            102,
            materials.dark,
            x,
            36,
            -10
        );

        box(
            scene,
            60,
            24,
            1,
            materials.glass,
            x,
            12,
            -60.5
        );
    }
}

/* ==========================================================
   AERONAVE
========================================================== */

function createAircraft() {

    const plane = new THREE.Group();

    plane.position.set(0, 3, 250);

    const whitePaint = new THREE.MeshStandardMaterial({
        color: 0xf1f3f5,
        metalness: 0.32,
        roughness: 0.3
    });

    const bluePaint = new THREE.MeshStandardMaterial({
        color: 0x0864a9,
        metalness: 0.5,
        roughness: 0.25
    });

    const glass = new THREE.MeshPhysicalMaterial({
        color: 0x16394e,
        metalness: 0.7,
        roughness: 0.12,
        clearcoat: 1
    });

    cylinder(
        plane,
        1.6,
        1.6,
        29,
        whitePaint,
        0,
        0,
        0,
        Math.PI / 2
    );

    const nose = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 24, 16),
        whitePaint
    );

    nose.scale.set(1, 1, 1.8);
    nose.position.z = -14;

    plane.add(nose);

    const tailCap = sphere(
        plane,
        1.4,
        bluePaint,
        0,
        0,
        14
    );

    tailCap.scale.z = 1.8;

    box(
        plane,
        44,
        0.45,
        7,
        whitePaint,
        0,
        0,
        -1
    );

    box(plane, 3, 2, 7, bluePaint, -23, 0.8, -1);
    box(plane, 3, 2, 7, bluePaint, 23, 0.8, -1);

    box(
        plane,
        15,
        0.3,
        4,
        whitePaint,
        0,
        0,
        12
    );

    box(
        plane,
        0.5,
        7,
        5,
        bluePaint,
        0,
        3,
        11
    );

    const cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        glass
    );

    cockpit.scale.set(1.3, 0.65, 2.8);
    cockpit.position.set(0, 1.1, -12.8);

    plane.add(cockpit);

    for (let side of [-1, 1]) {

        for (let i = 0; i < 18; i++) {

            const window = box(
                plane,
                0.7,
                0.48,
                0.12,
                glass,
                side * 1.59,
                0.6,
                -8 + i * 0.95
            );

            window.rotation.y = side * Math.PI / 2;
        }
    }

    box(
        plane,
        0.06,
        0.35,
        22,
        bluePaint,
        0,
        -0.65,
        0
    );

    // Motores.
    for (let side of [-1, 1]) {

        const engine = new THREE.Group();

        engine.position.set(
            side * 8.5,
            -1.5,
            -1
        );

        cylinder(
            engine,
            1.3,
            1.3,
            7,
            materials.metal,
            0,
            0,
            0,
            Math.PI / 2
        );

        cylinder(
            engine,
            1.05,
            1.05,
            0.5,
            materials.dark,
            0,
            0,
            -3.5,
            Math.PI / 2
        );

        const fan = new THREE.Group();

        fan.position.z = -3.8;

        cylinder(
            fan,
            0.18,
            0.18,
            0.5,
            materials.metal,
            0,
            0,
            0,
            Math.PI / 2
        );

        for (let i = 0; i < 8; i++) {

            const blade = box(
                fan,
                0.13,
                0.85,
                0.12,
                materials.metal,
                0,
                0.55,
                0
            );

            blade.rotation.z = i * Math.PI / 4;
        }

        engine.add(fan);
        engineFans.push(fan);

        plane.add(engine);
    }

    // Trem de pouso.
    for (let side of [-1, 1]) {

        cylinder(
            plane,
            0.12,
            0.12,
            2.1,
            materials.metal,
            side * 5,
            -2,
            2,
            0
        );

        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.85,
                0.85,
                0.45,
                18
            ),
            materials.rubber
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 5, -3, 2);

        plane.add(wheel);
    }

    cylinder(
        plane,
        0.1,
        0.1,
        1.5,
        materials.metal,
        0,
        -2,
        -10
    );

    const frontWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.55,
            0.55,
            0.4,
            18
        ),
        materials.rubber
    );

    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, -2.8, -10);

    plane.add(frontWheel);

    const redLight = new THREE.PointLight(0xff2222, 3, 25);
    redLight.position.set(-23, 0, -1);
    plane.add(redLight);

    const greenLight = new THREE.PointLight(0x22ff88, 3, 25);
    greenLight.position.set(23, 0, -1);
    plane.add(greenLight);

    plane.rotation.order = "YXZ";

    return plane;
}

/* ==========================================================
   NUVENS
========================================================== */

function createClouds() {

    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        transparent: true,
        opacity: 0.88
    });

    for (let i = 0; i < 45; i++) {

        const cloud = new THREE.Group();

        const count = Math.floor(random(4, 9));

        for (let j = 0; j < count; j++) {

            const puff = new THREE.Mesh(
                new THREE.SphereGeometry(
                    random(8, 19),
                    12,
                    10
                ),
                cloudMaterial
            );

            puff.position.set(
                random(-20, 20),
                random(-3, 5),
                random(-12, 12)
            );

            puff.scale.y = random(0.45, 0.8);

            cloud.add(puff);
        }

        cloud.position.set(
            random(-1600, 1600),
            random(220, 650),
            random(-3500, 1000)
        );

        clouds.push(cloud);
        scene.add(cloud);
    }
}

/* ==========================================================
   RENDERIZADOR
========================================================== */

function createRenderer() {

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 1.7)
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    sceneContainer.appendChild(renderer.domElement);
}

/* ==========================================================
   CONTROLES
========================================================== */

function createEvents() {

    window.addEventListener("keydown", event => {

        keys.add(event.key);

        if (
            ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]
                .includes(event.key)
        ) {
            event.preventDefault();
        }

        if (event.key === "Escape") {
            toggleMenu();
        }
    });

    window.addEventListener("keyup", event => {
        keys.delete(event.key);
    });

    window.addEventListener("blur", () => {

        keys.clear();

        for (const key in touch) {
            touch[key] = false;
        }
    });

    bindTouch("touchLeft", "left");
    bindTouch("touchRight", "right");
    bindTouch("touchUp", "up");
    bindTouch("touchDown", "down");
    bindTouch("touchThrottleUp", "throttleUp");
    bindTouch("touchThrottleDown", "throttleDown");

    $("startButton")?.addEventListener("click", startFlight);

    $("menuButton")?.addEventListener("click", toggleMenu);
    $("closeMenu")?.addEventListener("click", toggleMenu);
    $("resumeFlight")?.addEventListener("click", resumeFlight);

    $("returnHangar")?.addEventListener("click", returnToHangar);

    $("cameraButton")?.addEventListener("click", () => {
        flight.camera = (flight.camera + 1) % 4;
        setStatus("CÂMERA " + (flight.camera + 1));
    });

    window.addEventListener("resize", resize);
}

function bindTouch(id, key) {

    const button = $(id);

    if (!button) return;

    const release = event => {
        event.preventDefault();
        touch[key] = false;
    };

    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        touch[key] = true;
    });

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);

    button.addEventListener("contextmenu", event => {
        event.preventDefault();
    });
}

function input(touchKey, keyList) {

    return touch[touchKey] ||
        keyList.some(key => keys.has(key));
}

/* ==========================================================
   INICIAR / PAUSAR
========================================================== */

function startFlight() {

    flight.started = true;
    flight.paused = false;

    flight.speed = 50;
    flight.throttle = 1;

    $("startScreen")?.classList.add("hidden");
    $("flightMenu")?.classList.add("hidden");

    setStatus("MOTORES ATIVOS — 180 KM/H INICIAIS");
}

function toggleMenu() {

    if (!flight.started) return;

    flight.paused = !flight.paused;

    $("flightMenu")?.classList.toggle(
        "hidden",
        !flight.paused
    );

    setStatus(
        flight.paused
            ? "VOO PAUSADO"
            : "VOO EM ANDAMENTO"
    );
}

function resumeFlight() {

    flight.paused = false;

    $("flightMenu")?.classList.add("hidden");

    setStatus("VOO RETOMADO");
}

function returnToHangar() {

    flight.started = false;
    flight.paused = false;

    flight.speed = 50;
    flight.throttle = 1;

    flight.altitude = 0;
    flight.verticalSpeed = 0;

    flight.pitch = 0;
    flight.roll = 0;
    flight.yaw = 0;

    flight.onGround = true;

    aircraft.position.set(0, 3, 250);
    aircraft.rotation.set(0, 0, 0);

    $("flightMenu")?.classList.add("hidden");
    $("startScreen")?.classList.remove("hidden");

    setStatus("AERONAVE NO PÁTIO");
}

/* ==========================================================
   FÍSICA DE VOO — ACELERAÇÃO REFORÇADA
========================================================== */

function updateFlight(dt) {

    if (!flight.started || flight.paused) return;

    const left = input("left", ["ArrowLeft", "a", "A"]);
    const right = input("right", ["ArrowRight", "d", "D"]);
    const up = input("up", ["ArrowUp", "w", "W"]);
    const down = input("down", ["ArrowDown", "s", "S"]);

    const throttleUp = input("throttleUp", ["Shift"]);
    const throttleDown = input("throttleDown", ["Control"]);

    // Potência dos motores.
    if (throttleUp) {
        flight.throttle += dt * 0.5;
    }

    if (throttleDown) {
        flight.throttle -= dt * 0.5;
    }

    flight.throttle = clamp(flight.throttle, 0, 1);

    // Aceleração reforçada.
    const engineForce = flight.throttle * 52;
    const airResistance = flight.speed * flight.speed * 0.0017;
    const rollingResistance = flight.onGround ? 1.1 : 0.2;

    const acceleration =
        engineForce - airResistance - rollingResistance;

    flight.speed += acceleration * dt;
    flight.speed = clamp(flight.speed, 0, 333.33);

    // Pitch e roll.
    const targetPitch = up
        ? 0.24
        : down
            ? -0.16
            : flight.onGround
                ? 0
                : 0.045;

    const targetRoll =
        left ? 0.62 :
        right ? -0.62 :
        0;

    flight.pitch = lerp(
        flight.pitch,
        targetPitch,
        dt * 1.8
    );

    flight.roll = lerp(
        flight.roll,
        targetRoll,
        dt * 2.4
    );

    // Direção.
    const speedFactor = clamp(flight.speed / 65, 0, 2);

    flight.yaw +=
        flight.roll * speedFactor * dt * 0.32;

    // Decolagem.
    if (
        flight.onGround &&
        flight.speed >= 54 &&
        flight.pitch > 0.12
    ) {

        flight.onGround = false;
        flight.verticalSpeed = 2.5;

        setStatus("DECOLAGEM — AERONAVE NO AR");
    }

    // Sustentação e gravidade.
    if (!flight.onGround) {

        const liftEffect = speedFactor * 1.8;

        const verticalAcceleration =
            flight.pitch * 28 + liftEffect - 1.2;

        flight.verticalSpeed +=
            verticalAcceleration * dt;

        flight.verticalSpeed = clamp(
            flight.verticalSpeed,
            -30,
            35
        );

        aircraft.position.y +=
            flight.verticalSpeed * dt;

        if (aircraft.position.y <= 3) {

            aircraft.position.y = 3;

            if (flight.verticalSpeed < 0) {

                flight.onGround = true;
                flight.verticalSpeed = 0;

                setStatus("AERONAVE NO SOLO");
            }
        }

    } else {

        aircraft.position.y = 3;
        flight.verticalSpeed = 0;
    }

    // Movimento horizontal.
    const forward = new THREE.Vector3(0, 0, -1);

    forward.applyAxisAngle(WORLD_UP, flight.yaw);

    aircraft.position.x +=
        forward.x * flight.speed * dt;

    aircraft.position.z +=
        forward.z * flight.speed * dt;

    aircraft.rotation.order = "YXZ";

    aircraft.rotation.y = flight.yaw;
    aircraft.rotation.x = flight.pitch;
    aircraft.rotation.z = flight.roll;

    // Turbinas.
    engineFans.forEach(fan => {
        fan.rotation.z +=
            dt * (10 + flight.throttle * 55);
    });

    flight.altitude = Math.max(
        0,
        aircraft.position.y - 3
    );

    updateHUD();
}

/* ==========================================================
   CÂMERAS
========================================================== */

function updateCamera(dt) {

    if (!aircraft) return;

    const forward = new THREE.Vector3(0, 0, -1);

    forward.applyQuaternion(aircraft.quaternion);

    let desiredPosition;
    let target;

    switch (flight.camera) {

        case 0:

            desiredPosition = aircraft.position.clone()
                .add(forward.clone().multiplyScalar(-75))
                .add(new THREE.Vector3(0, 20, 0));

            target = aircraft.position.clone()
                .add(forward.clone().multiplyScalar(35));

            break;

        case 1:

            desiredPosition = aircraft.position.clone()
                .add(new THREE.Vector3(65, 14, 15));

            target = aircraft.position.clone();

            break;

        case 2:

            desiredPosition = aircraft.position.clone()
                .add(forward.clone().multiplyScalar(11))
                .add(new THREE.Vector3(0, 1.5, 0));

            target = aircraft.position.clone()
                .add(forward.clone().multiplyScalar(100));

            break;

        default:

            desiredPosition = aircraft.position.clone()
                .add(new THREE.Vector3(100, 35, 100));

            target = aircraft.position.clone();

            break;
    }

    camera.position.lerp(
        desiredPosition,
        1 - Math.exp(-dt * 2.4)
    );

    cameraTarget.lerp(
        target,
        1 - Math.exp(-dt * 3)
    );

    camera.lookAt(cameraTarget);
}

/* ==========================================================
   HUD
========================================================== */

function updateHUD() {

    $("speed").textContent =
        Math.round(flight.speed * 3.6);

    $("altitude").textContent =
        Math.round(flight.altitude * 3.28084);

    $("verticalSpeed").textContent =
        Math.round(flight.verticalSpeed * 196.85);

    $("enginePower").textContent =
        Math.round(flight.throttle * 100);
}

/* ==========================================================
   STATUS
========================================================== */

function setStatus(message) {

    const element = $("statusText");

    if (element) {
        element.textContent = message;
    }
}

/* ==========================================================
   LOOP PRINCIPAL
========================================================== */

function animate() {

    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.04);

    updateFlight(dt);
    updateCamera(dt);

    clouds.forEach((cloud, index) => {
        cloud.position.x += Math.sin(index) * dt * 1.5;
    });

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/* ==========================================================
   REDIMENSIONAMENTO
========================================================== */

function resize() {

    if (!camera || !renderer) return;

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 1.7)
    );
}

/* ==========================================================
   ERROS
========================================================== */

try {

    initialize();

} catch (error) {

    console.error("SKYFORGE ERROR:", error);

    const warning = document.createElement("div");

    warning.style.position = "fixed";
    warning.style.inset = "20px";
    warning.style.zIndex = "99999";
    warning.style.padding = "25px";
    warning.style.background = "#28151b";
    warning.style.color = "white";
    warning.style.fontFamily = "Arial";
    warning.style.border = "1px solid #ff5252";
    warning.style.borderRadius = "12px";

    warning.innerHTML = `
        <h2>Não foi possível iniciar o SKYFORGE</h2>
        <p style="margin-top:15px">
            Verifique sua conexão e os arquivos do projeto.
        </p>
        <pre style="white-space:pre-wrap;margin-top:15px"></pre>
    `;

    warning.querySelector("pre").textContent =
        error.message || String(error);

    document.body.appendChild(warning);
}
