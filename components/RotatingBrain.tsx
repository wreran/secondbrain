'use client';

import { useRef, useMemo, Suspense } from 'react';
import { useGLTF, Stars } from '@react-three/drei';
import { Canvas, type RootState, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Tiny star-like particle that twinkles around the brain silhouette.
function StarParticle({ position, color, size, delay }: { position: [number, number, number]; color: string; size: number; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const clock = useRef(delay * 17 + position[0] * 11 + position[1] * 7 + position[2] * 5);

  useFrame((_state: RootState, delta: number) => {
    clock.current += delta;
    const t = clock.current;
    // Very gentle twinkle - keep it subtle
    const twinkle = Math.sin(t * 1.0 + delay) * 0.5 + 0.5;
    const twinkle2 = Math.pow(twinkle, 4);

    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.72 + twinkle2 * 0.48);
      if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
        meshRef.current.material.opacity = 0.14 + twinkle2 * 0.24;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 4, 4]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} />
    </mesh>
  );
}

// Cosmic dust field - very sparse and faint
function CosmicDust({ count = 70 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const clock = useRef(0);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = pseudoRandom(i + count) * Math.PI * 2;
      const phi = Math.acos(2 * pseudoRandom(i + count * 3) - 1);
      const r = 2 + pseudoRandom(i + count * 7) * 2.5; // Keep further out
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame((_state: RootState, delta: number) => {
    clock.current += delta * 0.05;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.current;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.008}
        sizeAttenuation
        transparent
        opacity={0.34}
        color="#c7d2fe"
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Brain model component - keep original GLB materials and lift visibility with scene lighting.
function BrainModel() {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF('/models/brain.glb');
  const scene = gltf.scene;

  useFrame((state: RootState, delta: number) => {
    if (groupRef.current) {
      // Slightly faster auto rotation so the brain motion reads more clearly.
      groupRef.current.rotation.y += delta * 0.055;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.035;
      groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.18) * 0.025;

      // Minimal float
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.015;
    }
  });

  if (!scene) return null;

  return (
    <group ref={groupRef} scale={2.7} position={[0, 0.45, -0.35]}>
      <primitive
        object={scene}
      />
    </group>
  );
}

// Fallback brain - very soft
function FallbackBrain() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state: RootState, delta: number) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.07;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.035;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.18) * 0.025;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.015;
    }
  });

  return (
      <mesh ref={meshRef} scale={2.7} position={[0, 0.45, -0.35]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#271453"
        emissive="#9f67ff"
        emissiveIntensity={0.24}
        metalness={0.7}
        roughness={0.24}
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

// Scene content wrapper
function BrainScene() {
  return (
    <>
      {/* Main brain model */}
      <Suspense fallback={<FallbackBrain />}>
        <BrainModel />
      </Suspense>

      {/* Very few tiny scattered star sparkles - ultra subtle */}
      <StarParticle position={[0.8, 0.5, 0.4]} color="#c7d2fe" size={0.018} delay={0} />
      <StarParticle position={[-0.6, 0.3, 0.6]} color="#ddd6fe" size={0.015} delay={1.5} />
      <StarParticle position={[0.4, -0.3, 0.7]} color="#c7d2fe" size={0.02} delay={3.0} />
      <StarParticle position={[-0.5, -0.2, 0.5]} color="#ddd6fe" size={0.012} delay={4.5} />
      <StarParticle position={[0.7, 0.1, -0.5]} color="#c7d2fe" size={0.016} delay={2.0} />
      <StarParticle position={[-0.8, 0.4, -0.4]} color="#ddd6fe" size={0.018} delay={5.5} />

      {/* Ultra sparse cosmic dust */}
      <CosmicDust count={50} />

      {/* Very distant sparse stars */}
      <Stars radius={12} depth={30} count={80} factor={1.5} saturation={0} fade speed={0.15} />
    </>
  );
}

export function RotatingBrainHero() {
  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 55 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
      >
        {/* Very dim lighting */}
        <ambientLight intensity={0.22} color="#ddd6fe" />
        <directionalLight position={[2, 3, 3]} intensity={0.42} color="#f5d0fe" />
        <pointLight position={[-3, 1, 2]} intensity={0.85} color="#7C3AED" distance={12} />
        <pointLight position={[3, -1, 2]} intensity={0.62} color="#EC4899" distance={10} />

        {/* Brain scene with mouse tilt */}
        <Suspense fallback={<FallbackBrain />}>
          <BrainScene />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/models/brain.glb');
