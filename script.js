import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_URL = "./assets/models/demo.glb";
const MIN_POLAR_ANGLE = Math.PI / 6;
const MAX_POLAR_ANGLE = Math.PI / 2.2;
const MIN_ZOOM_DISTANCE = 5;
const MAX_ZOOM_DISTANCE = 150;

const canvas = document.querySelector("#modelCanvas");
const loadingEl = document.querySelector("#loading");
const errorEl = document.querySelector("#error");
const resetButton = document.querySelector("#resetButton");
const autoRotateButton = document.querySelector("#autoRotateButton");

let initialCameraPosition = new THREE.Vector3();
let initialControlsTarget = new THREE.Vector3();
let modelRoot = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a25);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
camera.position.set(0, 1.5, 5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x1a1a25);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 1.35;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.autoRotate = false;
controls.autoRotateSpeed = 1.1;
controls.minPolarAngle = MIN_POLAR_ANGLE;
controls.maxPolarAngle = MAX_POLAR_ANGLE;
controls.minDistance = MIN_ZOOM_DISTANCE;
controls.maxDistance = MAX_ZOOM_DISTANCE;

const ambientLight = new THREE.AmbientLight(0x9dbdff, 0.45);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xbfd7ff, 0x111827, 0.8);
scene.add(hemisphereLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(20, 30, 20);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x5c8dff, 1.4);
fillLight.position.set(-25, 18, -20);
scene.add(fillLight);

const frontSoftLight = new THREE.DirectionalLight(0xdcebff, 0.8);
frontSoftLight.position.set(0, 12, 30);
scene.add(frontSoftLight);

const sideRimLight = new THREE.DirectionalLight(0x78aaff, 0.9);
sideRimLight.position.set(-28, 10, 16);
scene.add(sideRimLight);

const loader = new GLTFLoader();

function enhanceMaterial(material) {
  if (material.color) {
    material.color.set(0x31445f);
  }

  material.metalness = 0.75;
  material.roughness = 0.22;
  material.envMapIntensity = 1.6;
  material.toneMapped = true;

  if ("clearcoat" in material) {
    material.clearcoat = 0.55;
    material.clearcoatRoughness = 0.16;
  }

  if ("reflectivity" in material) {
    material.reflectivity = 0.65;
  }

  if ("specularIntensity" in material) {
    material.specularIntensity = 0.72;
  }

  if (material.specularColor) {
    material.specularColor.set(0xd9e8ff);
  }

  material.needsUpdate = true;
}

function enhanceModelMaterials(model) {
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    object.castShadow = true;
    object.receiveShadow = true;

    if (Array.isArray(object.material)) {
      object.material.forEach(enhanceMaterial);
      return;
    }

    enhanceMaterial(object.material);
  });
}

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
}

function frameModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);

  model.position.sub(center);

  const fitHeightDistance = maxSize / (2 * Math.tan((Math.PI * camera.fov) / 360));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.35;

  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = Math.max(distance * 1000, 1000);
  camera.position.set(distance * 0.55, distance * 0.35, distance);
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.minDistance = MIN_ZOOM_DISTANCE;
  controls.maxDistance = MAX_ZOOM_DISTANCE;
  controls.update();

  initialCameraPosition.copy(camera.position);
  initialControlsTarget.copy(controls.target);
}

function resetView() {
  if (!modelRoot) return;

  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialControlsTarget);
  controls.update();
}

function setAutoRotate(isEnabled) {
  controls.autoRotate = isEnabled;
  autoRotateButton.classList.toggle("is-active", isEnabled);
  autoRotateButton.setAttribute("aria-pressed", String(isEnabled));
  autoRotateButton.setAttribute(
    "aria-label",
    isEnabled ? "Stop auto rotate" : "Start auto rotate",
  );
}

function showError() {
  loadingEl.hidden = true;
  errorEl.hidden = false;
}

loader.load(
  MODEL_URL,
  (gltf) => {
    const model = gltf.scene;
    modelRoot = model;
    enhanceModelMaterials(model);
    scene.add(model);
    resizeRenderer();
    frameModel(model);
    loadingEl.hidden = true;
  },
  undefined,
  (error) => {
    console.error("Model load failed:", error);
    showError();
  },
);

resetButton.addEventListener("click", resetView);

autoRotateButton.addEventListener("click", () => {
  setAutoRotate(!controls.autoRotate);
});

function animate() {
  resizeRenderer();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", resizeRenderer);
window.addEventListener("orientationchange", resizeRenderer);
