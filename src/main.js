import GUI from "lil-gui";
import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getRandomArbitrary, resizeRendererToDisplaySize } from "./three-utils";
import { FogGUIHelper } from "./three-gui-helpers";
import { Carousel } from "./carousel";
import Stats from "stats.js";

const stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

let buildClouds = true;

const config = {
  cameraVelocity: 0.03,
  cameraTravelDistance: 1000,
  cameraHeight: 100,
  _cameraScrollOffset: 40,
  get cameraScrollOffset() {
    return this._cameraScrollOffset;
  },
  set cameraScrollOffset(value) {
    this._cameraScrollOffset = value;
    buildClouds = true;
  },

  _cloudCount: 200,
  get cloudCount() {
    return this._cloudCount;
  },
  set cloudCount(value) {
    this._cloudCount = value;
    buildClouds = true;
  },

  _horizontalSpreadFactor: 400,
  get horizontalSpreadFactor() {
    return this._horizontalSpreadFactor;
  },
  set horizontalSpreadFactor(value) {
    this._horizontalSpreadFactor = value;
    buildClouds = true;
  },

  _verticalSpreadFactor: 15,
  get verticalSpreadFactor() {
    return this._verticalSpreadFactor;
  },
  set verticalSpreadFactor(value) {
    this._verticalSpreadFactor = value;
    buildClouds = true;
  },
};

// we init carousel with defaults, we fill with info once we have the items loaded
const carousel = new Carousel();

// gui
const gui = new GUI();
gui.close();

gui.add(config, "cameraVelocity");
gui.add(config, "cameraTravelDistance");
gui.add(config, "cameraHeight");
gui.add(config, "cameraScrollOffset");

const carouselFolder = gui.addFolder("Carousel");
carouselFolder.add(carousel, "animDuration");
carouselFolder
  .add(carousel.itemRightPos, "x")
  .name("Item right position X");
carouselFolder
  .add(carousel.itemRightPos, "y")
  .name("Item right position Y");
carouselFolder.add(carousel.itemMiddlePos, "x").name("Item middle position X");
carouselFolder.add(carousel.itemMiddlePos, "y").name("Item middle position Y");
carouselFolder.add(carousel.itemLeftPos, "x").name("Item left position X");
carouselFolder.add(carousel.itemLeftPos, "y").name("Item left position Y");

const cloudsFolder = gui.addFolder("Clouds");
cloudsFolder.add(config, "cloudCount", 1, 8000);
cloudsFolder.add(config, "horizontalSpreadFactor");
cloudsFolder.add(config, "verticalSpreadFactor");

// canvas
const canvas = document.querySelector("#c");

// renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.outputEncoding = THREE.sRGBEncoding;

// camera
const fov = 30;
const aspect = 2; // the canvas default
const near = 1;
const far = 3000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.setZ(6000);

// scenes
const scene1 = new THREE.Scene();
scene1.background = new THREE.Color("#4584b4");
const scene2 = new THREE.Scene();

// fog
{
  const color = scene1.background;
  const near = 1;
  const far = 900;
  scene1.fog = new THREE.Fog(color, near, far);
  const fogFolder = gui.addFolder("Fog");
  const fogGUIHelper = new FogGUIHelper(scene1.fog, scene1.background);
  fogFolder.add(fogGUIHelper, "near", near, far).listen();
  fogFolder.add(fogGUIHelper, "far", near, far).listen();
  fogFolder.addColor(fogGUIHelper, "color");
}

// texture
const loader = new THREE.TextureLoader();
const texture = loader.load("cloud10.png");
texture.magFilter = THREE.LinearFilter;
texture.minFilter = THREE.LinearMipmapLinearFilter;

// material
const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.DoubleSide,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});

// geometry
const planeWidth = 64;
const planeHeight = 64;
const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

// Dino
let allModelsLoaded = false;
const dragons = [
  {
    modelPath: "./Dragons/Ysera.glb",
    root: null,
    mixer: null,
    animActions: [],
    activeAction: [],
    positioner: { x: -1000, y: -1000 },
  },
  {
    modelPath: "./Dragons/Kalecgos.glb",
    root: null,
    mixer: null,
    animActions: [],
    activeAction: [],
    positioner: { x: -1000, y: -1000 },
  },
  {
    modelPath: "./Dragons/Nozdormu.glb",
    root: null,
    mixer: null,
    animActions: [],
    activeAction: [],
    positioner: { x: -1000, y: -1000 },
  },
];

function loadModel(path) {
  return new Promise(function (resolve, reject) {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(path, resolve, null, reject);
  });
}

var loadModelPromises = dragons.map((dino) => loadModel(dino.modelPath));

Promise.all(loadModelPromises).then((gltfArray) => {
  gltfArray.forEach((gltf, i) => {
    const root = gltf.scene;
    root.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 45);
    root.scale.set(0.15, 0.15, 0.15);
    root.visible = false;
    dragons[i].root = root;

    const mixer = new THREE.AnimationMixer(gltf.scene);
    dragons[i].mixer = mixer;

    const animationAction = mixer.clipAction(gltf.animations[0]);
    dragons[i].animActions.push(animationAction);

    dragons[i].activeAction = dragons[i].animActions[0];
    dragons[i].activeAction.play();

    scene2.add(root);

    console.log("gltf added");
  });

  // fill carousel with data
  carousel.configure({
    items: dragons,
  });

  allModelsLoaded = true;

  animate();
});

// load dino models
dragons.forEach((dino) => loadModel(dino.modelPath));

// directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(2, 2, 5);
scene2.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
directionalLight2.position.set(-2, 2, 5);
scene2.add(directionalLight2);

// render
let mesh1;
let mesh2;
let zPos;
const clock = new THREE.Clock();
const startTime = Date.now();
let cameraOffset = 0;

function animate(time) {
  stats.begin();

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  // we build clouds only once or when config is changed
  if (buildClouds) {
    buildClouds = false;
    console.log('building clouds');

    scene1.remove(mesh1);
    scene1.remove(mesh2);

    const geometries = [];
    let cloudZ = 0;
    const cloudIncrement = config.cameraTravelDistance / config.cloudCount;
    for (let i = 0; i < config.cloudCount; i++) {
      const geo = planeGeometry.clone();

      // rotate
      geo.rotateZ(Math.random() * Math.PI);

      // translate
      const xHalf = config.horizontalSpreadFactor * 0.5;
      const x = getRandomArbitrary(-xHalf, xHalf);
      const yHalf = config.verticalSpreadFactor * 0.5;
      const y = getRandomArbitrary(-yHalf, yHalf);
      const z = cloudZ;
      cloudZ += cloudIncrement;
      geo.translate(x, y, z);

      // scale
      const scale = Math.random() * Math.random() * 1.5 + 0.5;
      geo.scale(scale, scale, 1);

      geometries.push(geo);
    }

    const mergedGeometry = mergeBufferGeometries(geometries);

    // mesh (we add two so we can walk 2 sets of clouds without interruption when we return to the first one)
    mesh1 = new THREE.Mesh(mergedGeometry, material);
    scene1.add(mesh1);

    mesh2 = new THREE.Mesh(mergedGeometry, material);
    mesh2.position.setZ(-config.cameraTravelDistance);
    scene1.add(mesh2);
  }

  // anim camera
  const elapsedTime = Date.now() - startTime;
  zPos = (elapsedTime * config.cameraVelocity) % config.cameraTravelDistance;
  const cameraYOffset = cameraOffset * config.cameraScrollOffset;
  camera.position.set(
    0,
    config.cameraHeight - cameraYOffset,
    -zPos + config.cameraTravelDistance
  );

  renderer.render(scene1, camera);

  // we draw scene2 on top of scene1
  if (allModelsLoaded) {
    carousel.init();
    carousel.update(time, () => {
      const camPos = camera.position;
      const deltaSeconds = clock.getDelta();

      carousel.items.forEach((item, index) => {
        if (index === carousel.activeIndex) {
          item.root.visible = true;
        }

        if (item.positioner) {
          item.root.position.set(
            camPos.x + item.positioner.x,
            camPos.y + item.positioner.y,
            camPos.z - 10
          );
        }

        item.mixer.update(deltaSeconds);
      });
    });
  }

  // draw scene2 on top of scene1
  renderer.autoClear = false;

  // clears the depth buffer so the objects in scene2 will always be on top
  renderer.clearDepth();

  renderer.render(scene2, camera);

  // scene1 should clear when rendering next time
  renderer.autoClear = true;

  stats.end();

  requestAnimationFrame(animate);
}

let bodyRect;
let canvasRect;
let canvasTopPageY;
let canvasBottomPageY;

function recalculateRects() {
  console.log("recalculting");
  bodyRect = document.body.getBoundingClientRect();
  canvasRect = canvas.getBoundingClientRect();
  canvasTopPageY = canvasRect.top - bodyRect.top;
  canvasBottomPageY = canvasTopPageY + canvasRect.height;
}

function onScroll() {
  const scrollYBottom = window.scrollY + window.innerHeight;
  if (scrollYBottom >= canvasTopPageY && window.scrollY <= canvasBottomPageY) {
    cameraOffset = (scrollYBottom - canvasTopPageY) / canvasRect.height;
  }
}

window.addEventListener("resize", recalculateRects);
window.addEventListener("scroll", onScroll);

// do a first run
recalculateRects();
onScroll();

animate();

// Listeners for carousel
const prevButton = document.querySelector(".carousel-button-prev");
prevButton.addEventListener("click", () => {
  carousel.prev();
});

const nextButton = document.querySelector(".carousel-button-next");
nextButton.addEventListener("click", () => {
  carousel.next();
});
