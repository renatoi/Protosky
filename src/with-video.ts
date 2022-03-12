import GUI from "lil-gui";
import { FogGUIHelper } from "./three-gui-helpers";
import { Carousel } from "./Carousel";
import { Clouds } from "./CloudsInstanced";

// GUI
const gui = new GUI();
gui.close();

// CAROUSEL
// const carousel = new Carousel({
//   buttonsEl: document.querySelector(".carousel-buttons"),
//   stageEl: document.querySelector(".carousel-stage"),
//   data: [
//     {
//       srcWebm: "Dragons/dragon_176633.webm",
//       buttonLabel: 'Dragon 1',
//       buttonImage: 'thumbnail.png',
//     },
//     {
//       srcWebm: "Dragons/dragon_176633.webm",
//       buttonLabel: 'Dragon 2',
//       buttonImage: 'thumbnail.png',
//     },
//     {
//       srcWebm: "Dragons/dragon_176633.webm",
//       buttonLabel: 'Dragon 2',
//       buttonImage: 'thumbnail.png',
//     },
//   ],
// });

// const carouselFolder = gui.addFolder("Carousel");
// carouselFolder.add(carousel, "animDurationSec").listen();

// CLOUDS
const clouds = new Clouds({ canvas: document.querySelector("#c") });
clouds.init();

const cloudsGUIFolder = gui.addFolder("Clouds");
cloudsGUIFolder.add(clouds, "cameraVelocity");
cloudsGUIFolder.add(clouds, "cameraTravelDistance");
cloudsGUIFolder.add(clouds, "cameraHeightFrom");
cloudsGUIFolder.add(clouds, "cameraHeightTo");
cloudsGUIFolder.add(clouds, "cloudCount", 1, 8000);
cloudsGUIFolder.add(clouds, "horizontalSpreadFactor");
cloudsGUIFolder.add(clouds, "verticalSpreadFactor");
cloudsGUIFolder.add(clouds, "scaleMin");
cloudsGUIFolder.add(clouds, "scaleMax");
const fogFolder = gui.addFolder("Fog");
const fogGUIHelper = new FogGUIHelper(
  clouds.scene.fog,
  clouds.scene.background
);
const near = (clouds.scene.fog as THREE.Fog).near;
const far = (clouds.scene.fog as THREE.Fog).far;
fogFolder.add(fogGUIHelper, "near", near, far).listen();
fogFolder.add(fogGUIHelper, "far", near, far).listen();
fogFolder.addColor(fogGUIHelper, "color");
