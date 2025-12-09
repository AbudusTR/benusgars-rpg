import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Plane } from '@react-three/drei';
import * as THREE from 'three';
import BlockCharacter from './BlockCharacter';
import { GameState, Enemy } from '../types';

interface GameSceneProps {
  gameState: GameState;
  currentZoneColor: string;
  currentEnemy: Enemy | null;
}

// Component to handle Player Movement and Camera Follow
const PlayerController = ({ 
  playerPosRef 
}: { 
  playerPosRef: React.MutableRefObject<THREE.Vector3> 
}) => {
  const { camera } = useThree();
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const isMoving = useRef(false);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.code]: true }));
    const handleUp = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.code]: false }));
    
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let moveX = 0;
    let moveZ = 0;
    const speed = 10 * delta; // Movement speed

    // Check input keys
    if (keys['KeyW'] || keys['ArrowUp']) moveZ -= speed;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ += speed;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= speed;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += speed;

    isMoving.current = moveX !== 0 || moveZ !== 0;

    if (isMoving.current) {
        // Update Position
        playerPosRef.current.x += moveX;
        playerPosRef.current.z += moveZ;

        // Clamp to map bounds
        playerPosRef.current.x = Math.max(-490, Math.min(490, playerPosRef.current.x));
        playerPosRef.current.z = Math.max(-490, Math.min(490, playerPosRef.current.z));

        // Rotate character to face movement direction
        const angle = Math.atan2(moveX, moveZ);
        groupRef.current.rotation.y = angle;
    }

    // Sync React Mesh with Ref Position
    groupRef.current.position.copy(playerPosRef.current);

    // Camera Follow Logic (Top-Down / Third Person)
    const targetCamPos = new THREE.Vector3(
        playerPosRef.current.x,
        12, // Height
        playerPosRef.current.z + 12 // Distance back
    );
    camera.position.lerp(targetCamPos, 0.1); // Smooth follow
    camera.lookAt(playerPosRef.current);
  });

  return (
    <group ref={groupRef} position={playerPosRef.current}>
      <BlockCharacter 
        color="#3b82f6" 
        position={[0, 0, 0]} 
        isAnimating={isMoving.current} 
      />
    </group>
  );
};

// Component to handle Camera during Combat
const CombatCamera = () => {
  const { camera } = useThree();
  useFrame(() => {
      // Fixed Combat View
      camera.position.lerp(new THREE.Vector3(0, 5, 10), 0.05);
      camera.lookAt(0, 0, 0);
  });
  return null;
}

const GameScene: React.FC<GameSceneProps> = ({ gameState, currentZoneColor, currentEnemy }) => {
  // Store player position in a ref so it persists between renders/modes
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0));

  return (
    <div className="absolute inset-0 z-0">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        <color attach="background" args={['#111']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Ground */}
        <Plane args={[1000, 1000]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color={currentZoneColor} />
        </Plane>

        {gameState === GameState.ROAMING ? (
            <PlayerController playerPosRef={playerPosRef} />
        ) : (
            // Static Player for Combat
            <BlockCharacter 
                color="#3b82f6" 
                position={[-3, 0, 0]} 
                rotation={[0, Math.PI / 2, 0]}
                isAnimating={false}
            />
        )}

        {/* Enemy (Only in Combat) */}
        {gameState === GameState.COMBAT && currentEnemy && (
          <>
            <BlockCharacter 
                color={currentEnemy.color} 
                position={[3, 0, 0]} 
                rotation={[0, -Math.PI / 2, 0]}
                isAnimating={true}
            />
            <CombatCamera />
            {/* OrbitControls allowed in combat for looking around if desired */}
            <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 - 0.1} />
          </>
        )}
      </Canvas>
      
      {/* Instructions */}
      {gameState === GameState.ROAMING && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono pointer-events-none bg-black/20 p-1 rounded">
              WASD to Move
          </div>
      )}
    </div>
  );
};

export default GameScene;