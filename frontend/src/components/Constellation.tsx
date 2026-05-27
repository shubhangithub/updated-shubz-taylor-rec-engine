'use client';

import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ConstellationStar } from '@/lib/types';
import { ERA_THEMES } from '@/lib/eraThemes';

// Individual star component
function Star({
  star,
  isHovered,
  isSearchHighlight,
  onHover,
  onClick,
}: {
  star: ConstellationStar;
  isHovered: boolean;
  isSearchHighlight: boolean;
  onHover: (id: string | null) => void;
  onClick: (star: ConstellationStar) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const theme = ERA_THEMES[star.era];
  const color = new THREE.Color(theme?.colors.primary || '#D4AF37');

  useFrame((state) => {
    if (!meshRef.current) return;
    // Gentle pulsing with per-star frequency variation
    const freq = 1 + Math.abs(Math.sin(star.position[0] * 7)) * 3; // 1-4x frequency, deterministic per star
    const pulse = Math.sin(state.clock.elapsedTime * freq + star.position[0] * 3) * 0.15 + 1;
    const scale = isHovered ? 2.5 : isSearchHighlight ? 2.0 : star.brightness * pulse;
    meshRef.current.scale.setScalar(scale);

    if (glowRef.current) {
      glowRef.current.scale.setScalar(scale * (isHovered ? 4 : 3));
      const baseGlowOpacity = star.isSingle ? 0.3 : 0.15;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        isHovered ? 0.4 : isSearchHighlight ? 0.3 : star.brightness * baseGlowOpacity;
    }
  });

  return (
    <group position={star.position}>
      {/* Core star */}
      <mesh
        ref={meshRef}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(star.id); }}
        onPointerOut={() => onHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(star); }}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={isHovered ? 'white' : color} />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {/* Song name label on hover */}
      {isHovered && (
        <Billboard follow position={[0, 0.4, 0]}>
          <Text
            fontSize={0.18}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            {star.name}
          </Text>
          <Text
            fontSize={0.1}
            color={theme?.colors.secondary || '#aaa'}
            anchorX="center"
            anchorY="middle"
            position={[0, -0.2, 0]}
          >
            {star.album}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// Nebula cluster — soft glow sphere + point light + label
function EraCluster({ era, center }: { era: string; center: [number, number, number] }) {
  const theme = ERA_THEMES[era];
  const meshRef = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(theme?.colors.primary || '#333');

  useFrame((state) => {
    if (!meshRef.current) return;
    const scale = 2.5 + Math.sin(state.clock.elapsedTime * 0.3 + center[0]) * 0.3;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <group position={center}>
      {/* Subtle nebula glow — very transparent */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.015} side={THREE.DoubleSide} />
      </mesh>
      {/* Point light for star illumination */}
      <pointLight color={color} intensity={0.3} distance={8} decay={2} />
      {/* Era label */}
      <Billboard follow position={[0, -2.5, 0]}>
        <Text
          fontSize={0.2}
          color={theme?.colors.accent || '#666'}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.4}
        >
          {era}
        </Text>
      </Billboard>
    </group>
  );
}

// Connection lines between related songs
function ConnectionLines({ stars, hoveredId }: { stars: ConstellationStar[]; hoveredId: string | null }) {
  const linesRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    if (!hoveredId) return null;
    const hovered = stars.find(s => s.id === hoveredId);
    if (!hovered) return null;

    // Find same-era songs
    const sameEra = stars.filter(s => s.era === hovered.era && s.id !== hoveredId);
    const points: number[] = [];

    sameEra.forEach(s => {
      points.push(...hovered.position, ...s.position);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [stars, hoveredId]);

  if (!geometry) return null;

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial color="#D4AF37" transparent opacity={0.1} />
    </lineSegments>
  );
}

// Camera auto-rotation
function CameraRig() {
  const { camera } = useThree();
  const angle = useRef(0);

  useFrame((_, delta) => {
    angle.current += delta * 0.03;
    // Very slow orbit when not interacting
    camera.position.x = Math.sin(angle.current) * 18;
    camera.position.z = Math.cos(angle.current) * 18;
    camera.lookAt(0, 3, 0);
  });

  return null;
}

// Space dust — faint particles filling the void between clusters
function SpaceDust() {
  const ref = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#D4AF37" size={0.03} transparent opacity={0.15} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  );
}

// Auto-pan camera to search results
function SearchPanner({ stars, searchHighlights }: { stars: ConstellationStar[]; searchHighlights: Set<string> }) {
  const { camera } = useThree();
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3, 0));

  useEffect(() => {
    if (searchHighlights.size === 0) return;
    // Compute centroid of highlighted stars
    const highlighted = stars.filter(s => searchHighlights.has(s.id));
    if (highlighted.length === 0) return;
    const cx = highlighted.reduce((s, h) => s + h.position[0], 0) / highlighted.length;
    const cy = highlighted.reduce((s, h) => s + h.position[1], 0) / highlighted.length;
    const cz = highlighted.reduce((s, h) => s + h.position[2], 0) / highlighted.length;
    targetRef.current.set(cx, cy, cz);
  }, [searchHighlights, stars]);

  useFrame(() => {
    if (searchHighlights.size === 0) return;
    // Smoothly move camera to look at the centroid
    const target = targetRef.current;
    const dir = new THREE.Vector3().subVectors(target, camera.position).normalize();
    const desiredPos = new THREE.Vector3().copy(target).sub(dir.multiplyScalar(12));
    camera.position.lerp(desiredPos, 0.02);
    camera.lookAt(target);
  });

  return null;
}

// Main scene
function ConstellationScene({
  stars,
  hoveredStar,
  searchHighlights,
  onHover,
  onStarClick,
  autoRotate,
}: {
  stars: ConstellationStar[];
  hoveredStar: string | null;
  searchHighlights: Set<string>;
  onHover: (id: string | null) => void;
  onStarClick: (star: ConstellationStar) => void;
  autoRotate: boolean;
}) {
  // Balanced spiral — not too tight, not too spread
  const ERA_CLUSTER_CENTERS: Record<string, [number, number, number]> = {
    'Taylor Swift': [-10, 1, -5],
    'Fearless': [-7, 4, -1],
    'Speak Now': [-3, 6, 2],
    'Red': [1, 4, 5],
    '1989': [6, 2, 4],
    'reputation': [8, -1, 2],
    'Lover': [5, 0, -3],
    'folklore': [1, 5, -6],
    'evermore': [-3, 6, -4],
    'Midnights': [-6, 2, 1],
    'The Tortured Poets Department': [-1, -1, -2],
    'The Life Of A Showgirl': [3, -2, -1],
  };

  return (
    <>
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 18, 45]} />
      <ambientLight intensity={0.12} />

      {/* Background stars */}
      <Stars radius={120} depth={60} count={4000} factor={3.5} saturation={0.1} fade speed={0.4} />

      {/* Space dust — fills the void between clusters */}
      <SpaceDust />

      {/* Era nebula clusters */}
      {Object.entries(ERA_CLUSTER_CENTERS).map(([era, center]) => (
        <EraCluster key={era} era={era} center={center} />
      ))}

      {/* Song stars */}
      {stars.map((star) => (
        <Star
          key={star.id}
          star={star}
          isHovered={hoveredStar === star.id}
          isSearchHighlight={searchHighlights.has(star.id)}
          onHover={onHover}
          onClick={onStarClick}
        />
      ))}

      {/* Connection lines */}
      <ConnectionLines stars={stars} hoveredId={hoveredStar} />

      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        minDistance={6}
        maxDistance={40}
        target={[0, 2, 0]}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Auto-pan to search results */}
      <SearchPanner stars={stars} searchHighlights={searchHighlights} />
    </>
  );
}

interface ConstellationProps {
  stars: ConstellationStar[];
  onStarClick: (star: ConstellationStar) => void;
  searchQuery?: string;
  beatIntensity?: number;
}

export default function Constellation({ stars, onStarClick, searchQuery }: ConstellationProps) {
  const [hoveredStar, setHoveredStar] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  const searchHighlights = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(
      stars
        .filter(s => s.name.toLowerCase().includes(q) || s.album.toLowerCase().includes(q))
        .map(s => s.id)
    );
  }, [stars, searchQuery]);

  const handleHover = useCallback((id: string | null) => {
    setHoveredStar(id);
    if (id) setAutoRotate(false);
    else setTimeout(() => setAutoRotate(true), 3000);
  }, []);

  return (
    <div className="fixed inset-0">
      <Canvas
        camera={{ position: [0, 4, 22], fov: 58, near: 0.1, far: 150 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <ConstellationScene
          stars={stars}
          hoveredStar={hoveredStar}
          searchHighlights={searchHighlights}
          onHover={handleHover}
          onStarClick={onStarClick}
          autoRotate={autoRotate}
        />
      </Canvas>
    </div>
  );
}
