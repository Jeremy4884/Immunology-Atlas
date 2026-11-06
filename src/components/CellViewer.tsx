import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Float, Lightformer, OrbitControls } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Cell, CellShape } from '../data/cells';
import { rng, seedOf } from '../data/pathogenicity';

// ── Procedural helpers ──────────────────────────────────────
function noise3(x: number, y: number, z: number) {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3)) *
    Math.cos(y * 1.3 + Math.sin(z * 1.9)) *
    Math.sin(z * 1.1 + Math.cos(x * 2.1))
  );
}

function sphereDirs(n: number, r: () => number) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const rad = Math.sqrt(1 - y * y);
    const phi = i * 2.39996 + r() * 0.8;
    out.push(
      new THREE.Vector3(Math.cos(phi) * rad + (r() - 0.5) * 0.3, y + (r() - 0.5) * 0.3, Math.sin(phi) * rad).normalize(),
    );
  }
  return out;
}

function randomDir(r: () => number) {
  const u = r() * 2 - 1;
  const th = r() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
}

function makeRadiusFn(shape: CellShape, seed: number) {
  const r = rng(seed);
  const arms = shape.arms ? sphereDirs(shape.arms.count, r) : [];
  const o = [r() * 10, r() * 10, r() * 10];
  const cosW = shape.arms ? Math.cos(shape.arms.width) : 1;
  return (n: THREE.Vector3) => {
    let rad = 1;
    const f = shape.bumpFreq;
    rad += shape.bumpAmp * noise3(n.x * f + o[0], n.y * f + o[1], n.z * f + o[2]);
    if (shape.ruffleAmp && shape.ruffleFreq) {
      const g = shape.ruffleFreq;
      rad += shape.ruffleAmp * noise3(n.x * g + o[2], n.y * g + o[0], n.z * g + o[1]);
    }
    if (shape.arms) {
      for (const a of arms) {
        const d = n.dot(a);
        if (d > cosW) rad += shape.arms.length * Math.pow((d - cosW) / (1 - cosW), shape.arms.sharp);
      }
    }
    return rad;
  };
}

// ── Instanced helper ────────────────────────────────────────
function useInstanceMatrices(ref: React.RefObject<THREE.InstancedMesh>, matrices: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [ref, matrices]);
}

// ── Cell model ──────────────────────────────────────────────
function CellModel({ cell }: { cell: Cell }) {
  const { shape } = cell;
  const seed = seedOf(cell.id);

  const { membrane, receptors, heads, granules } = useMemo(() => {
    const radius = makeRadiusFn(shape, seed);
    let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 48);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const rr = radius(v);
      pos.setXYZ(i, v.x * rr, v.y * rr, v.z * rr);
    }
    g.computeVertexNormals();

    const r = rng(seed + 7);
    const up = new THREE.Vector3(0, 1, 0);
    const rec: THREE.Matrix4[] = [];
    const hd: THREE.Matrix4[] = [];
    for (let i = 0; i < shape.receptors; i++) {
      const d = randomDir(r);
      const rr = radius(d);
      const q = new THREE.Quaternion().setFromUnitVectors(up, d);
      rec.push(new THREE.Matrix4().compose(d.clone().multiplyScalar(rr + 0.03), q, new THREE.Vector3(1, 1, 1)));
      hd.push(
        new THREE.Matrix4().compose(d.clone().multiplyScalar(rr + 0.075), q, new THREE.Vector3(1, 1, 1)),
      );
    }
    const gr: THREE.Matrix4[] = [];
    if (shape.granules) {
      for (let i = 0; i < shape.granules.count; i++) {
        const d = randomDir(r);
        const rr = (shape.nucleusSize + 0.05 + r() * (0.85 - shape.nucleusSize)) * radius(d) * 0.95;
        const s = 0.022 + r() * 0.03;
        gr.push(
          new THREE.Matrix4().compose(d.multiplyScalar(rr), new THREE.Quaternion(), new THREE.Vector3(s, s, s)),
        );
      }
    }
    return { membrane: g, receptors: rec, heads: hd, granules: gr };
  }, [shape, seed]);

  const recRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const granRef = useRef<THREE.InstancedMesh>(null);
  useInstanceMatrices(recRef, receptors);
  useInstanceMatrices(headRef, heads);
  useInstanceMatrices(granRef, granules);

  return (
    <group scale={shape.scale.map((s) => s * shape.displayScale) as [number, number, number]}>
      {/* Membrane */}
      <mesh geometry={membrane} castShadow>
        <meshPhysicalMaterial
          color={shape.color}
          roughness={0.28}
          metalness={0}
          transmission={0.82}
          thickness={1.2}
          ior={1.25}
          clearcoat={0.7}
          clearcoatRoughness={0.25}
          attenuationColor={shape.color}
          attenuationDistance={1.6}
          sheen={0.5}
          sheenColor={'#ffffff'}
        />
      </mesh>

      {/* Surface receptors */}
      <instancedMesh ref={recRef} args={[undefined, undefined, receptors.length]}>
        <cylinderGeometry args={[0.008, 0.012, 0.07, 6]} />
        <meshStandardMaterial color={shape.color} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, heads.length]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial color={'#ffffff'} emissive={shape.color} emissiveIntensity={0.35} roughness={0.3} />
      </instancedMesh>

      <Nucleus shape={shape} seed={seed} />

      {shape.granules && (
        <instancedMesh ref={granRef} args={[undefined, undefined, granules.length]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial color={shape.granules.color} roughness={0.35} />
        </instancedMesh>
      )}

      {shape.er && <RoughER color={shape.nucleusColor} />}
    </group>
  );
}

function NucleusMaterial({ color }: { color: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.4} sheen={0.6} sheenColor="#ffffff" />;
}

function Nucleus({ shape, seed }: { shape: CellShape; seed: number }) {
  const s = shape.nucleusSize;
  const c = shape.nucleusColor;
  if (shape.nucleus === 'lobed') {
    const r = rng(seed + 3);
    const lobes = [-0.42, -0.14, 0.14, 0.42].map((x, i) => [x, (i % 2 ? 0.12 : -0.1) + (r() - 0.5) * 0.1, (r() - 0.5) * 0.2]);
    return (
      <group rotation={[0.3, 0.4, 0.2]}>
        {lobes.map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} scale={[1, 0.85, 0.85]}>
            <sphereGeometry args={[s * (i === 0 || i === 3 ? 0.85 : 1), 32, 32]} />
            <NucleusMaterial color={c} />
          </mesh>
        ))}
      </group>
    );
  }
  if (shape.nucleus === 'kidney') {
    return (
      <group rotation={[0.2, 0.5, 0.1]}>
        <mesh position={[-0.12, 0, 0]} scale={[0.75, 1, 0.8]}>
          <sphereGeometry args={[s, 40, 40]} />
          <NucleusMaterial color={c} />
        </mesh>
        <mesh position={[0.18, 0.12, 0]} scale={[0.7, 0.8, 0.75]}>
          <sphereGeometry args={[s * 0.85, 40, 40]} />
          <NucleusMaterial color={c} />
        </mesh>
      </group>
    );
  }
  if (shape.nucleus === 'eccentric') {
    return (
      <mesh position={[0.45, 0.05, 0]}>
        <sphereGeometry args={[s, 48, 48]} />
        <NucleusMaterial color={c} />
      </mesh>
    );
  }
  return (
    <mesh>
      <sphereGeometry args={[s, 48, 48]} />
      <NucleusMaterial color={c} />
    </mesh>
  );
}

function RoughER({ color }: { color: string }) {
  const rings = [0.28, 0.4, 0.52, 0.64];
  return (
    <group position={[0.4, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      {rings.map((r, i) => (
        <mesh key={i} rotation={[0, 0, Math.PI * 0.62]}>
          <torusGeometry args={[r + 0.12, 0.018, 8, 64, Math.PI * 0.75]} />
          <meshStandardMaterial color={color} transparent opacity={0.55} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ── Appear animation wrapper ────────────────────────────────
function Appear({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = THREE.MathUtils.damp(g.scale.x, 1, 5, dt);
    g.scale.setScalar(s);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, 0, 3, dt);
  });
  return (
    <group ref={ref} scale={0.001} rotation={[0, -1.2, 0]}>
      {children}
    </group>
  );
}

// ── Viewer ──────────────────────────────────────────────────
export default function CellViewer({ cell }: { cell: Cell }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.3, 4.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} castShadow />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#cfe3ff" />

      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5}>
        <Appear key={cell.id}>
          <CellModel cell={cell} />
        </Appear>
      </Float>

      <ContactShadows position={[0, -1.65, 0]} opacity={0.22} scale={8} blur={2.6} far={3} />

      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 2]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[-4, 0, 2]} scale={[2, 6, 1]} color="#dbeafe" />
        <Lightformer form="rect" intensity={1} position={[4, 0, 2]} scale={[2, 6, 1]} color="#fde68a" />
        <Lightformer form="circle" intensity={0.8} position={[0, -3, -3]} scale={4} />
      </Environment>

      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.7}
        minDistance={2.4}
        maxDistance={8}
        enableDamping
      />
    </Canvas>
  );
}
