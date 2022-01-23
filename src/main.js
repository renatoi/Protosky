import GUI from "lil-gui";
import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getRandomArbitrary, resizeRendererToDisplaySize } from "./three-utils";
import { FogGUIHelper } from "./three-gui-helpers";
import { Light } from "three";

let shouldGenerate = true;

const config = {
  cameraVelocity: 0.1,
  cameraTravelDistance: 8000,
  cameraHeight: 200,

  _cloudCount: 8000,
  get cloudCount() {
    return this._cloudCount;
  },
  set cloudCount(value) {
    this._cloudCount = value;
    shouldGenerate = true;
  },

  _horizontalSpreadFactor: 1000,
  get horizontalSpreadFactor() {
    return this._horizontalSpreadFactor;
  },
  set horizontalSpreadFactor(value) {
    this._horizontalSpreadFactor = value;
    shouldGenerate = true;
  },

  _verticalSpreadFactor: 100,
  get verticalSpreadFactor() {
    return this._verticalSpreadFactor;
  },
  set verticalSpreadFactor(value) {
    this._verticalSpreadFactor = value;
    shouldGenerate = true;
  },

  _cameraScrollOffset: 80,
  get cameraScrollOffset() {
    return this._cameraScrollOffset;
  },
  set cameraScrollOffset(value) {
    this._cameraScrollOffset = value;
    shouldGenerate = true;
  },
};

const gui = new GUI();
gui.close();

gui.add(config, "cameraVelocity");
gui.add(config, "cameraTravelDistance");
gui.add(config, "cameraHeight");
gui.add(config, "cameraScrollOffset");

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
  const far = 2700;
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
let dinoRoot;
let modelReady = false
let mixer;
const animationActions = [];
let activeAction;
let lastAction;

const gltfLoader = new GLTFLoader();
gltfLoader.load("./Dinofly/Dinofly.glb", (gltf) => {
  console.log("animations", gltf.animations); // Array<THREE.AnimationClip>
  console.log("scene", gltf.scene); // THREE.Group
  console.log("scenes", gltf.scenes); // Array<THREE.Group>
  console.log("cameras", gltf.cameras); // Array<THREE.Camera>
  console.log("asset", gltf.asset); // Object

  dinoRoot = gltf.scene;
  dinoRoot.rotateY(45);
  dinoRoot.scale.set(0.5, 0.5, 0.5);
  dinoRoot.renderOrder = 2;
  dinoRoot.depthTest = false;

  mixer = new THREE.AnimationMixer(gltf.scene);
  const animationAction = mixer.clipAction(gltf.animations[0]);
  animationActions.push(animationAction);
  activeAction = animationActions[0];
  activeAction.play()

  scene2.add(dinoRoot);
  modelReady = true;

  console.log('gltf added');
  render();
});

// directional light
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.position.set(2, 2, 5);
scene2.add(directionalLight);

// render
let mesh1;
let mesh2;
let zPos;
let startTime = Date.now();
let cameraOffset = 0;

const clock = new THREE.Clock()

function render(time) {
  time *= 0.001; // convert time to seconds

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  if (shouldGenerate) {
    shouldGenerate = false;

    scene1.remove(mesh1);
    scene1.remove(mesh2);

    const geometries = [];
    for (let i = 0; i < config.cloudCount; i++) {
      const geo = planeGeometry.clone();

      // rotate
      geo.rotateZ(Math.random() * Math.PI);

      // translate
      const xHalf = config.horizontalSpreadFactor * 0.5;
      const x = getRandomArbitrary(-xHalf, xHalf);
      const yHalf = config.verticalSpreadFactor * 0.5;
      const y = getRandomArbitrary(-yHalf, yHalf);
      const z = i;
      geo.translate(x, y, z);

      // scale
      const scale = Math.random() * Math.random() * 1.5 + 0.5;
      geo.scale(scale, scale, 1);

      geometries.push(geo);
    }

    const mergedGeometry = mergeBufferGeometries(geometries);

    // mesh
    mesh1 = new THREE.Mesh(mergedGeometry, material);
    mesh1.depthTest = false;
    mesh1.renderOrder = 0;
    scene1.add(mesh1);

    mesh2 = new THREE.Mesh(mergedGeometry, material);
    mesh1.depthTest = false;
    mesh1.renderOrder = 1;
    mesh2.position.setZ(-config.cameraTravelDistance);
    scene1.add(mesh2);
  }

  const deltaTime = Date.now() - startTime;
  zPos = (deltaTime * config.cameraVelocity) % config.cameraTravelDistance;
  const cameraYOffset = cameraOffset * config.cameraScrollOffset;
  camera.position.set(
    0,
    config.cameraHeight - cameraYOffset,
    -zPos + config.cameraTravelDistance
  );

  renderer.render(scene1, camera);

  if (modelReady) {
    dinoRoot.position.set(camera.position.x, camera.position.y, camera.position.z - 10);
    mixer.update(clock.getDelta());

    renderer.autoClear = false;
    renderer.clearDepth(); //clears the depth buffer so the objects in scene2 will always be on top
    renderer.render(scene2, camera);
  }

  renderer.autoClear = true;

  requestAnimationFrame(render);
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

render();
