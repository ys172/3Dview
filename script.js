import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_URL = "./assets/models/demo.glb";

const canvas = document.querySelector("#modelCanvas");
const loadingEl = document.querySelector("#loading");
const errorEl = document.querySelector("#error");
const resetButton = document.querySelector("#resetButton");
const autoRotateButton = document.querySelector("#autoRotateButton");

let initialCameraPosition = new THREE.Vector3();
let initialControlsTarget = new THREE.Vector3();
let modelRoot = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101115);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
camera.position.set(0, 1.5, 5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.autoRotate = false;
controls.autoRotateSpeed = 1.1;
controls.minDistance = 0.1;
controls.maxDistance = 10000;

const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(5, 8, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9fc8ff, 0.8);
fillLight.position.set(-6, 3, -5);
scene.add(fillLight);

const loader = new GLTFLoader();

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
  controls.minDistance = distance * 0.08;
  controls.maxDistance = distance * 8;
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
