/**
 * world.ts - Decoupled Handcrafted Macro-Hardware World
 * 5 Epic Biomes:
 * 1. Silikon Kanyonları (The Silicon Canyons)
 * 2. Bakır Ormanları (The Copper Forest)
 * 3. Vakum Odaları (The Vacuum Vaults)
 * 4. Manyetik Çekirdek (The Magnetic Core)
 * 5. Sıvı Azot Denizi (The Nitrogen Depths)
 */

import * as THREE from 'three';
import {
  createWeatheredCopperTexture,
  createPCBTracesTexture,
  createBrushedMetalTexture,
  createSolderRiverTexture,
  createHDDPlatterTexture,
  createCryoIceTexture,
} from './textures';

export interface InteractiveTerminal {
  id: string;
  name: string;
  regionId: string;
  type: 'circuit' | 'oscilloscope' | 'last_component';
  position: THREE.Vector3;
  mesh: THREE.Group;
  isSolved: boolean;
  promptText: string;
}

export class WorldManager {
  public scene: THREE.Scene;
  public worldGroup: THREE.Group;
  public activeRegionId: string = 'silicon';

  // Biome parent groups for performance and decoupled architecture
  public regionGroups: Map<string, THREE.Group> = new Map();
  public terminals: InteractiveTerminal[] = [];

  // Animated elements
  private rotatingPlatters: THREE.Mesh[] = [];
  private actuatorArms: THREE.Group[] = [];
  private glowingFilaments: THREE.Mesh[] = [];
  private coolingFans: THREE.Group[] = [];
  private solderRivers: THREE.Mesh[] = [];
  private dataPulses!: THREE.Points;
  private dataPositions!: Float32Array;
  private windParticles!: THREE.Points;
  private windPositions!: Float32Array;

  // Sound surface detection bounds
  private surfaceBounds: {
    minX: number; maxX: number;
    minZ: number; maxZ: number;
    surface: 'copper' | 'silicon' | 'nitrogen' | 'magnetic' | 'vacuum';
  }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'MacroHardwareWorld';
    this.scene.add(this.worldGroup);

    // Build the 5 regions
    this.buildSiliconCanyons();
    this.buildCopperForest();
    this.buildVacuumVaults();
    this.buildMagneticCore();
    this.buildNitrogenDepths();

    // Build environmental data stream pulses (for diegetic directional navigation)
    this.buildDataStreamsAndWind();

    // Default to Silicon Canyons
    this.switchRegion('silicon');
  }

  // =========================================================================
  // 1. SILIKON KANYONLARI (THE SILICON CANYONS)
  // =========================================================================
  private buildSiliconCanyons() {
    const group = new THREE.Group();
    group.name = 'Region_Silicon';
    const pcbTex = createPCBTracesTexture();
    const copperTex = createWeatheredCopperTexture();
    const solderTex = createSolderRiverTexture();
    const metalTex = createBrushedMetalTexture();

    // Main PCB bedrock plateau (40m x 40m)
    const floorGeo = new THREE.BoxGeometry(44, 2, 44);
    const floorMat = new THREE.MeshStandardMaterial({
      map: pcbTex,
      roughness: 0.65,
      metalness: 0.35,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // Monolithic Processor Dies (ZENITH-IX DIE & CYBER-CHIP 8086-OMEGA)
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0x181e22,
      map: metalTex,
      roughness: 0.25,
      metalness: 0.85,
    });
    const goldPinMat = new THREE.MeshStandardMaterial({
      color: 0xffcc33,
      roughness: 0.2,
      metalness: 0.95,
    });

    const chipGeo = new THREE.BoxGeometry(10, 3.5, 10);
    const chipMesh = new THREE.Mesh(chipGeo, chipMat);
    chipMesh.position.set(-8, 1.75, -8);
    chipMesh.castShadow = true;
    chipMesh.receiveShadow = true;
    group.add(chipMesh);

    // Heat Spreader Copper Cap on top of chip
    const spreaderGeo = new THREE.BoxGeometry(8.5, 0.4, 8.5);
    const spreaderMat = new THREE.MeshStandardMaterial({
      color: 0xc87d46,
      map: copperTex,
      roughness: 0.3,
      metalness: 0.9,
    });
    const spreader = new THREE.Mesh(spreaderGeo, spreaderMat);
    spreader.position.set(-8, 3.7, -8);
    group.add(spreader);

    // Giant Heatsink Fins (Extending like canyon walls)
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x707880,
      map: metalTex,
      roughness: 0.35,
      metalness: 0.8,
    });
    for (let f = 0; f < 9; f++) {
      const finGeo = new THREE.BoxGeometry(0.2, 5.5, 8.5);
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(-11.5 + f * 0.9, 6.5, -8);
      fin.castShadow = true;
      group.add(fin);
    }

    // Gold BGA Pin Array along perimeter
    const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
    for (let px = -3; px <= 3; px += 0.8) {
      for (let pz = -3; pz <= 3; pz += 0.8) {
        if (Math.abs(px) > 2.2 || Math.abs(pz) > 2.2) {
          const pin = new THREE.Mesh(pinGeo, goldPinMat);
          pin.position.set(px, 0.3, pz + 8);
          pin.castShadow = true;
          group.add(pin);
        }
      }
    }

    // Molten Solder River (Animated Glowing Vein)
    const riverGeo = new THREE.PlaneGeometry(36, 4, 16, 4);
    const riverMat = new THREE.MeshStandardMaterial({
      map: solderTex,
      emissive: 0xff5511,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.7,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.02, 6);
    river.receiveShadow = true;
    group.add(river);
    this.solderRivers.push(river);

    // Ceramic Capacitors & Inductor Coils (Macro Obstacles)
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1f4e79, roughness: 0.4 });
    const capGeo = new THREE.CylinderGeometry(1.2, 1.2, 4.2, 16);
    const cap1 = new THREE.Mesh(capGeo, capMat);
    cap1.position.set(10, 2.1, -6);
    cap1.castShadow = true;
    group.add(cap1);

    const cap2 = new THREE.Mesh(capGeo, capMat);
    cap2.position.set(12.5, 2.1, -3);
    cap2.castShadow = true;
    group.add(cap2);

    // Interactive Terminal 1: Power Rail Circuit Workbench
    this.createInteractiveTerminal(
      group,
      'term_silicon_rail',
      'Güç Hattı & Direnç Paneli (Power Rail 12V)',
      'silicon',
      'circuit',
      new THREE.Vector3(5, 0, -2)
    );

    this.regionGroups.set('silicon', group);
    this.worldGroup.add(group);
  }

  // =========================================================================
  // 2. BAKIR ORMANLARI (THE COPPER FOREST)
  // =========================================================================
  private buildCopperForest() {
    const group = new THREE.Group();
    group.name = 'Region_Copper';
    const copperTex = createWeatheredCopperTexture();
    const metalTex = createBrushedMetalTexture();

    // Copper Bedrock / Floor
    const floorGeo = new THREE.BoxGeometry(44, 2, 44);
    const floorMat = new THREE.MeshStandardMaterial({
      map: copperTex,
      roughness: 0.45,
      metalness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // Towering Braided Copper Cables and Fiber Optic Vines
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x9e522b,
      map: copperTex,
      roughness: 0.35,
      metalness: 0.9,
    });
    const fiberMat = new THREE.MeshStandardMaterial({
      color: 0x00ccff,
      emissive: 0x0088cc,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    // Create 14 giant arching cable trunks
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const radius = 9 + (i % 3) * 3.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Braided curve
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x * 0.8, 4 + (i % 4) * 2, z * 0.8),
        new THREE.Vector3(x * 0.6, 9 + (i % 3) * 3, z * 0.6),
        new THREE.Vector3(x * 0.4, 15, z * 0.4),
      ]);

      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.55 + (i % 2) * 0.25, 10, false);
      const cableMesh = new THREE.Mesh(tubeGeo, i % 3 === 0 ? fiberMat : cableMat);
      cableMesh.castShadow = true;
      group.add(cableMesh);

      // Copper Busbar Junction Collar
      const collarGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.4, 12);
      const collar = new THREE.Mesh(collarGeo, cableMat);
      collar.position.set(x, 0.2, z);
      collar.castShadow = true;
      group.add(collar);
    }

    // High Voltage Transformer Block in Center
    const transMat = new THREE.MeshStandardMaterial({
      color: 0x242e38,
      map: metalTex,
      roughness: 0.4,
      metalness: 0.8,
    });
    const transformerGeo = new THREE.BoxGeometry(6, 4.5, 6);
    const transformer = new THREE.Mesh(transformerGeo, transMat);
    transformer.position.set(0, 2.25, -5);
    transformer.castShadow = true;
    group.add(transformer);

    // Ceramic Insulator Stacks on top of transformer
    const insulMat = new THREE.MeshStandardMaterial({ color: 0x8b3a1a, roughness: 0.3 });
    for (let ins = -1; ins <= 1; ins++) {
      for (let stack = 0; stack < 4; stack++) {
        const ringGeo = new THREE.TorusGeometry(0.35, 0.12, 8, 16);
        const ring = new THREE.Mesh(ringGeo, insulMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(ins * 1.8, 4.7 + stack * 0.3, -5);
        ring.castShadow = true;
        group.add(ring);
      }
    }

    // Interactive Terminal 2: Antenna Resonance Frequency Tower
    this.createInteractiveTerminal(
      group,
      'term_copper_osc',
      'Frekans Osilatör Kulesi (Sinyal Kalibrasyonu)',
      'copper',
      'oscilloscope',
      new THREE.Vector3(0, 0, 3)
    );

    this.regionGroups.set('copper', group);
    this.worldGroup.add(group);
  }

  // =========================================================================
  // 3. VAKUM ODALARI (THE VACUUM VAULTS)
  // =========================================================================
  private buildVacuumVaults() {
    const group = new THREE.Group();
    group.name = 'Region_Vacuum';
    const metalTex = createBrushedMetalTexture();

    // Dark Acoustic Anomaly Floor
    const floorGeo = new THREE.BoxGeometry(44, 2, 44);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d10,
      map: metalTex,
      roughness: 0.7,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // Colossal Floating Vacuum Tubes (Elektron Tüpleri)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      opacity: 0.4,
      transparent: true,
      roughness: 0.08,
      ior: 1.5,
      thickness: 0.8,
    });

    const filamentMat = new THREE.MeshStandardMaterial({
      color: 0xffaa33,
      emissive: 0xff6600,
      emissiveIntensity: 2.5,
      roughness: 0.2,
    });

    const tubeBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      roughness: 0.4,
      metalness: 0.9,
    });

    // Create 6 giant glowing vacuum tubes
    const tubePositions = [
      [-9, 3.5, -9],
      [9, 3.5, -9],
      [-9, 3.5, 9],
      [9, 3.5, 9],
      [0, 5.5, -12],
      [-12, 4.5, 0],
    ];

    tubePositions.forEach(([tx, ty, tz], idx) => {
      const tubeGroup = new THREE.Group();
      tubeGroup.position.set(tx, ty, tz);

      // Glass Envelope
      const envGeo = new THREE.CylinderGeometry(1.6, 1.6, 5.5, 16);
      const env = new THREE.Mesh(envGeo, glassMat);
      tubeGroup.add(env);

      // Glass Dome Top
      const domeGeo = new THREE.SphereGeometry(1.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, glassMat);
      dome.position.y = 2.75;
      tubeGroup.add(dome);

      // Bakelite Base with 8 octal pins
      const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.2, 16);
      const base = new THREE.Mesh(baseGeo, tubeBaseMat);
      base.position.y = -3.1;
      tubeGroup.add(base);

      // Glowing Tungsten Filament Spiral inside
      const filGeo = new THREE.TorusGeometry(0.55, 0.06, 8, 24);
      const fil = new THREE.Mesh(filGeo, filamentMat);
      fil.rotation.x = Math.PI / 2;
      fil.position.y = 0.2;
      tubeGroup.add(fil);
      this.glowingFilaments.push(fil);

      // Internal Anode Plate / Getter ring
      const anodeGeo = new THREE.CylinderGeometry(1.1, 1.1, 2.8, 12, 1, true);
      const anodeMat = new THREE.MeshStandardMaterial({
        color: 0x4a525a,
        roughness: 0.5,
        metalness: 0.9,
        side: THREE.DoubleSide,
      });
      const anode = new THREE.Mesh(anodeGeo, anodeMat);
      tubeGroup.add(anode);

      // Point Light from warm filament
      const tubeLight = new THREE.PointLight(0xff7722, 2.5, 14, 1.5);
      tubeLight.position.y = 0.2;
      tubeGroup.add(tubeLight);

      group.add(tubeGroup);
    });

    // Zero-g floating stone/ceramic platforms
    const platMat = new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.7 });
    for (let p = 0; p < 5; p++) {
      const platGeo = new THREE.CylinderGeometry(2.2, 1.8, 0.6, 8);
      const plat = new THREE.Mesh(platGeo, platMat);
      plat.position.set(-6 + p * 3.5, 1.5 + Math.sin(p * 1.5) * 0.8, -2 + (p % 2) * 4);
      plat.castShadow = true;
      group.add(plat);
    }

    // Interactive Terminal 3: Filament Bias & Tube Gate Switchboard
    this.createInteractiveTerminal(
      group,
      'term_vacuum_gate',
      'Vakum Tüp Flaman Anahtarı (Filament Bias)',
      'vacuum',
      'circuit',
      new THREE.Vector3(0, 0, 0)
    );

    this.regionGroups.set('vacuum', group);
    this.worldGroup.add(group);
  }

  // =========================================================================
  // 4. MANYETİK ÇEKİRDEK (THE MAGNETIC CORE)
  // =========================================================================
  private buildMagneticCore() {
    const group = new THREE.Group();
    group.name = 'Region_Magnetic';
    const hddTex = createHDDPlatterTexture();
    const metalTex = createBrushedMetalTexture();

    // Base chassis floor
    const floorGeo = new THREE.BoxGeometry(44, 2, 44);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x161a1e,
      map: metalTex,
      roughness: 0.5,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // Giant Mirror-Finish Rotating HDD Platters (Radius = 7.5 meters!)
    const platterGeo = new THREE.CylinderGeometry(7.5, 7.5, 0.3, 48);
    const platterMat = new THREE.MeshStandardMaterial({
      map: hddTex,
      roughness: 0.08,
      metalness: 0.98,
    });

    const platter1 = new THREE.Mesh(platterGeo, platterMat);
    platter1.position.set(-5, 0.15, -4);
    platter1.receiveShadow = true;
    group.add(platter1);
    this.rotatingPlatters.push(platter1);

    const platter2 = new THREE.Mesh(platterGeo, platterMat);
    platter2.position.set(8, 0.45, 5);
    platter2.receiveShadow = true;
    group.add(platter2);
    this.rotatingPlatters.push(platter2);

    // Central Spindle Hub with Spindle Motor Clamp
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xdde2e8, metalness: 0.9, roughness: 0.2 });
    const hubGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.8, 24);
    const hub1 = new THREE.Mesh(hubGeo, hubMat);
    hub1.position.set(-5, 0.6, -4);
    group.add(hub1);

    const hub2 = new THREE.Mesh(hubGeo, hubMat);
    hub2.position.set(8, 0.9, 5);
    group.add(hub2);

    // Giant Actuator Arms with Read/Write Slider Heads
    const createActuator = (x: number, z: number, targetAngle: number) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(x, 0.8, z);

      // Voice coil magnet enclosure
      const coilGeo = new THREE.BoxGeometry(2.5, 1.2, 3);
      const coilMat = new THREE.MeshStandardMaterial({ color: 0x222a30, metalness: 0.85 });
      const coil = new THREE.Mesh(coilGeo, coilMat);
      armGroup.add(coil);

      // Triangular swing arm
      const armMeshGeo = new THREE.BoxGeometry(0.35, 0.15, 7.2);
      armMeshGeo.translate(0, 0, 3.6);
      const armMeshMat = new THREE.MeshStandardMaterial({ color: 0x99a3ad, metalness: 0.9, roughness: 0.2 });
      const arm = new THREE.Mesh(armMeshGeo, armMeshMat);
      armGroup.add(arm);

      // Read/Write Head Gimbal
      const headGeo = new THREE.BoxGeometry(0.6, 0.2, 0.5);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00aa88,
        emissiveIntensity: 0.8,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, -0.15, 7.2);
      armGroup.add(head);

      armGroup.rotation.y = targetAngle;
      group.add(armGroup);
      this.actuatorArms.push(armGroup);
    };

    createActuator(-13, -11, 0.4);
    createActuator(16, -2, -2.1);

    // Interactive Terminal 4: Platter Flux Synchronizer
    this.createInteractiveTerminal(
      group,
      'term_mag_sync',
      'Manyetik Akı Senkronizörü (Flux Align)',
      'magnetic',
      'oscilloscope',
      new THREE.Vector3(-5, 0, 6)
    );

    this.regionGroups.set('magnetic', group);
    this.worldGroup.add(group);
  }

  // =========================================================================
  // 5. SIVI AZOT DENİZİ (THE NITROGEN DEPTHS) - Ultimate Vault
  // =========================================================================
  private buildNitrogenDepths() {
    const group = new THREE.Group();
    group.name = 'Region_Nitrogen';
    const cryoTex = createCryoIceTexture();
    const metalTex = createBrushedMetalTexture();

    // Sub-zero Frosted Bedrock / Cryo Ice floor
    const floorGeo = new THREE.BoxGeometry(44, 2, 44);
    const floorMat = new THREE.MeshStandardMaterial({
      map: cryoTex,
      roughness: 0.2,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // Cryogenic Vapor Pool (Shimmering translucent liquid nitrogen surface)
    const poolGeo = new THREE.PlaneGeometry(38, 38);
    const poolMat = new THREE.MeshPhysicalMaterial({
      color: 0x55ccff,
      transmission: 0.6,
      opacity: 0.75,
      transparent: true,
      roughness: 0.05,
      ior: 1.3,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.05;
    pool.receiveShadow = true;
    group.add(pool);

    // Gargantuan Axial Cooling Fans (Heatsink Fans)
    const createCoolingFan = (x: number, y: number, z: number, radius: number) => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(x, y, z);

      // Fan shroud / housing ring
      const shroudGeo = new THREE.CylinderGeometry(radius, radius, 0.8, 32, 1, true);
      const shroudMat = new THREE.MeshStandardMaterial({ color: 0x11161a, metalness: 0.8 });
      const shroud = new THREE.Mesh(shroudGeo, shroudMat);
      shroud.rotation.x = Math.PI / 2;
      fanGroup.add(shroud);

      // Rotating blades
      const bladesGroup = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(radius * 0.85, 0.08, 0.5);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2e353b, metalness: 0.7, roughness: 0.3 });

      for (let b = 0; b < 9; b++) {
        const angle = (b / 9) * Math.PI * 2;
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.z = angle;
        blade.rotation.y = 0.35; // pitch
        blade.position.set(Math.cos(angle) * (radius * 0.45), Math.sin(angle) * (radius * 0.45), 0);
        bladesGroup.add(blade);
      }

      fanGroup.add(bladesGroup);
      this.coolingFans.push(bladesGroup);
      group.add(fanGroup);
    };

    // 2 Giant fans in the back wall blowing frosty air
    createCoolingFan(-8, 5, -16, 4.5);
    createCoolingFan(8, 5, -16, 4.5);

    // Frost-encrusted crystalline heatsink columns
    const iceColMat = new THREE.MeshStandardMaterial({
      color: 0x88ddff,
      emissive: 0x004466,
      roughness: 0.15,
      metalness: 0.85,
    });
    for (let c = 0; c < 8; c++) {
      const colGeo = new THREE.CylinderGeometry(0.8, 1.2, 7.5, 6);
      const col = new THREE.Mesh(colGeo, iceColMat);
      col.position.set(-14 + (c % 4) * 9, 3.75, -8 + Math.floor(c / 4) * 14);
      col.castShadow = true;
      group.add(col);
    }

    // THE ULTIMATE ALTAR: "THE LAST COMPONENT" (SON BİLEŞEN MAHZENİ)
    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 0, -5);

    // Stepped Pedestal
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x1f272e, map: metalTex, metalness: 0.9 });
    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.4, 16), stepMat);
    step1.position.y = 0.2;
    altarGroup.add(step1);

    const step2 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.4, 16), stepMat);
    step2.position.y = 0.6;
    altarGroup.add(step2);

    // Floating Quantum Core ("Son Bileşen")
    const coreGeo = new THREE.IcosahedronGeometry(0.85, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ffee,
      emissive: 0x00ffff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.9,
    });
    const quantumCore = new THREE.Mesh(coreGeo, coreMat);
    quantumCore.position.y = 2.2;
    altarGroup.add(quantumCore);

    // Protective Magnetic Containment Rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.95 });
    const cRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 12, 32), ringMat);
    cRing1.position.y = 2.2;
    altarGroup.add(cRing1);

    const cRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 12, 32), ringMat);
    cRing2.rotation.x = Math.PI / 3;
    cRing2.position.y = 2.2;
    altarGroup.add(cRing2);

    const coreLight = new THREE.PointLight(0x00ffee, 3.5, 18, 1.2);
    coreLight.position.y = 2.2;
    altarGroup.add(coreLight);

    group.add(altarGroup);

    // Interactive Terminal 5: The Last Component Activation
    this.createInteractiveTerminal(
      group,
      'term_last_component',
      'Son Bileşen Rezonatörü (The Last Component Core)',
      'nitrogen',
      'last_component',
      new THREE.Vector3(0, 0, -2)
    );

    this.regionGroups.set('nitrogen', group);
    this.worldGroup.add(group);
  }

  // =========================================================================
  // DIEGETIC DIRECTIONAL DATA STREAMS & COOLING WIND
  // =========================================================================
  private buildDataStreamsAndWind() {
    // 1. Data pulse particles that flow along cables guiding player
    const count = 120;
    this.dataPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.dataPositions[i * 3] = (Math.random() - 0.5) * 20;
      this.dataPositions[i * 3 + 1] = 0.5 + Math.random() * 6;
      this.dataPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const dataGeo = new THREE.BufferGeometry();
    dataGeo.setAttribute('position', new THREE.BufferAttribute(this.dataPositions, 3));
    const dataMat = new THREE.PointsMaterial({
      color: 0x00ffcc,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
    });
    this.dataPulses = new THREE.Points(dataGeo, dataMat);
    this.worldGroup.add(this.dataPulses);

    // 2. Wind vector dust trails from giant cooling fans
    const windCount = 200;
    this.windPositions = new Float32Array(windCount * 3);
    for (let i = 0; i < windCount; i++) {
      this.windPositions[i * 3] = (Math.random() - 0.5) * 28;
      this.windPositions[i * 3 + 1] = 0.2 + Math.random() * 5;
      this.windPositions[i * 3 + 2] = -15 + Math.random() * 30;
    }
    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', new THREE.BufferAttribute(this.windPositions, 3));
    const windMat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.16,
      transparent: true,
      opacity: 0.35,
    });
    this.windParticles = new THREE.Points(windGeo, windMat);
    this.worldGroup.add(this.windParticles);
  }

  // =========================================================================
  // INTERACTIVE HARDWARE TERMINAL GENERATOR
  // =========================================================================
  private createInteractiveTerminal(
    parent: THREE.Group,
    id: string,
    name: string,
    regionId: string,
    type: 'circuit' | 'oscilloscope' | 'last_component',
    position: THREE.Vector3
  ) {
    const termGroup = new THREE.Group();
    termGroup.position.copy(position);

    const baseGeo = new THREE.BoxGeometry(1.4, 1.1, 1.0);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x283138, roughness: 0.4, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.55;
    base.castShadow = true;
    termGroup.add(base);

    // Angled terminal console
    const topGeo = new THREE.BoxGeometry(1.3, 0.45, 0.8);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1a2126, roughness: 0.5 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 8;
    top.position.set(0, 1.25, -0.05);
    termGroup.add(top);

    // Glowing status indicator lamp
    const lampGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xff3311,
      emissive: 0xff2200,
      emissiveIntensity: 1.5,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(0.45, 1.4, -0.1);
    termGroup.add(lamp);

    // Interactive beacon ring on floor
    const ringGeo = new THREE.RingGeometry(1.6, 1.85, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    termGroup.add(ring);

    parent.add(termGroup);

    this.terminals.push({
      id,
      name,
      regionId,
      type,
      position: position.clone(),
      mesh: termGroup,
      isSolved: false,
      promptText: type === 'circuit'
        ? '[E] ÇOKLU-METRE İLE DEVRE HATLARINI ÖLÇ & TAMİR ET'
        : type === 'oscilloscope'
        ? '[E] OSİLOSKOP ANALOG DÜĞMELERİYLE FREKANSI AYARLA'
        : '[E] SON BİLEŞENİ (QUANTUM CORE) YERLEŞTİR',
    });
  }

  // =========================================================================
  // SWITCH ACTIVE REGION
  // =========================================================================
  public switchRegion(regionId: string) {
    this.activeRegionId = regionId;
    this.regionGroups.forEach((group, id) => {
      group.visible = id === regionId;
    });
  }

  // =========================================================================
  // ANIMATION UPDATE
  // =========================================================================
  public update(delta: number) {
    const time = performance.now() * 0.001;

    // 1. Rotate HDD Platters
    this.rotatingPlatters.forEach((p, idx) => {
      p.rotation.y += delta * (idx === 0 ? 8.5 : -11.0); // Spindle speed!
    });

    // 2. Sway Actuator Arms
    this.actuatorArms.forEach((arm, idx) => {
      arm.rotation.y += Math.sin(time * 3 + idx) * 0.012;
    });

    // 3. Pulse Vacuum Tube Filaments
    this.glowingFilaments.forEach((fil, idx) => {
      const mat = fil.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.2 + Math.sin(time * 8 + idx) * 0.6;
    });

    // 4. Rotate Giant Heatsink Fans
    this.coolingFans.forEach((fan) => {
      fan.rotation.z += delta * 14;
    });

    // 5. Scroll Solder River UVs
    this.solderRivers.forEach((river) => {
      const mat = river.material as THREE.MeshStandardMaterial;
      if (mat.map) {
        mat.map.offset.x = (time * 0.08) % 1;
      }
    });

    // 6. Animate Data Pulses (streaming toward center)
    const dataPos = (this.dataPulses.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
    for (let i = 0; i < dataPos.length / 3; i++) {
      dataPos[i * 3 + 2] -= delta * 5.5; // Flow along z
      if (dataPos[i * 3 + 2] < -12) {
        dataPos[i * 3 + 2] = 12;
        dataPos[i * 3] = (Math.random() - 0.5) * 18;
      }
    }
    (this.dataPulses.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;

    // 7. Animate Wind Vapor Particles from Cooling Fans
    const windPos = (this.windParticles.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
    for (let i = 0; i < windPos.length / 3; i++) {
      windPos[i * 3 + 2] += delta * 7.5; // Draft pushed forward
      windPos[i * 3 + 1] += Math.sin(time * 2 + i) * 0.02;
      if (windPos[i * 3 + 2] > 18) {
        windPos[i * 3 + 2] = -14;
        windPos[i * 3] = (Math.random() - 0.5) * 24;
      }
    }
    (this.windParticles.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
  }

  /**
   * Check nearest interactive terminal to Enes
   */
  public getNearbyTerminal(playerPos: THREE.Vector3, threshold: number = 3.2): InteractiveTerminal | null {
    for (const term of this.terminals) {
      if (term.regionId === this.activeRegionId) {
        const dist = playerPos.distanceTo(term.position);
        if (dist <= threshold) {
          return term;
        }
      }
    }
    return null;
  }

  /**
   * Mark terminal as solved
   */
  public solveTerminal(termId: string) {
    const term = this.terminals.find((t) => t.id === termId);
    if (term) {
      term.isSolved = true;
      // Change lamp to green
      term.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'SphereGeometry') {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x00ff66);
          mat.emissive.setHex(0x00ff44);
          mat.emissiveIntensity = 2.0;
        }
      });
    }
  }
}
