// src/Globe.jsx
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { useTexture } from '@react-three/drei';

const EARTH_RADIUS = 6371;
const SCALE_FACTOR = 0.001;

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
  const reticleRef = useRef();
  
  // Track frames for Time Slicing optimization
  const frameCount = useRef(0);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  
  const desiredCamPos = useMemo(() => new THREE.Vector3(), []);
  const desiredLookAt = useMemo(() => new THREE.Vector3(), []);
  
  const { camera, raycaster, mouse, size } = useThree();
  const earthTexture = useTexture('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');

  const { satrecs, colors } = useMemo(() => {
    const recs = [];
    const colorArray = new Float32Array(tleData.length * 3);
    const now = new Date();

    tleData.forEach((sat, i) => {
      const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
      recs.push(satrec);

      try {
        const positionAndVelocity = satellite.propagate(satrec, now);
        const gmst = satellite.gstime(now);
        const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
        const alt = geodetic.height;

        if (alt < 2000) tempColor.set('#00FFCC');       
        else if (alt < 35000) tempColor.set('#FFB300'); 
        else tempColor.set('#FF3366');                  
      } catch (e) {
        tempColor.set('#FFFFFF');
      }
      tempColor.toArray(colorArray, i * 3);
    });
    return { satrecs: recs, colors: colorArray };
  }, [tleData, tempColor]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3));
    }
  }, [colors]);

  useFrame(() => {
    if (!meshRef.current || satrecs.length === 0) return;
    const now = new Date();
    
    earthRef.current.rotation.y += 0.0005;

    // ---------------------------------------------------------
    // OPTIMIZATION: Time Slicing (Split updates across 4 frames)
    // ---------------------------------------------------------
    const CHUNKS = 4;
    const chunkSize = Math.ceil(satrecs.length / CHUNKS);
    const startIdx = (frameCount.current % CHUNKS) * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, satrecs.length);

    for (let i = startIdx; i < endIdx; i++) {
      const satrec = satrecs[i];
      const positionAndVelocity = satellite.propagate(satrec, now);
      const positionEci = positionAndVelocity.position;
      
      if (positionEci) {
        dummy.position.set(
          positionEci.x * SCALE_FACTOR,
          positionEci.z * SCALE_FACTOR,
          -positionEci.y * SCALE_FACTOR
        );
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    frameCount.current += 1;

    // ---------------------------------------------------------
    // Target Reticle & Auto-Pilot
    // ---------------------------------------------------------
    if (selectedSat && reticleRef.current) {
      const targetSatrec = satellite.twoline2satrec(selectedSat.tle1, selectedSat.tle2);
      const targetPos = satellite.propagate(targetSatrec, now).position;
      
      if (targetPos) {
        reticleRef.current.position.set(
          targetPos.x * SCALE_FACTOR,
          targetPos.z * SCALE_FACTOR,
          -targetPos.y * SCALE_FACTOR
        );
        reticleRef.current.rotation.z += 0.02;
        reticleRef.current.rotation.x += 0.01;
        reticleRef.current.visible = true;

        if (trackingMode) {
          desiredLookAt.copy(reticleRef.current.position);
          const viewOffset = new THREE.Vector3(2, 1, 2);
          desiredCamPos.set(
            desiredLookAt.x + viewOffset.x, 
            desiredLookAt.y + viewOffset.y, 
            desiredLookAt.z + viewOffset.z
          );
          camera.position.lerp(desiredCamPos, 0.05);
          camera.lookAt(desiredLookAt);
        }
      }
    } else if (reticleRef.current) {
      reticleRef.current.visible = false;
    }

    // Raycasting for Hover Tooltip
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(meshRef.current);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      const hoveredSat = tleData[instanceId];
      const mouseX = (mouse.x + 1) / 2 * size.width;
      const mouseY = (-mouse.y + 1) / 2 * size.height;
      
      setHoveredSatName(hoveredSat.name);
      setTooltipPos({ x: mouseX, y: mouseY });
    } else {
      setHoveredSatName(null);
    }
  });

  return (
    <group>
      <ambientLight intensity={0.15} />
      <directionalLight position={[50, 20, 30]} intensity={2.5} />
      
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS * SCALE_FACTOR, 64, 64]} />
        <meshStandardMaterial map={earthTexture} roughness={0.6} metalness={0.1} />
      </mesh>

      <mesh ref={reticleRef} visible={false}>
        <torusGeometry args={[0.1, 0.01, 16, 32]} />
        <meshBasicMaterial color="#FF3366" toneMapped={false} />
      </mesh>

      <instancedMesh 
        ref={meshRef} 
        args={[null, null, satrecs.length]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectSatellite(tleData[e.instanceId]);
        }}
      >
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial vertexColors={true} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}