import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace, MathUtils } from 'three';
import { useReducedMotion } from 'motion/react';
import { letterValue } from '../../engine/index.js';
import { sound, haptic } from '../../lib/feedback.js';

// x, y, z, base rotation, letter
// The cloud stays in the upper part of the canvas: the title sits below it.
const TILES = [
  [-3.6, 1.6, -1.5, -0.35, 'M'],
  [-2.1, 0.2, 0.4, 0.25, 'O'],
  [-0.9, 2.0, -0.6, -0.15, 'T'],
  [0.5, 0.5, 0.9, 0.12, 'S'],
  [1.9, 1.7, -0.2, -0.28, 'Z'],
  [3.3, 0.3, -1.1, 0.3, 'E'],
  [-5.0, 0.0, -2.6, 0.4, 'K'],
  [5.0, 2.1, -2.8, -0.4, 'W'],
  [-1.5, 3.3, -2.6, 0.2, 'A'],
  [3.0, 3.4, -3.0, -0.2, 'X'],
  [0.4, 3.6, -3.4, 0.1, 'Q'],
];

/** Pulls the camera back on narrow screens so the cloud fits the width. */
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    // Narrow: pull back so the cloud fits. Very wide bands: come closer so tiles keep their presence.
    const z = aspect < 1.2 ? 8 + (1.2 - aspect) * 6 : Math.max(5.6, 8 - (aspect - 1.2) * 0.8);
    camera.position.set(0, 1.6, z);
    camera.lookAt(0, 1.6, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function useFontReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => alive && setReady(true);
    if (document.fonts?.load) document.fonts.load('800 160px "Bricolage Grotesque"').then(done, done);
    else done();
    return () => { alive = false; };
  }, []);
  return ready;
}

function faceTexture(letter) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2219';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 168px "Bricolage Grotesque", system-ui, sans-serif';
  g.fillText(letter, size * 0.47, size * 0.53);
  g.font = '700 58px "Bricolage Grotesque", system-ui, sans-serif';
  g.textAlign = 'right';
  g.globalAlpha = 0.8;
  g.fillText(String(letterValue('FR', letter)), size * 0.9, size * 0.84);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function FloatingTile({ position, rotation, letter, index, pointer, still }) {
  const ref = useRef();
  const spin = useRef(0); // angular velocity from a tap
  const spinAngle = useRef(0);
  const base = useRef(rotation);
  const texture = useMemo(() => faceTexture(letter), [letter]);
  const phase = index * 1.37;

  useFrame((state, delta) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const bob = still ? 0 : Math.sin(t * 0.8 + phase) * 0.18;
    m.position.y = position[1] + bob;
    // A tap spins the tile like a flicked object: velocity decays, then it settles face-forward.
    spin.current *= Math.pow(0.05, delta);
    spinAngle.current += spin.current * delta;
    if (spin.current < 2) {
      const rest = Math.round(spinAngle.current / (Math.PI * 2)) * Math.PI * 2;
      spinAngle.current = MathUtils.damp(spinAngle.current, rest, 5, delta);
    }
    const targetY = rotation + (still ? 0 : pointer.current.x * 0.35) + Math.sin(t * 0.3 + phase) * 0.08;
    base.current = MathUtils.damp(base.current, targetY, 3, delta);
    m.rotation.y = base.current + spinAngle.current;
    m.rotation.x = MathUtils.damp(m.rotation.x, (still ? 0 : -pointer.current.y * 0.25) + Math.cos(t * 0.5 + phase) * 0.06, 3, delta);
  });

  return (
    <group
      ref={ref}
      position={position}
      rotation={[0, rotation, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        spin.current += 22;
        sound('pick');
        haptic('light');
      }}
    >
      <RoundedBox args={[1, 1, 0.3]} radius={0.12} smoothness={4}>
        <meshStandardMaterial color="#f1e4c6" roughness={0.42} metalness={0.02} />
      </RoundedBox>
      <mesh position={[0, 0, 0.151]}>
        <planeGeometry args={[0.92, 0.92]} />
        <meshStandardMaterial map={texture} transparent roughness={0.5} />
      </mesh>
    </group>
  );
}

function Scene({ still }) {
  const pointer = useRef({ x: 0, y: 0 });
  const ready = useFontReady();

  useEffect(() => {
    if (still) return undefined;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [still]);

  if (!ready) return null;
  return (
    <>
      <ResponsiveCamera />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 6]} intensity={2.2} color="#fff4e0" />
      <directionalLight position={[-6, -2, 3]} intensity={0.6} color="#9fb6ff" />
      <pointLight position={[0, 0, 4]} intensity={8} distance={12} color="#ffb84d" />
      {TILES.map(([x, y, z, r, letter], i) => (
        <FloatingTile key={letter + i} index={i} position={[x, y, z]} rotation={r} letter={letter} pointer={pointer} still={still} />
      ))}
    </>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function Hero3D() {
  const reduce = useReducedMotion();
  const [supported] = useState(hasWebGL);
  const [visible, setVisible] = useState(false);
  if (!supported) return null;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      frameloop={reduce ? 'demand' : 'always'}
      onCreated={() => setVisible(true)}
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 800ms ease' }}
    >
      <Scene still={!!reduce} />
    </Canvas>
  );
}
