import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

// ============================================
// VARIANT 1: Floating Glassmorphic Orbs
// ============================================
function FloatingOrbs() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere args={[1, 32, 32]} position={[-3, 1, -2]}>
          <MeshDistortMaterial
            color="#2dd4bf"
            transparent
            opacity={0.4}
            distort={0.3}
            speed={2}
          />
        </Sphere>
      </Float>
      
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
        <Sphere args={[0.6, 32, 32]} position={[3, -1, -1]}>
          <MeshDistortMaterial
            color="#14b8a6"
            transparent
            opacity={0.5}
            distort={0.4}
            speed={3}
          />
        </Sphere>
      </Float>
      
      <Float speed={2.5} rotationIntensity={0.4} floatIntensity={1.2}>
        <Sphere args={[0.4, 32, 32]} position={[1, 2, -3]}>
          <MeshDistortMaterial
            color="#5eead4"
            transparent
            opacity={0.3}
            distort={0.5}
            speed={4}
          />
        </Sphere>
      </Float>
      
      <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.9}>
        <Sphere args={[0.8, 32, 32]} position={[-2, -2, -2]}>
          <MeshDistortMaterial
            color="#0d9488"
            transparent
            opacity={0.35}
            distort={0.25}
            speed={1.5}
          />
        </Sphere>
      </Float>
    </group>
  );
}

// ============================================
// VARIANT 2: Particle Network Constellation
// ============================================
function ParticleNetwork() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const { positions, linePositions } = useMemo(() => {
    const count = 80;
    const positions = new Float32Array(count * 3);
    const linePositions: number[] = [];
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
    }
    
    // Create connections between nearby points
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < 2.5) {
          linePositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }
    
    return { positions, linePositions: new Float32Array(linePositions) };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      linesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.08} color="#2dd4bf" transparent opacity={0.8} />
      </points>
      
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#14b8a6" transparent opacity={0.15} />
      </lineSegments>
    </group>
  );
}

// ============================================
// VARIANT 3: Animated Wave Mesh
// ============================================
function WaveMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 12, 64, 64);
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = Math.sin(x * 0.5 + time) * 0.3 + 
                  Math.sin(y * 0.3 + time * 0.8) * 0.2 +
                  Math.sin((x + y) * 0.2 + time * 0.5) * 0.15;
        positions.setZ(i, z);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 3, 0, 0]} position={[0, -2, -5]}>
      <meshStandardMaterial
        color="#0d9488"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

// ============================================
// VARIANT 4: Abstract Geometric Shapes
// ============================================
function GeometricShapes() {
  const group1Ref = useRef<THREE.Mesh>(null);
  const group2Ref = useRef<THREE.Mesh>(null);
  const group3Ref = useRef<THREE.Mesh>(null);
  const torusRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (group1Ref.current) {
      group1Ref.current.rotation.x = t * 0.2;
      group1Ref.current.rotation.y = t * 0.3;
      group1Ref.current.position.y = Math.sin(t * 0.5) * 0.5;
    }
    if (group2Ref.current) {
      group2Ref.current.rotation.x = t * 0.15;
      group2Ref.current.rotation.z = t * 0.25;
      group2Ref.current.position.y = Math.sin(t * 0.4 + 1) * 0.4;
    }
    if (group3Ref.current) {
      group3Ref.current.rotation.y = t * 0.2;
      group3Ref.current.rotation.z = t * 0.1;
      group3Ref.current.position.x = Math.sin(t * 0.3) * 0.3;
    }
    if (torusRef.current) {
      torusRef.current.rotation.x = t * 0.1;
      torusRef.current.rotation.y = t * 0.15;
    }
  });

  return (
    <group>
      {/* Icosahedron */}
      <mesh ref={group1Ref} position={[-4, 1, -3]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#2dd4bf" wireframe transparent opacity={0.4} />
      </mesh>
      
      {/* Octahedron */}
      <mesh ref={group2Ref} position={[4, 0, -2]}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#14b8a6" wireframe transparent opacity={0.5} />
      </mesh>
      
      {/* Dodecahedron */}
      <mesh ref={group3Ref} position={[0, -2, -4]}>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#5eead4" wireframe transparent opacity={0.35} />
      </mesh>
      
      {/* Large Torus */}
      <mesh ref={torusRef} position={[0, 0, -6]}>
        <torusGeometry args={[3, 0.02, 16, 100]} />
        <meshStandardMaterial color="#0d9488" transparent opacity={0.2} />
      </mesh>
      
      {/* Stars */}
      <Stars radius={50} depth={30} count={500} factor={3} fade speed={0.5} />
    </group>
  );
}

// ============================================
// Main Component
// ============================================
interface HeroBackgroundProps {
  variant: 1 | 2 | 3 | 4;
}

export function HeroBackground({ variant }: HeroBackgroundProps) {
  return (
    <div className="absolute inset-0 -z-10" key={`bg-${variant}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} color="#2dd4bf" />
        
        {variant === 1 && <FloatingOrbs />}
        {variant === 2 && <ParticleNetwork />}
        {variant === 3 && <WaveMesh />}
        {variant === 4 && <GeometricShapes />}
      </Canvas>
    </div>
  );
}
