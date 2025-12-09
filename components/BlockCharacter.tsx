import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group } from 'three';

interface BlockCharacterProps {
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  isAnimating?: boolean;
}

const BlockCharacter: React.FC<BlockCharacterProps> = ({ color, position, rotation = [0, 0, 0], isAnimating = false }) => {
  const groupRef = useRef<Group>(null);
  const leftArmRef = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);
  const leftLegRef = useRef<Mesh>(null);
  const rightLegRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (isAnimating && groupRef.current) {
      const time = state.clock.getElapsedTime();
      // Simple walking animation
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(time * 10) * 0.5;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(time * 10) * 0.5;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(time * 10) * 0.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time * 10) * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation as any}>
      {/* Torso */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1, 1, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#fbbf24" /> {/* Skin toneish */}
      </mesh>

      {/* Arms */}
      <mesh ref={leftArmRef} position={[-0.75, 0.75, 0]}>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.75, 0.75, 0]}>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Legs */}
      <mesh ref={leftLegRef} position={[-0.25, 0, 0]}>
        <boxGeometry args={[0.45, 1, 0.5]} />
        <meshStandardMaterial color="#374151" /> {/* Pants */}
      </mesh>
      <mesh ref={rightLegRef} position={[0.25, 0, 0]}>
        <boxGeometry args={[0.45, 1, 0.5]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  );
};

export default BlockCharacter;