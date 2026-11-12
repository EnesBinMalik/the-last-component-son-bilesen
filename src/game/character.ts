/**
 * character.ts - Enes Öztürk (Cyber-Archaeologist & Hardware Engineer)
 * Handcrafted 3D character model, momentum physics, dynamic backpack inertia,
 * trailing cable physics, diegetic CRT oscilloscope backpack, and analog needle gauges.
 */

import * as THREE from 'three';
import { createCRTGridTexture, createBrushedMetalTexture, createWeatheredCopperTexture } from './textures';
import { foley } from '../audio/FoleyEngine';

export interface PlayerStats {
  health: number; // 0 - 100
  stamina: number; // 0 - 100
  voltage: number; // 0 - 24V (current bus reading)
  temperature: number; // 20 - 95 °C
  carriedComponents: number; // item count
  totalWeightKg: number; // 24kg + count * 3.5
  isSprinting: boolean;
  isClimbing: boolean;
  isInspecting: boolean;
  visorLightOn: boolean;
}

export class CharacterController {
  public group: THREE.Group;
  public backpackGroup: THREE.Group;
  public visorLight: THREE.SpotLight;
  public visorLightTarget: THREE.Object3D;

  // Hierarchical body parts
  private torso: THREE.Mesh;
  private head: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;

  // Diegetic Backpack Elements
  private crtMesh: THREE.Mesh;
  private crtCanvas: HTMLCanvasElement;
  private crtCtx: CanvasRenderingContext2D;
  private crtTexture: THREE.CanvasTexture;
  private needleVoltage: THREE.Mesh;
  private needleTemp: THREE.Mesh;
  private needleWeight: THREE.Mesh;

  // Trailing cables with spring/inertia physics
  private cable1Points: THREE.Vector3[] = [];
  private cable2Points: THREE.Vector3[] = [];
  private cable1Mesh: THREE.Line;
  private cable2Mesh: THREE.Line;

  // Physics & Momentum state
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotationY: number = 0;
  private targetRotationY: number = 0;
  private backpackSway: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private lastVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private walkCycleTime: number = 0;
  private footstepTimer: number = 0;

  // Smoke particles on backpack
  private smokeParticles: THREE.Points;
  private smokePositions: Float32Array;
  private smokeAlphas: Float32Array;

  // Current surface for organic foley
  public currentSurface: 'copper' | 'silicon' | 'nitrogen' | 'magnetic' | 'vacuum' = 'silicon';

  // Stats
  public stats: PlayerStats = {
    health: 94,
    stamina: 88,
    voltage: 12.0,
    temperature: 38.5,
    carriedComponents: 3,
    totalWeightKg: 34.5,
    isSprinting: false,
    isClimbing: false,
    isInspecting: false,
    visorLightOn: true,
  };

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'EnesOzturk';

    // Materials
    const copperTex = createWeatheredCopperTexture();
    const metalTex = createBrushedMetalTexture();

    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x222a30,
      roughness: 0.75,
      metalness: 0.15,
    });

    const harnessMat = new THREE.MeshStandardMaterial({
      color: 0x8a4b24,
      map: copperTex,
      roughness: 0.45,
      metalness: 0.65,
    });

    const armorPlatesMat = new THREE.MeshStandardMaterial({
      color: 0x3d464f,
      map: metalTex,
      roughness: 0.35,
      metalness: 0.85,
    });

    const visorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x00ffaa,
      emissive: 0x004422,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.4,
    });

    // 1. Torso & Harness
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    this.torso = new THREE.Mesh(torsoGeo, suitMat);
    this.torso.position.y = 1.15;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);

    // Harness Straps across chest
    const strapGeo = new THREE.BoxGeometry(0.58, 0.12, 0.38);
    const chestStrap = new THREE.Mesh(strapGeo, harnessMat);
    chestStrap.position.set(0, 0.1, 0);
    this.torso.add(chestStrap);

    // Carabiners & Tool Pouch on hip
    const pouchGeo = new THREE.BoxGeometry(0.18, 0.16, 0.14);
    const pouchL = new THREE.Mesh(pouchGeo, harnessMat);
    pouchL.position.set(-0.32, -0.28, 0.05);
    this.torso.add(pouchL);

    const pouchR = new THREE.Mesh(pouchGeo, harnessMat);
    pouchR.position.set(0.32, -0.28, 0.05);
    this.torso.add(pouchR);

    // 2. Head with Cyber-Archaeologist Helmet
    this.head = new THREE.Group();
    this.head.position.set(0, 1.7, 0);

    const helmetGeo = new THREE.SphereGeometry(0.24, 16, 16);
    helmetGeo.scale(1, 1.1, 1.05);
    const helmet = new THREE.Mesh(helmetGeo, armorPlatesMat);
    helmet.castShadow = true;
    this.head.add(helmet);

    // Visor Goggles with illuminated scanner strip
    const visorGeo = new THREE.BoxGeometry(0.32, 0.1, 0.16);
    const visor = new THREE.Mesh(visorGeo, visorGlassMat);
    visor.position.set(0, 0.02, 0.18);
    this.head.add(visor);

    // Visor Headlamp / Spotlight
    this.visorLightTarget = new THREE.Object3D();
    this.visorLightTarget.position.set(0, 0, 8);
    this.head.add(this.visorLightTarget);

    this.visorLight = new THREE.SpotLight(0xaaffdd, 4.5, 25, Math.PI / 5, 0.45, 1.2);
    this.visorLight.position.set(0, 0.05, 0.22);
    this.visorLight.target = this.visorLightTarget;
    this.visorLight.castShadow = true;
    this.visorLight.shadow.bias = -0.0005;
    this.head.add(this.visorLight);

    this.group.add(this.head);

    // 3. Legs & Kinetic Boots
    const legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.2);
    const bootGeo = new THREE.BoxGeometry(0.2, 0.2, 0.32);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.18, 0.8, 0);
    const lLegMesh = new THREE.Mesh(legGeo, suitMat);
    lLegMesh.position.y = -0.32;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);
    const lBoot = new THREE.Mesh(bootGeo, armorPlatesMat);
    lBoot.position.set(0, -0.65, 0.05);
    lBoot.castShadow = true;
    this.leftLeg.add(lBoot);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.18, 0.8, 0);
    const rLegMesh = new THREE.Mesh(legGeo, suitMat);
    rLegMesh.position.y = -0.32;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);
    const rBoot = new THREE.Mesh(bootGeo, armorPlatesMat);
    rBoot.position.set(0, -0.65, 0.05);
    rBoot.castShadow = true;
    this.rightLeg.add(rBoot);
    this.group.add(this.rightLeg);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.6, 0.16);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 1.45, 0);
    const lArmMesh = new THREE.Mesh(armGeo, suitMat);
    lArmMesh.position.y = -0.3;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 1.45, 0);
    const rArmMesh = new THREE.Mesh(armGeo, suitMat);
    rArmMesh.position.y = -0.3;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);

    // Right hand holds the Multimeter Probe!
    const probeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8);
    const probeMat = new THREE.MeshStandardMaterial({ color: 0xdd2222, metalness: 0.8 });
    const probe = new THREE.Mesh(probeGeo, probeMat);
    probe.rotation.x = Math.PI / 2;
    probe.position.set(0, -0.58, 0.1);
    this.rightArm.add(probe);

    const probeTipGeo = new THREE.ConeGeometry(0.015, 0.08, 8);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, metalness: 0.95 });
    const tip = new THREE.Mesh(probeTipGeo, tipMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.set(0, -0.58, 0.26);
    this.rightArm.add(tip);

    this.group.add(this.rightArm);

    // =========================================================================
    // 5. HEAVY QUANTUM OSCILLOSCOPE BACKPACK (Diegetic Zero-HUD Core)
    // =========================================================================
    this.backpackGroup = new THREE.Group();
    this.backpackGroup.position.set(0, 1.25, -0.28);

    // Main rugged chassis
    const chassisGeo = new THREE.BoxGeometry(0.52, 0.62, 0.26);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x2e363d,
      map: metalTex,
      roughness: 0.4,
      metalness: 0.8,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.castShadow = true;
    this.backpackGroup.add(chassis);

    // Heat pipe cooling radiators on sides
    const radiatorGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.58, 8);
    const radL = new THREE.Mesh(radiatorGeo, harnessMat);
    radL.position.set(-0.28, 0, 0);
    this.backpackGroup.add(radL);
    const radR = new THREE.Mesh(radiatorGeo, harnessMat);
    radR.position.set(0.28, 0, 0);
    this.backpackGroup.add(radR);

    // Top exhaust chimney vents
    const ventGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.1, 10);
    const ventL = new THREE.Mesh(ventGeo, armorPlatesMat);
    ventL.position.set(-0.16, 0.34, 0);
    this.backpackGroup.add(ventL);
    const ventR = new THREE.Mesh(ventGeo, armorPlatesMat);
    ventR.position.set(0.16, 0.34, 0);
    this.backpackGroup.add(ventR);

    // =========================================================================
    // DIEGETIC CRT SCREEN ON BACKPACK
    // =========================================================================
    this.crtCanvas = document.createElement('canvas');
    this.crtCanvas.width = 256;
    this.crtCanvas.height = 192;
    this.crtCtx = this.crtCanvas.getContext('2d')!;
    this.crtTexture = new THREE.CanvasTexture(this.crtCanvas);
    this.crtTexture.colorSpace = THREE.SRGBColorSpace;

    const crtScreenGeo = new THREE.PlaneGeometry(0.34, 0.26);
    const crtScreenMat = new THREE.MeshBasicMaterial({
      map: this.crtTexture,
      toneMapped: false,
    });
    this.crtMesh = new THREE.Mesh(crtScreenGeo, crtScreenMat);
    // Faces backwards so someone viewing Enes from behind sees the live stats!
    this.crtMesh.rotation.y = Math.PI;
    this.crtMesh.position.set(0, 0.12, -0.132);
    this.backpackGroup.add(this.crtMesh);

    // Screen bezel & glass curvature rim
    const bezelGeo = new THREE.RingGeometry(0.18, 0.22, 4);
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x111618, roughness: 0.3 });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.rotation.y = Math.PI;
    bezel.position.set(0, 0.12, -0.133);
    this.backpackGroup.add(bezel);

    // =========================================================================
    // 3 ANALOG NEEDLE GAUGES (VOLTAGE, TEMPERATURE, WEIGHT)
    // =========================================================================
    const gaugeDialMat = new THREE.MeshBasicMaterial({ color: 0x0a140d });
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xff3322 });

    const createGauge = (xPos: number, yPos: number) => {
      const dialGeo = new THREE.CircleGeometry(0.045, 16);
      const dial = new THREE.Mesh(dialGeo, gaugeDialMat);
      dial.rotation.y = Math.PI;
      dial.position.set(xPos, yPos, -0.132);
      this.backpackGroup.add(dial);

      const needleGeo = new THREE.PlaneGeometry(0.006, 0.04);
      needleGeo.translate(0, 0.02, 0); // pivot at bottom
      const needle = new THREE.Mesh(needleGeo, needleMat);
      needle.rotation.y = Math.PI;
      needle.position.set(xPos, yPos, -0.134);
      this.backpackGroup.add(needle);
      return needle;
    };

    this.needleVoltage = createGauge(-0.14, -0.16);
    this.needleTemp = createGauge(0, -0.16);
    this.needleWeight = createGauge(0.14, -0.16);

    // =========================================================================
    // TRAILING CABLES (Physics-simulated trailing wires)
    // =========================================================================
    const cableMat = new THREE.LineBasicMaterial({ color: 0x1a2024, linewidth: 2 });
    for (let i = 0; i < 6; i++) {
      this.cable1Points.push(new THREE.Vector3(-0.2, 0.8 - i * 0.12, -0.2 - i * 0.05));
      this.cable2Points.push(new THREE.Vector3(0.2, 0.8 - i * 0.12, -0.2 - i * 0.05));
    }
    const cableGeo1 = new THREE.BufferGeometry().setFromPoints(this.cable1Points);
    const cableGeo2 = new THREE.BufferGeometry().setFromPoints(this.cable2Points);
    this.cable1Mesh = new THREE.Line(cableGeo1, cableMat);
    this.cable2Mesh = new THREE.Line(cableGeo2, cableMat);
    this.group.add(this.cable1Mesh);
    this.group.add(this.cable2Mesh);

    // Smoke particle system for overheating / damage
    const smokeCount = 30;
    this.smokePositions = new Float32Array(smokeCount * 3);
    this.smokeAlphas = new Float32Array(smokeCount);
    for (let i = 0; i < smokeCount; i++) {
      this.smokePositions[i * 3] = (Math.random() - 0.5) * 0.2;
      this.smokePositions[i * 3 + 1] = 1.4 + Math.random() * 0.5;
      this.smokePositions[i * 3 + 2] = -0.3 + (Math.random() - 0.5) * 0.2;
      this.smokeAlphas[i] = Math.random();
    }
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x8899aa,
      size: 0.18,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.group.add(this.smokeParticles);

    this.group.add(this.backpackGroup);
  }

  /**
   * Update live CRT monitor on Enes's backpack
   */
  private updateCRTDisplay(time: number) {
    const ctx = this.crtCtx;
    const w = this.crtCanvas.width;
    const h = this.crtCanvas.height;

    // Dark green phosphor background
    ctx.fillStyle = '#021206';
    ctx.fillRect(0, 0, w, h);

    // Phosphor grid
    ctx.strokeStyle = 'rgba(40, 180, 80, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Oscilloscope Waveform (Heartbeat / Power wave)
    // Wave amplitude corresponds to Stamina & Health; spikes when sprinting or shocked
    const centerY = h / 2 + 10;
    const healthFactor = this.stats.health / 100;
    const staminaFactor = this.stats.stamina / 100;
    const speed = this.velocity.length();

    ctx.strokeStyle = healthFactor > 0.3 ? '#33ff77' : '#ff4433';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath();

    for (let x = 0; x < w; x += 2) {
      // EKG pulse + sine wave
      const waveFreq = (time * 6 + x * 0.05) % (Math.PI * 2);
      let yOffset = Math.sin(waveFreq) * 14 * healthFactor;

      // Heartbeat pulse blip every cycle
      const cyclePos = (time * (1.2 + speed * 1.5) + x / w) % 1;
      if (cyclePos > 0.45 && cyclePos < 0.55) {
        yOffset += Math.sin((cyclePos - 0.45) * Math.PI * 10) * 35 * healthFactor;
      }

      const y = centerY + yOffset;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Diegetic Header Text
    ctx.fillStyle = '#88ffaa';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('QUANTUM OSCILLOSCOPE [Q-OSC 840]', 12, 20);

    // Readout metrics
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(160, 255, 190, 0.9)';
    ctx.fillText(`V: ${this.stats.voltage.toFixed(1)}V`, 12, 38);
    ctx.fillText(`TMP: ${this.stats.temperature.toFixed(1)}°C`, 90, 38);
    ctx.fillText(`WGT: ${this.stats.totalWeightKg.toFixed(1)}kg`, 175, 38);

    // Status bar at bottom
    ctx.fillStyle = this.stats.health > 40 ? '#00ee66' : '#ee3322';
    ctx.fillRect(12, h - 14, (w - 24) * (this.stats.stamina / 100), 5);

    this.crtTexture.needsUpdate = true;
  }

  /**
   * Main per-frame update loop
   */
  update(delta: number, inputMove: THREE.Vector3, isSprintKey: boolean) {
    const time = performance.now() * 0.001;

    // 1. Calculate dynamic weight and maximum velocity
    // Weight = base 24kg + count * 3.5kg
    this.stats.totalWeightKg = 24.0 + this.stats.carriedComponents * 3.5;
    const weightPenalty = Math.min(0.55, (this.stats.totalWeightKg - 24.0) * 0.035);

    let maxSpeed = 3.6 * (1.0 - weightPenalty);
    this.stats.isSprinting = false;

    if (isSprintKey && inputMove.lengthSq() > 0.01 && this.stats.stamina > 10) {
      maxSpeed = 6.8 * (1.0 - weightPenalty);
      this.stats.isSprinting = true;
      this.stats.stamina = Math.max(0, this.stats.stamina - delta * 15);
      this.stats.temperature = Math.min(88, this.stats.temperature + delta * 3.5);
    } else {
      this.stats.stamina = Math.min(100, this.stats.stamina + delta * 20);
      this.stats.temperature = Math.max(32, this.stats.temperature - delta * 2.0);
    }

    // 2. Momentum & Velocity damping
    const targetVel = inputMove.clone().multiplyScalar(maxSpeed);
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVel.x, 8.5, delta);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVel.z, 8.5, delta);

    // Apply movement
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.group.position.copy(this.position);

    // 3. Dynamic Rotation
    if (inputMove.lengthSq() > 0.001) {
      this.targetRotationY = Math.atan2(this.velocity.x, this.velocity.z);
    }
    // Smooth angle interpolation
    const diff = THREE.MathUtils.euclideanModulo(this.targetRotationY - this.rotationY + Math.PI, Math.PI * 2) - Math.PI;
    this.rotationY += diff * Math.min(1, delta * 10);
    this.group.rotation.y = this.rotationY;

    // 4. Inertia & Backpack Sway
    // Compute acceleration (change in velocity)
    const accel = this.velocity.clone().sub(this.lastVelocity).divideScalar(delta || 0.016);
    this.lastVelocity.copy(this.velocity);

    // Oscilloscope swings opposite to acceleration & banking into turns
    const targetSwayZ = -accel.z * 0.012;
    const targetSwayX = accel.x * 0.012;
    this.backpackSway.x = THREE.MathUtils.damp(this.backpackSway.x, targetSwayX, 10, delta);
    this.backpackSway.z = THREE.MathUtils.damp(this.backpackSway.z, targetSwayZ, 10, delta);
    this.backpackGroup.rotation.z = this.backpackSway.x;
    this.backpackGroup.rotation.x = this.backpackSway.z;

    // 5. Walking / Running Keyframe Animation
    const speed = this.velocity.length();
    if (speed > 0.2) {
      this.walkCycleTime += delta * speed * 2.8;
      const legSwing = Math.sin(this.walkCycleTime) * 0.65;
      const armSwing = Math.sin(this.walkCycleTime) * 0.55;

      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -armSwing;
      this.rightArm.rotation.x = armSwing * 0.6; // right arm holds multimeter probe

      // Torso bobbing
      this.torso.position.y = 1.15 + Math.abs(Math.sin(this.walkCycleTime * 2)) * 0.04;

      // Footstep foley triggers
      this.footstepTimer += delta * speed;
      if (this.footstepTimer > 1.8) {
        this.footstepTimer = 0;
        foley.playFootstep(this.currentSurface);

        // Haptic feedback simulation if supported
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(this.stats.isSprinting ? 25 : 12);
        }
      }
    } else {
      // Idle breathing pose
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 8, delta);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 8, delta);
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0, 8, delta);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0, 8, delta);
      this.torso.position.y = 1.15 + Math.sin(time * 2.5) * 0.015;
    }

    // 6. Update trailing cables with inertia physics
    for (let i = 1; i < this.cable1Points.length; i++) {
      const segLag = i * 0.03;
      this.cable1Points[i].x = THREE.MathUtils.damp(
        this.cable1Points[i].x,
        -0.2 - this.backpackSway.x * i * 0.2,
        12 - i,
        delta
      );
      this.cable1Points[i].z = THREE.MathUtils.damp(
        this.cable1Points[i].z,
        -0.2 - speed * segLag - this.backpackSway.z * i * 0.2,
        12 - i,
        delta
      );

      this.cable2Points[i].x = THREE.MathUtils.damp(
        this.cable2Points[i].x,
        0.2 - this.backpackSway.x * i * 0.2,
        12 - i,
        delta
      );
      this.cable2Points[i].z = THREE.MathUtils.damp(
        this.cable2Points[i].z,
        -0.2 - speed * segLag - this.backpackSway.z * i * 0.2,
        12 - i,
        delta
      );
    }
    this.cable1Mesh.geometry.setFromPoints(this.cable1Points);
    this.cable2Mesh.geometry.setFromPoints(this.cable2Points);

    // 7. Update Diegetic Backpack Needle Gauges
    // Needle angle: -2.2 rad to +2.2 rad
    const vAngle = ((this.stats.voltage / 24) * 2 - 1) * 2.0;
    const tAngle = (((this.stats.temperature - 20) / 75) * 2 - 1) * 2.0;
    const wAngle = (((this.stats.totalWeightKg - 20) / 40) * 2 - 1) * 2.0;

    this.needleVoltage.rotation.z = THREE.MathUtils.damp(this.needleVoltage.rotation.z, vAngle, 8, delta);
    this.needleTemp.rotation.z = THREE.MathUtils.damp(this.needleTemp.rotation.z, tAngle, 8, delta);
    this.needleWeight.rotation.z = THREE.MathUtils.damp(this.needleWeight.rotation.z, wAngle, 8, delta);

    // 8. Update CRT Display
    this.updateCRTDisplay(time);

    // 9. Update Smoke Particles (emit if temperature > 65°C or damaged)
    const isOverheating = this.stats.temperature > 65 || this.stats.health < 40;
    const smokeGeo = this.smokeParticles.geometry as THREE.BufferGeometry;
    const pos = smokeGeo.attributes.position.array as Float32Array;

    for (let i = 0; i < pos.length / 3; i++) {
      if (isOverheating) {
        pos[i * 3 + 1] += delta * (0.6 + Math.random() * 0.4);
        pos[i * 3 + 2] -= delta * speed * 0.5;
        if (pos[i * 3 + 1] > 2.2) {
          pos[i * 3] = (Math.random() - 0.5) * 0.2;
          pos[i * 3 + 1] = 1.45;
          pos[i * 3 + 2] = -0.3;
        }
      } else {
        pos[i * 3 + 1] = -10; // hide below ground
      }
    }
    smokeGeo.attributes.position.needsUpdate = true;
  }

  toggleVisorLight() {
    this.stats.visorLightOn = !this.stats.visorLightOn;
    this.visorLight.visible = this.stats.visorLightOn;
    foley.playRelayClick(this.stats.visorLightOn);
  }

  damage(amount: number) {
    this.stats.health = Math.max(0, this.stats.health - amount);
    foley.playElectricSpark();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 100]);
    }
  }

  heal(amount: number) {
    this.stats.health = Math.min(100, this.stats.health + amount);
  }
}
