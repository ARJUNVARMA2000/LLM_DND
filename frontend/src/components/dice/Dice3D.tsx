import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import type { DiceType } from '../../types';
import { audioManager } from '../../systems/audio/AudioManager';

interface Props {
  type: DiceType;
  result: number;
}

// Get the target rotation for showing a specific face
function getRotationForFace(_type: DiceType, face: number): [number, number, number] {
  // Simplified rotations for d20 (icosahedron)
  // In a real implementation, you'd calculate exact rotations for each face
  const rotations: Record<string, [number, number, number]> = {
    1: [0, 0, 0],
    2: [Math.PI / 5, 0, 0],
    3: [Math.PI / 5 * 2, 0, 0],
    4: [Math.PI / 5 * 3, 0, 0],
    5: [Math.PI / 5 * 4, 0, 0],
    6: [0, Math.PI / 5, 0],
    7: [0, Math.PI / 5 * 2, 0],
    8: [0, Math.PI / 5 * 3, 0],
    9: [0, Math.PI / 5 * 4, 0],
    10: [Math.PI / 3, Math.PI / 3, 0],
    11: [Math.PI / 3, Math.PI / 3 * 2, 0],
    12: [Math.PI / 3, Math.PI / 3 * 3, 0],
    13: [Math.PI / 3 * 2, 0, 0],
    14: [Math.PI / 3 * 2, Math.PI / 3, 0],
    15: [Math.PI / 3 * 2, Math.PI / 3 * 2, 0],
    16: [Math.PI, 0, 0],
    17: [Math.PI, Math.PI / 3, 0],
    18: [Math.PI, Math.PI / 3 * 2, 0],
    19: [Math.PI + Math.PI / 5, 0, 0],
    20: [Math.PI, Math.PI, 0],
  };
  
  return rotations[String(face)] || [0, 0, 0];
}

export default function Dice3D({ type, result }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isRolling, setIsRolling] = useState(true);
  const [targetRotation, setTargetRotation] = useState<[number, number, number]>([0, 0, 0]);

  // Calculate target rotation based on result
  useEffect(() => {
    const target = getRotationForFace(type, result);
    
    // Play dice roll sound
    audioManager.playSfx('dice_roll');
    
    // Animate rolling for a bit, then settle
    const timer = setTimeout(() => {
      setIsRolling(false);
      setTargetRotation(target);
      audioManager.playSfx('dice_land');
      
      if (result === 20) {
        audioManager.playSfx('dice_critical');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [type, result]);

  // Spring animation for smooth settling
  const { rotation } = useSpring({
    rotation: isRolling ? [0, 0, 0] : targetRotation,
    config: { mass: 2, tension: 200, friction: 30 },
  });

  // Spinning animation during roll
  useFrame((_state, delta) => {
    if (meshRef.current && isRolling) {
      meshRef.current.rotation.x += delta * 8;
      meshRef.current.rotation.y += delta * 10;
      meshRef.current.rotation.z += delta * 6;
    }
  });

  // Get geometry based on dice type
  const getGeometry = () => {
    switch (type) {
      case 'd4':
        return <tetrahedronGeometry args={[1, 0]} />;
      case 'd6':
        return <boxGeometry args={[1.2, 1.2, 1.2]} />;
      case 'd8':
        return <octahedronGeometry args={[1, 0]} />;
      case 'd10':
        // D10 approximated with dodecahedron
        return <dodecahedronGeometry args={[1, 0]} />;
      case 'd12':
        return <dodecahedronGeometry args={[1, 0]} />;
      case 'd20':
      default:
        return <icosahedronGeometry args={[1, 0]} />;
    }
  };

  // Material color based on dice type
  const getColor = () => {
    switch (type) {
      case 'd20':
        return '#1a1a2e'; // Dark obsidian
      case 'd6':
        return '#2d2d3a';
      default:
        return '#1e1e28';
    }
  };

  const isCritical = type === 'd20' && result === 20;
  const isCritFail = type === 'd20' && result === 1;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#c9a227" />
      
      {/* Critical glow light */}
      {isCritical && (
        <pointLight position={[0, 0, 3]} intensity={2} color="#ffd700" />
      )}
      {isCritFail && (
        <pointLight position={[0, 0, 3]} intensity={2} color="#ff4444" />
      )}

      {/* Dice Mesh */}
      <animated.mesh
        ref={meshRef}
        rotation={rotation as any}
        scale={isRolling ? 1 : 1.2}
      >
        {getGeometry()}
        <meshStandardMaterial
          color={getColor()}
          metalness={0.8}
          roughness={0.2}
          emissive={isCritical ? '#ffd700' : isCritFail ? '#ff4444' : '#c9a227'}
          emissiveIntensity={isCritical || isCritFail ? 0.5 : 0.1}
        />
      </animated.mesh>

      {/* Gold edge highlights - wireframe overlay */}
      <animated.mesh
        rotation={rotation as any}
        scale={isRolling ? 1.01 : 1.21}
      >
        {getGeometry()}
        <meshBasicMaterial
          color="#c9a227"
          wireframe
          transparent
          opacity={0.3}
        />
      </animated.mesh>

      {/* Floor plane for shadow reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </>
  );
}

