import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getRandomArbitrary, resizeRendererToDisplaySize } from "./three-utils";
import Stats from "stats.js";
import { lerp } from "three/src/math/MathUtils";

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
  cameraHeightFrom = 60;
  cameraHeightTo = 14;
  backgroundColor = '#74B2E2';
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

  get scene() {
    return this.#scene;
  }

  #cloudCount = 200;
  #horizontalSpreadFactor = 400;
  #verticalSpreadFactor = 3;
  #buildClouds = true;
  #startTime = Date.now();
  #stats : Stats;
  #material: THREE.Material;
  #renderer: THREE.Renderer;
  #camera: THREE.PerspectiveCamera;
  #scene: THREE.Scene;
  #planeGeometry: THREE.PlaneGeometry;
  #canvasRect: DOMRect;
  #canvasTopPageY: number;
  #canvasBottomPageY: number;
  #scrollPercent: number;
  #mesh1: THREE.Mesh;
  #mesh2: THREE.Mesh;

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
    const far = 3000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, this.cameraHeightFrom, this.cameraTravelDistance * 1.2);
    this.#camera = camera;

    // scenes
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(this.backgroundColor);
    this.#scene = this.#scene;

    // fog
    if (this.fogEnable) {
      this.#scene.fog = new THREE.Fog(this.backgroundColor, this.fogNear, this.fogFar);
    }

    // texture
    const loader = new THREE.TextureLoader();
    const texture = loader.load("cloud10.png");
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    // material
    this.#material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // geometry
    this.#planeGeometry = new THREE.PlaneGeometry(64, 64);

    // do a first run
    this.recalculateRects();
    this.onScroll();
    this.animate();

    // add window listeners
    window.addEventListener("resize", this.recalculateRects.bind(this));
    window.addEventListener("scroll", this.onScroll.bind(this));
  }

  animate() {
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

      this.#scene.remove(this.#mesh1);
      this.#scene.remove(this.#mesh2);

      const geometries = [];
      let cloudZ = 0;
      const cloudIncrement = this.cameraTravelDistance / this.#cloudCount;
      for (let i = 0; i < this.#cloudCount; i++) {
        const geo = this.#planeGeometry.clone();

        // rotate
        geo.rotateZ(Math.random() * Math.PI);

        // translate
        const xHalf = this.#horizontalSpreadFactor * 0.5;
        const x = getRandomArbitrary(-xHalf, xHalf);
        const yHalf = this.#verticalSpreadFactor * 0.5;
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
      this.#mesh1 = new THREE.Mesh(mergedGeometry, this.#material);
      this.#scene.add(this.#mesh1);

      this.#mesh2 = new THREE.Mesh(mergedGeometry, this.#material);
      this.#mesh2.position.setZ(-this.cameraTravelDistance);
      this.#scene.add(this.#mesh2);
    }

    // anim camera
    const elapsedTime = Date.now() - this.#startTime;
    const yPos = lerp(this.cameraHeightFrom, this.cameraHeightTo, this.#scrollPercent);
    const zPos =
      (elapsedTime * this.cameraVelocity) % this.cameraTravelDistance;

    this.#camera.position.set(
      0,
      yPos,
      -zPos + this.cameraTravelDistance
    );

    this.#renderer.render(this.#scene, this.#camera);

    this.#stats.end();
    requestAnimationFrame(() => {
      this.animate();
    });
  }

  recalculateRects() {
    console.log("recalculting");
    const bodyRect = document.body.getBoundingClientRect();
    this.#canvasRect = this.canvas.getBoundingClientRect();
    this.#canvasTopPageY = this.#canvasRect.top - bodyRect.top;
    this.#canvasBottomPageY = this.#canvasTopPageY + this.#canvasRect.height;
  }

  onScroll() {
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
