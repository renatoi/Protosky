import * as THREE from "three";
import { resizeRendererToDisplaySize } from "./three-utils";
import Stats from "stats.js";
import { lerp } from "three/src/math/MathUtils";
import { CloudMesh } from "./CloudMesh";

interface CloudsOptions {
  canvas: HTMLCanvasElement;
  cameraVelocity?: number;
  cameraTravelDistance?: number;
  cameraHeightFrom?: number;
  cameraHeightTo?: number;
  backgroundColor?: string;
  fogEnable?: boolean;
  fogNear?: number;
  fogFar?: number;
  cameraScrollOffset?: number;
  cloudCount?: number;
  horizontalSpreadFactor?: number;
  verticalSpreadFactor?: number;
}

export class Clouds implements CloudsOptions {
  canvas = null;
  cameraVelocity = 0.01;
  cameraTravelDistance = 1000;
  cameraHeightFrom = 30;
  cameraHeightTo = 14;
  backgroundColor = "#74B2E2";
  fogEnable = true;
  fogNear = 1;
  fogFar = 900;

  get cloudCount() {
    return this.#cloudCount;
  }

  set cloudCount(value) {
    this.#cloudCount = value;
    this.#buildClouds = true;
  }

  get horizontalSpreadFactor() {
    return this.#horizontalSpreadFactor;
  }

  set horizontalSpreadFactor(value) {
    this.#horizontalSpreadFactor = value;
    this.#buildClouds = true;
  }

  get verticalSpreadFactor() {
    return this.#verticalSpreadFactor;
  }

  set verticalSpreadFactor(value) {
    this.#verticalSpreadFactor = value;
    this.#buildClouds = true;
  }

  get scaleMin() {
    return this.#scaleMin;
  }

  set scaleMin(value) {
    this.#scaleMin = value;
    this.#buildClouds = true;
  }

  get scaleMax() {
    return this.#scaleMax;
  }

  set scaleMax(value) {
    this.#scaleMax = value;
    this.#buildClouds = true;
  }

  get scene() {
    return this.#scene;
  }

  #cloudCount = 600;
  #horizontalSpreadFactor = 400;
  #verticalSpreadFactor = 3;
  #scaleMin = 0.5;
  #scaleMax = 0.85;
  #buildClouds = true;
  #startTime = Date.now();
  #stats: Stats;
  #renderer: THREE.Renderer;
  #camera: THREE.PerspectiveCamera;
  #scene: THREE.Scene;
  #canvasRect: DOMRect;
  #canvasTopPageY: number;
  #canvasBottomPageY: number;
  #scrollPercent: number;
  #mesh: THREE.Mesh;

  constructor(options: CloudsOptions) {
    Object.assign(this, options);
  }

  init() {
    this.#stats = new Stats();
    this.#stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(this.#stats.dom);

    // renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    this.#renderer = renderer;

    // camera
    const fov = 30;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 4000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(
      0,
      this.cameraHeightFrom,
      this.cameraTravelDistance * 1.2
    );
    this.#camera = camera;

    // scenes
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(this.backgroundColor);
    this.#scene = this.#scene;

    // fog
    if (this.fogEnable) {
      this.#scene.fog = new THREE.Fog(
        this.backgroundColor,
        this.fogNear,
        this.fogFar
      );
    }

    // do a first run
    this.#recalculateRects();
    this.#onScroll();
    this.#animate();

    // add window listeners
    window.addEventListener("resize", this.#recalculateRects.bind(this));
    window.addEventListener("scroll", this.#onScroll.bind(this));
  }

  #animate() {
    this.#stats.begin();

    if (resizeRendererToDisplaySize(this.#renderer)) {
      const canvas = this.#renderer.domElement;
      this.#camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.#camera.updateProjectionMatrix();
    }

    // we build clouds only once or when config is changed
    if (this.#buildClouds) {
      this.#buildClouds = false;
      console.log("building clouds");

      this.#scene.remove(this.#mesh);

      // mesh
      const fog = this.scene.fog as THREE.Fog;
      const mesh = new CloudMesh({
        cloudCount: this.cloudCount,
        cameraTravelDistance: this.cameraTravelDistance,
        horizontalSpreadFactor: this.horizontalSpreadFactor,
        verticalSpreadFactor: this.verticalSpreadFactor,
        fogColor: fog?.color,
        fogNear: fog?.near,
        fogFar: fog?.far,
        scaleMin: this.#scaleMin,
        scaleMax: this.#scaleMax,
      }).create();

      this.#mesh = mesh;
      this.#scene.add(this.#mesh);
    }

    // anim camera
    const elapsedTime = Date.now() - this.#startTime;
    const cameraPosY = lerp(
      this.cameraHeightFrom,
      this.cameraHeightTo,
      this.#scrollPercent
    );
    const cameraPosZ =
      (elapsedTime * this.cameraVelocity) % this.cameraTravelDistance;

    this.#camera.position.set(
      0,
      cameraPosY,
      -cameraPosZ + this.cameraTravelDistance * 2
    );

    this.#renderer.render(this.#scene, this.#camera);

    this.#stats.end();
    requestAnimationFrame(() => {
      this.#animate();
    });
  }

  #recalculateRects() {
    console.log("recalculting");
    const bodyRect = document.body.getBoundingClientRect();
    this.#canvasRect = this.canvas.getBoundingClientRect();
    this.#canvasTopPageY = this.#canvasRect.top - bodyRect.top;
    this.#canvasBottomPageY = this.#canvasTopPageY + this.#canvasRect.height;
  }

  #onScroll() {
    const scrollYBottom = window.scrollY + window.innerHeight;
    if (
      scrollYBottom >= this.#canvasTopPageY &&
      window.scrollY <= this.#canvasBottomPageY
    ) {
      const start = this.#canvasTopPageY;
      const end = this.#canvasBottomPageY + this.#canvasRect.height;
      const current = scrollYBottom;
      this.#scrollPercent = (current - start) / (end - start);
    }
  }
}
