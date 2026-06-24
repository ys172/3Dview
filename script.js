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
const debugPanel = document.querySelector("#debugPanel");
const debugToggle = document.querySelector("#debugToggle");
const backgroundSwatches = document.querySelector("#backgroundSwatches");
const materialSwatches = document.querySelector("#materialSwatches");
const lightPresetsEl = document.querySelector("#lightPresets");
const lightDownButton = document.querySelector("#lightDownButton");
const lightUpButton = document.querySelector("#lightUpButton");
const lightBoostValue = document.querySelector("#lightBoostValue");
const metalnessRange = document.querySelector("#metalnessRange");
const roughnessRange = document.querySelector("#roughnessRange");
const envMapIntensityRange = document.querySelector("#envMapIntensityRange");
const metalnessValue = document.querySelector("#metalnessValue");
const roughnessValue = document.querySelector("#roughnessValue");
const envMapIntensityValue = document.querySelector("#envMapIntensityValue");
const lightControlFields = {
  a: {
    angleRange: document.querySelector("#lightAAngleRange"),
    heightRange: document.querySelector("#lightAHeightRange"),
    radiusRange: document.querySelector("#lightARadiusRange"),
    intensityRange: document.querySelector("#lightAIntensityRange"),
    colorInput: document.querySelector("#lightAColorInput"),
    angleValue: document.querySelector("#lightAAngleValue"),
    heightValue: document.querySelector("#lightAHeightValue"),
    radiusValue: document.querySelector("#lightARadiusValue"),
    intensityValue: document.querySelector("#lightAIntensityValue"),
    colorValue: document.querySelector("#lightAColorValue"),
  },
  b: {
    angleRange: document.querySelector("#lightBAngleRange"),
    heightRange: document.querySelector("#lightBHeightRange"),
    radiusRange: document.querySelector("#lightBRadiusRange"),
    intensityRange: document.querySelector("#lightBIntensityRange"),
    colorInput: document.querySelector("#lightBColorInput"),
    angleValue: document.querySelector("#lightBAngleValue"),
    heightValue: document.querySelector("#lightBHeightValue"),
    radiusValue: document.querySelector("#lightBRadiusValue"),
    intensityValue: document.querySelector("#lightBIntensityValue"),
    colorValue: document.querySelector("#lightBColorValue"),
  },
};
const configOutput = document.querySelector("#configOutput");
const copyConfigButton = document.querySelector("#copyConfigButton");
const copyStatus = document.querySelector("#copyStatus");

const DEFAULT_LIGHT_A = {
  angle: 45,
  height: 30,
  radius: 28,
  intensity: 2.2,
  color: "#FFFFFF",
};

const DEFAULT_LIGHT_B = {
  angle: 218,
  height: 18,
  radius: 32,
  intensity: 1.4,
  color: "#5C8DFF",
};

const BACKGROUND_COLORS = ["#1A1A25", "#000000", "#111827", "#2B2B2B", "#8FAF8F", "#5C8DFF"];
const MATERIAL_COLORS = ["#22324A", "#2F4058", "#31445F", "#5F718A", "#8FA8C8", "#A7B5C8"];
const LIGHT_PRESETS = {
  "Soft Blue": {
    ambientIntensity: 0.45,
    hemisphereIntensity: 0.8,
    toneMappingExposure: 1.15,
    frontSoftIntensity: 0.8,
    sideRimIntensity: 0.9,
    lightA: { ...DEFAULT_LIGHT_A },
    lightB: { ...DEFAULT_LIGHT_B },
  },
  "Studio White": {
    ambientIntensity: 0.35,
    hemisphereIntensity: 0.6,
    toneMappingExposure: 1.1,
    frontSoftIntensity: 1.0,
    sideRimIntensity: 0.55,
    lightA: { angle: 35, height: 34, radius: 30, intensity: 2.4, color: "#FFFFFF" },
    lightB: { angle: 215, height: 16, radius: 34, intensity: 0.8, color: "#BFD7FF" },
  },
  "Dark Glass": {
    ambientIntensity: 0.25,
    hemisphereIntensity: 0.45,
    toneMappingExposure: 1.0,
    frontSoftIntensity: 0.45,
    sideRimIntensity: 1.15,
    lightA: { angle: 52, height: 38, radius: 34, intensity: 1.55, color: "#DCEBFF" },
    lightB: { angle: 226, height: 20, radius: 38, intensity: 1.15, color: "#4F8CFF" },
  },
  "Bright Display": {
    ambientIntensity: 0.55,
    hemisphereIntensity: 1.0,
    toneMappingExposure: 1.25,
    frontSoftIntensity: 1.15,
    sideRimIntensity: 1.1,
    lightA: { angle: 38, height: 36, radius: 30, intensity: 2.5, color: "#FFFFFF" },
    lightB: { angle: 220, height: 22, radius: 36, intensity: 1.8, color: "#6EA8FF" },
  },
};

const previewConfig = {
  backgroundColor: "#1A1A25",
  materialColor: "#31445F",
  metalness: 0.75,
  roughness: 0.22,
  envMapIntensity: 1.6,
  lightPreset: "Soft Blue",
  lightBoost: 1,
  ...LIGHT_PRESETS["Soft Blue"],
  lightA: { ...LIGHT_PRESETS["Soft Blue"].lightA },
  lightB: { ...LIGHT_PRESETS["Soft Blue"].lightB },
};

let initialCameraPosition = new THREE.Vector3();
let initialControlsTarget = new THREE.Vector3();
let modelRoot = null;
const modelMaterials = new Set();

const scene = new THREE.Scene();
scene.background = new THREE.Color(previewConfig.backgroundColor);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
camera.position.set(0, 1.5, 5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(previewConfig.backgroundColor);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = previewConfig.toneMappingExposure;

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

const ambientLight = new THREE.AmbientLight(0x9dbdff, previewConfig.ambientIntensity);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xbfd7ff, 0x111827, previewConfig.hemisphereIntensity);
scene.add(hemisphereLight);

const lightTarget = new THREE.Object3D();
lightTarget.position.set(0, 0, 0);
scene.add(lightTarget);

const keyLight = new THREE.DirectionalLight(previewConfig.lightA.color, previewConfig.lightA.intensity);
keyLight.target = lightTarget;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(previewConfig.lightB.color, previewConfig.lightB.intensity);
fillLight.target = lightTarget;
scene.add(fillLight);

const frontSoftLight = new THREE.DirectionalLight(0xdcebff, previewConfig.frontSoftIntensity);
frontSoftLight.position.set(0, 12, 30);
scene.add(frontSoftLight);

const sideRimLight = new THREE.DirectionalLight(0x78aaff, previewConfig.sideRimIntensity);
sideRimLight.position.set(-28, 10, 16);
scene.add(sideRimLight);

const loader = new GLTFLoader();

function enhanceMaterial(material) {
  if (material.color) {
    material.color.set(previewConfig.materialColor);
  }

  material.metalness = previewConfig.metalness;
  material.roughness = previewConfig.roughness;
  material.envMapIntensity = previewConfig.envMapIntensity;
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

function registerMaterial(material) {
  modelMaterials.add(material);
  enhanceMaterial(material);
}

function enhanceModelMaterials(model) {
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    object.castShadow = true;
    object.receiveShadow = true;

    if (Array.isArray(object.material)) {
      object.material.forEach(registerMaterial);
      return;
    }

    registerMaterial(object.material);
  });
}

function formatNumber(value) {
  return Number(value).toFixed(2);
}

function updateMaterials() {
  modelMaterials.forEach(enhanceMaterial);
}

function updateBackground() {
  const color = new THREE.Color(previewConfig.backgroundColor);
  scene.background = color;
  renderer.setClearColor(color);
  document.documentElement.style.setProperty("--viewer-bg", previewConfig.backgroundColor);
  document.documentElement.style.backgroundColor = previewConfig.backgroundColor;
  document.body.style.backgroundColor = previewConfig.backgroundColor;
}

function setLightPosition(light, lightConfig) {
  const rad = THREE.MathUtils.degToRad(lightConfig.angle);
  light.position.set(
    Math.cos(rad) * lightConfig.radius,
    lightConfig.height,
    Math.sin(rad) * lightConfig.radius,
  );
  light.target = lightTarget;
  light.target.updateMatrixWorld();
}

function updateLights() {
  const boost = previewConfig.lightBoost;

  ambientLight.intensity = previewConfig.ambientIntensity * boost;
  hemisphereLight.intensity = previewConfig.hemisphereIntensity * boost;
  keyLight.intensity = previewConfig.lightA.intensity * boost;
  keyLight.color.set(previewConfig.lightA.color);
  setLightPosition(keyLight, previewConfig.lightA);
  fillLight.intensity = previewConfig.lightB.intensity * boost;
  fillLight.color.set(previewConfig.lightB.color);
  setLightPosition(fillLight, previewConfig.lightB);
  frontSoftLight.intensity = previewConfig.frontSoftIntensity * boost;
  sideRimLight.intensity = previewConfig.sideRimIntensity * boost;
  renderer.toneMappingExposure = previewConfig.toneMappingExposure;
}

function lightConfigText(lightConfig) {
  return `{
    angle: ${formatNumber(lightConfig.angle)},
    height: ${formatNumber(lightConfig.height)},
    radius: ${formatNumber(lightConfig.radius)},
    intensity: ${formatNumber(lightConfig.intensity)},
    color: '${lightConfig.color}'
  }`;
}

function configText() {
  return `const PREVIEW_CONFIG = {
  backgroundColor: '${previewConfig.backgroundColor}',
  materialColor: '${previewConfig.materialColor}',
  metalness: ${formatNumber(previewConfig.metalness)},
  roughness: ${formatNumber(previewConfig.roughness)},
  envMapIntensity: ${formatNumber(previewConfig.envMapIntensity)},
  lightPreset: '${previewConfig.lightPreset}',
  ambientIntensity: ${formatNumber(previewConfig.ambientIntensity * previewConfig.lightBoost)},
  hemisphereIntensity: ${formatNumber(previewConfig.hemisphereIntensity * previewConfig.lightBoost)},
  lightA: ${lightConfigText({
    ...previewConfig.lightA,
    intensity: previewConfig.lightA.intensity * previewConfig.lightBoost,
  })},
  lightB: ${lightConfigText({
    ...previewConfig.lightB,
    intensity: previewConfig.lightB.intensity * previewConfig.lightBoost,
  })},
  toneMappingExposure: ${formatNumber(previewConfig.toneMappingExposure)}
};`;
}

function updateActiveStates() {
  document.querySelectorAll("[data-background-color]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.backgroundColor === previewConfig.backgroundColor);
  });

  document.querySelectorAll("[data-material-color]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.materialColor === previewConfig.materialColor);
  });

  document.querySelectorAll("[data-light-preset]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lightPreset === previewConfig.lightPreset);
  });
}

function updateLightControlValues(lightKey, lightConfig) {
  const fields = lightControlFields[lightKey];

  fields.angleRange.value = String(lightConfig.angle);
  fields.heightRange.value = String(lightConfig.height);
  fields.radiusRange.value = String(lightConfig.radius);
  fields.intensityRange.value = String(lightConfig.intensity);
  fields.colorInput.value = lightConfig.color.toLowerCase();
  fields.angleValue.textContent = formatNumber(lightConfig.angle);
  fields.heightValue.textContent = formatNumber(lightConfig.height);
  fields.radiusValue.textContent = formatNumber(lightConfig.radius);
  fields.intensityValue.textContent = formatNumber(lightConfig.intensity);
  fields.colorValue.textContent = lightConfig.color;
}

function updateDebugOutput() {
  metalnessRange.value = String(previewConfig.metalness);
  roughnessRange.value = String(previewConfig.roughness);
  envMapIntensityRange.value = String(previewConfig.envMapIntensity);
  metalnessValue.textContent = formatNumber(previewConfig.metalness);
  roughnessValue.textContent = formatNumber(previewConfig.roughness);
  envMapIntensityValue.textContent = formatNumber(previewConfig.envMapIntensity);
  updateLightControlValues("a", previewConfig.lightA);
  updateLightControlValues("b", previewConfig.lightB);
  lightBoostValue.textContent = `${formatNumber(previewConfig.lightBoost)}x`;
  configOutput.textContent = configText();
  updateActiveStates();
}

function applyPreviewConfig() {
  updateBackground();
  updateMaterials();
  updateLights();
  updateDebugOutput();
}

function createColorSwatch(color, type) {
  const button = document.createElement("button");
  button.className = "color-swatch";
  button.type = "button";
  button.style.setProperty("--swatch-color", color);
  button.setAttribute("aria-label", `${type} ${color}`);

  if (type === "Background") {
    button.dataset.backgroundColor = color;
    button.addEventListener("click", () => {
      previewConfig.backgroundColor = color;
      applyPreviewConfig();
    });
  } else {
    button.dataset.materialColor = color;
    button.addEventListener("click", () => {
      previewConfig.materialColor = color;
      applyPreviewConfig();
    });
  }

  return button;
}

function getLightConfig(lightKey) {
  return lightKey === "a" ? previewConfig.lightA : previewConfig.lightB;
}

function bindLightControls(lightKey) {
  const fields = lightControlFields[lightKey];
  const bindRange = (input, property) => {
    input.addEventListener("input", () => {
      getLightConfig(lightKey)[property] = Number(input.value);
      applyPreviewConfig();
    });
  };

  bindRange(fields.angleRange, "angle");
  bindRange(fields.heightRange, "height");
  bindRange(fields.radiusRange, "radius");
  bindRange(fields.intensityRange, "intensity");

  fields.colorInput.addEventListener("input", () => {
    getLightConfig(lightKey).color = fields.colorInput.value.toUpperCase();
    applyPreviewConfig();
  });
}

function applyLightPreset(name) {
  const preset = LIGHT_PRESETS[name];
  Object.assign(previewConfig, preset, {
    lightPreset: name,
    lightBoost: 1,
    lightA: { ...preset.lightA },
    lightB: { ...preset.lightB },
  });
  applyPreviewConfig();
}

function initializeDebugPanel() {
  BACKGROUND_COLORS.forEach((color) => {
    backgroundSwatches.appendChild(createColorSwatch(color, "Background"));
  });

  MATERIAL_COLORS.forEach((color) => {
    materialSwatches.appendChild(createColorSwatch(color, "Material"));
  });

  Object.keys(LIGHT_PRESETS).forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.dataset.lightPreset = name;
    button.addEventListener("click", () => {
      applyLightPreset(name);
    });
    lightPresetsEl.appendChild(button);
  });

  debugToggle.addEventListener("click", () => {
    const isCollapsed = debugPanel.classList.toggle("is-collapsed");
    debugToggle.setAttribute("aria-expanded", String(!isCollapsed));
    debugToggle.textContent = isCollapsed ? "Tune" : "Hide Panel";
  });

  lightDownButton.addEventListener("click", () => {
    previewConfig.lightBoost = Math.max(0.2, previewConfig.lightBoost - 0.1);
    applyPreviewConfig();
  });

  lightUpButton.addEventListener("click", () => {
    previewConfig.lightBoost = Math.min(2.4, previewConfig.lightBoost + 0.1);
    applyPreviewConfig();
  });

  metalnessRange.addEventListener("input", () => {
    previewConfig.metalness = Number(metalnessRange.value);
    applyPreviewConfig();
  });

  roughnessRange.addEventListener("input", () => {
    previewConfig.roughness = Number(roughnessRange.value);
    applyPreviewConfig();
  });

  envMapIntensityRange.addEventListener("input", () => {
    previewConfig.envMapIntensity = Number(envMapIntensityRange.value);
    applyPreviewConfig();
  });

  bindLightControls("a");
  bindLightControls("b");

  copyConfigButton.addEventListener("click", async () => {
    const text = configText();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      copyStatus.textContent = "Copied current config.";
      copyConfigButton.classList.add("is-copied");
      window.setTimeout(() => copyConfigButton.classList.remove("is-copied"), 900);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");
      textarea.remove();

      copyStatus.textContent = copied
        ? "Copied current config."
        : "Copy failed. Select the config text manually.";
      copyConfigButton.classList.toggle("is-copied", copied);
      window.setTimeout(() => copyConfigButton.classList.remove("is-copied"), 900);
    }
  });

  applyPreviewConfig();
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

initializeDebugPanel();

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
