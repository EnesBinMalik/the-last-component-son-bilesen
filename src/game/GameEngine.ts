/**
 * GameEngine.ts - Core 3D Game Engine
 * Manages Three.js WebGL renderer, RoomEnvironment studio reflections,
 * physics-based camera follow with spring inertia, player input, and world updates.
 * Adheres strictly to Three.js r160+ and Skill Guidelines.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CharacterController } from './character';
import { WorldManager, InteractiveTerminal } from './world';
import { foley } from '../audio/FoleyEngine';

// Pre-allocated math helpers to ensure ZERO GC per frame
const _camOffset = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _inputDir = new THREE.Vector3();

export type CameraMode = 'follow' | 'backpack' | 'cinematic';

export class GameEngine {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public character: CharacterController;
  public world: WorldManager;
  public clock: THREE.Clock;

  // Camera state
  public cameraMode: CameraMode = 'follow';
  private camFollowDistance: number = 4.8;
  private camFollowHeight: number = 2.4;
  private camCurrentPos: THREE.Vector3 = new THREE.Vector3(0, 3, 6);
  private camCurrentLookAt: THREE.Vector3 = new THREE.Vector3(0, 1.2, 0);

  // Input state
  public keys: { [key: string]: boolean } = {};
  public virtualJoystick: { x: number; y: number } = { x: 0, y: 0 };
  private frameId: number = 0;
  private isDestroyed: boolean = false;
  private isSoftwareGl: boolean = false;

  // Interaction callback
  public onNearbyTerminalChange?: (terminal: InteractiveTerminal | null) => void;
  private lastTerminal: InteractiveTerminal | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06090c);
    this.scene.fog = new THREE.FogExp2(0x06090c, 0.035);

    // 4. Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Camera Setup
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 120);
    this.camera.position.set(0, 3, 6);

    // 6. Lighting Rig (Key, Fill, Rim)
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keyLight.position.set(12, 22, 14);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x7fb3d5, 0x1a252f, 1.2);
    this.scene.add(hemiLight);

    // Soft Rim Light from opposite corner
    const rimLight = new THREE.DirectionalLight(0x00ccaa, 1.4);
    rimLight.position.set(-14, 12, -14);
    this.scene.add(rimLight);

    // 7. World & Character Initialization
    this.world = new WorldManager(this.scene);
    this.character = new CharacterController();
    this.scene.add(this.character.group);

    this.clock = new THREE.Clock();

    // Setup input listeners
    this.bindEvents();

    // Start Game Loop
    this.tick = this.tick.bind(this);
    this.tick();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    // F: Visor Light
    if (e.code === 'KeyF') {
      this.character.toggleVisorLight();
    }
    // Tab: Toggle Backpack Inspection Mode (Diegetic Zero-HUD check)
    if (e.code === 'Tab') {
      e.preventDefault();
      this.cameraMode = this.cameraMode === 'backpack' ? 'follow' : 'backpack';
      foley.playRelayClick(this.cameraMode === 'backpack');
    }
    // C: Toggle Cinematic View
    if (e.code === 'KeyC') {
      this.cameraMode = this.cameraMode === 'cinematic' ? 'follow' : 'cinematic';
      foley.playRelayClick(true);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  /**
   * Main Game Loop
   */
  private tick() {
    if (this.isDestroyed) return;

    const delta = Math.min(0.05, this.clock.getDelta());

    // 1. Compute movement direction from Keyboard + Virtual Joystick + Gamepad
    _inputDir.set(0, 0, 0);

    // Keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) _inputDir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) _inputDir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) _inputDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) _inputDir.x += 1;

    // Touch Virtual Joystick
    if (Math.abs(this.virtualJoystick.x) > 0.05 || Math.abs(this.virtualJoystick.y) > 0.05) {
      _inputDir.x += this.virtualJoystick.x;
      _inputDir.z += this.virtualJoystick.y;
    }

    // Gamepad API check
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      if (gamepads && gamepads[0]) {
        const gp = gamepads[0];
        const stickX = gp.axes[0] || 0;
        const stickY = gp.axes[1] || 0;
        if (Math.abs(stickX) > 0.15) _inputDir.x += stickX;
        if (Math.abs(stickY) > 0.15) _inputDir.z += stickY;
      }
    }

    if (_inputDir.lengthSq() > 1) {
      _inputDir.normalize();
    }

    const isSprint = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];

    // 2. Determine surface under Enes for organic footstep foley
    const region = this.world.activeRegionId;
    if (region === 'silicon') this.character.currentSurface = 'silicon';
    else if (region === 'copper') this.character.currentSurface = 'copper';
    else if (region === 'vacuum') this.character.currentSurface = 'vacuum';
    else if (region === 'magnetic') this.character.currentSurface = 'magnetic';
    else if (region === 'nitrogen') this.character.currentSurface = 'nitrogen';

    // 3. Update Character Physics & Animation
    this.character.update(delta, _inputDir, isSprint);

    // 4. Update World animations (Platters, fans, filaments)
    this.world.update(delta);

    // 5. Check nearby interactive terminals
    const nearby = this.world.getNearbyTerminal(this.character.position);
    if (nearby !== this.lastTerminal) {
      this.lastTerminal = nearby;
      if (this.onNearbyTerminalChange) {
        this.onNearbyTerminalChange(nearby);
      }
    }

    // 6. Camera Follow Physics with Spring Damping
    const charPos = this.character.position;
    const charRotY = this.character.rotationY;

    if (this.cameraMode === 'follow') {
      // Third-person over the shoulder (slightly offset to see the backpack CRT)
      const camAngle = charRotY + Math.PI;
      const targetCamX = charPos.x + Math.sin(camAngle) * this.camFollowDistance + Math.cos(charRotY) * 0.45;
      const targetCamZ = charPos.z + Math.cos(camAngle) * this.camFollowDistance - Math.sin(charRotY) * 0.45;
      const targetCamY = charPos.y + this.camFollowHeight;

      this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, targetCamX, 6.0, delta);
      this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, targetCamY, 6.0, delta);
      this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, targetCamZ, 6.0, delta);

      const lookTargetY = charPos.y + 1.35;
      this.camCurrentLookAt.x = THREE.MathUtils.damp(this.camCurrentLookAt.x, charPos.x, 7.0, delta);
      this.camCurrentLookAt.y = THREE.MathUtils.damp(this.camCurrentLookAt.y, lookTargetY, 7.0, delta);
      this.camCurrentLookAt.z = THREE.MathUtils.damp(this.camCurrentLookAt.z, charPos.z, 7.0, delta);

    } else if (this.cameraMode === 'backpack') {
      // Close-up Macro Inspection of the Quantum Oscilloscope CRT Screen
      const camAngle = charRotY + Math.PI;
      const targetCamX = charPos.x + Math.sin(camAngle) * 0.95;
      const targetCamZ = charPos.z + Math.cos(camAngle) * 0.95;
      const targetCamY = charPos.y + 1.38;

      this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, targetCamX, 9.0, delta);
      this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, targetCamY, 9.0, delta);
      this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, targetCamZ, 9.0, delta);

      const lookTargetY = charPos.y + 1.35;
      this.camCurrentLookAt.x = THREE.MathUtils.damp(this.camCurrentLookAt.x, charPos.x, 9.0, delta);
      this.camCurrentLookAt.y = THREE.MathUtils.damp(this.camCurrentLookAt.y, lookTargetY, 9.0, delta);
      this.camCurrentLookAt.z = THREE.MathUtils.damp(this.camCurrentLookAt.z, charPos.z, 9.0, delta);

    } else {
      // Cinematic rotating wide view
      const time = performance.now() * 0.0003;
      const targetCamX = charPos.x + Math.cos(time) * 10;
      const targetCamZ = charPos.z + Math.sin(time) * 10;
      const targetCamY = charPos.y + 5.5;

      this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, targetCamX, 3.0, delta);
      this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, targetCamY, 3.0, delta);
      this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, targetCamZ, 3.0, delta);

      this.camCurrentLookAt.x = charPos.x;
      this.camCurrentLookAt.y = charPos.y + 1.2;
      this.camCurrentLookAt.z = charPos.z;
    }

    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLookAt);

    // 7. Render Frame
    this.renderer.render(this.scene, this.camera);

    // Frame pacing on software GL
    if (this.isSoftwareGl) {
      window.setTimeout(() => {
        if (!this.isDestroyed) this.frameId = requestAnimationFrame(this.tick);
      }, 70);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  public setRegion(regionId: string) {
    this.world.switchRegion(regionId);
    // Reset player position to center of region
    this.character.position.set(0, 0, 0);
    this.character.velocity.set(0, 0, 0);
    this.character.group.position.set(0, 0, 0);
    foley.setRegionAcoustics(regionId);
    foley.playRelayClick(true);
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    this.unbindEvents();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
