// src/Globe.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { Sphere, useTexture } from '@react-three/drei';

const EARTH_RADIUS = 10;
const SCALE_FACTOR = EARTH_RADIUS / 6371; 

export default function Globe({
  tleData,
  onSelectSatellite,
  trackingMode,
  setHoveredSatName,
  setTooltipPos,
  selectedSat
}) {
  const meshRef = useRef();
  const earthRef = useRef();
  const targetRingRef = useRef(); 
  const [satRecs, setSatRecs] = useState([]);
  
  const { camera } = useThree();
  const earthTexture = useTexture('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');

  const tempObject = new THREE.Object3D();
  const tempColor = new THREE.Color();
  const targetVec = new THREE.Vector3();

  useEffect(() => {
    if (!meshRef.current || !tleData || tleData.length === 0) return;

    // CRITICAL FIX: Override the hidden Raycaster hitbox to wrap the entire orbital system
    if (meshRef.current.geometry) {
      meshRef.current.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);
    }

    const recs = [];
    tleData.forEach((sat, i) => {
      try {
        const rec = satellite.twoline2satrec(sat.tle1, sat.tle2);
        recs.push({ sat, rec, index: i });
        
        const revsPerDay = rec.no * (1440 / (2 * Math.PI));

        if (sat.name.includes('DEB')) {
          tempColor.set('#FF8800'); 
        } else if (revsPerDay >= 11.25) {
          tempColor.set('#00FFCC'); 
        } else if (revsPerDay > 1.5) {
          tempColor.set('#B366FF'); 
        } else {
          tempColor.set('#FFFFAA'); 
        }
        
        meshRef.current.setColorAt(i, tempColor);
      } catch (e) {}
    });

    meshRef.current.instanceColor.needsUpdate = true;
    setSatRecs(recs);
  }, [tleData]);

  useFrame(({ clock }) => {
    if (!meshRef.current || satRecs.length === 0) return;

    const now = new Date();
    const frameId = Math.floor(clock.getElapsedTime() * 60) % 4;
    
    // 1. Time-Sliced Background Swarm
    for (let i = frameId; i < satRecs.length; i += 4) {
      const { rec, index } = satRecs[i];
      try {
        const posVel = satellite.propagate(rec, now);
        if (posVel.position) {
          const x = posVel.position.x * SCALE_FACTOR;
          const y = posVel.position.y * SCALE_FACTOR;
          const z = posVel.position.z * SCALE_FACTOR;
          
          tempObject.position.set(x, z, -y);
          tempObject.scale.set(1, 1, 1); 
          tempObject.updateMatrix();
          
          meshRef.current.setMatrixAt(index, tempObject.matrix);
        }
      } catch (e) {}
    }

    // 2. Continuous 60 FPS Target Lock
    if (selectedSat) {
      const target = satRecs.find(r => r.sat.name === selectedSat.name);
      if (target) {
        try {
          const posVel = satellite.propagate(target.rec, now);
          if (posVel.position) {
            const x = posVel.position.x * SCALE_FACTOR;
            const y = posVel.position.y * SCALE_FACTOR;
            const z = posVel.position.z * SCALE_FACTOR;
            
            targetVec.set(x, z, -y);
            
            tempObject.position.set(x, z, -y);
            tempObject.scale.set(1, 1, 1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(target.index, tempObject.matrix);
            
            if (targetRingRef.current) {
              targetRingRef.current.position.copy(targetVec);
              targetRingRef.current.rotation.x -= 0.02;
              targetRingRef.current.rotation.y += 0.02;
              targetRingRef.current.visible = true;
            }
            
            if (trackingMode) {
              camera.position.lerp(targetVec.clone().multiplyScalar(1.6), 0.08);
              camera.lookAt(0, 0, 0);
            }
          }
        } catch (e) {}
      }
    } else {
      if (targetRingRef.current) targetRingRef.current.visible = false;
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;

    // 3. Independent Earth Rotation
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0005;
    }
  });

  const handlePointerMove = (e) => {
    if (e.instanceId !== undefined) {
       const hovered = satRecs.find(r => r.index === e.instanceId);
       if (hovered) {
           setHoveredSatName(hovered.sat.name);
           setTooltipPos({ x: e.clientX, y: e.clientY });
       }
    }
  };

  const handlePointerOut = () => {
    setHoveredSatName(null);
  };

  const handleClick = (e) => {
    if (e.instanceId !== undefined) {
       const clicked = satRecs.find(r => r.index === e.instanceId);
       if (clicked) {
           onSelectSatellite(clicked.sat);
       }
    }
  };

  return (
    <group>
      <ambientLight intensity={0.2} />
      <directionalLight position={[15, 10, -10]} intensity={2} />

      <Sphere ref={earthRef} args={[EARTH_RADIUS, 64, 64]}>
        <meshStandardMaterial 
          map={earthTexture} 
          roughness={0.8}
        />
      </Sphere>

      {/* raycast={() => null} prevents the ring from intercepting your mouse clicks */}
      <mesh ref={targetRingRef} visible={false} raycast={() => null}>
        <torusGeometry args={[0.2, 0.02, 16, 32]} />
        <meshBasicMaterial color="#FF3366" transparent opacity={0.9} />
      </mesh>

      <instancedMesh
        ref={meshRef}
        args={[null, null, tleData.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
