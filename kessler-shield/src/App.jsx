import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as satellite from 'satellite.js';
import Globe from './Globe';

function LiveTelemetry({ sat, isTracking, setTrackingMode }) {
  const [metrics, setMetrics] = useState({ alt: '0', vel: '0', lat: '0', lng: '0' });
  const [riskAssessment, setRiskAssessment] = useState({ level: 'CALCULATING', color: 'text-gray-500', msg: '' });

  // Parse static Keplerian elements
  const satrec = useMemo(() => satellite.twoline2satrec(sat.tle1, sat.tle2), [sat]);
  const inclination = (satrec.inclo * (180 / Math.PI)).toFixed(2);
  const eccentricity = satrec.ecco.toFixed(5);
  const period = ((2 * Math.PI) / satrec.no).toFixed(2);
  const revsPerDay = (satrec.no * (1440 / (2 * Math.PI))).toFixed(2);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const posVel = satellite.propagate(satrec, now);
      if (!posVel.position || !posVel.velocity) return;

      const velMag = Math.sqrt(Math.pow(posVel.velocity.x, 2) + Math.pow(posVel.velocity.y, 2) + Math.pow(posVel.velocity.z, 2)).toFixed(2);
      const geodetic = satellite.eciToGeodetic(posVel.position, satellite.gstime(now));
      const alt = geodetic.height;
      
      setMetrics({
        alt: alt.toFixed(2),
        vel: velMag,
        lat: satellite.degreesLat(geodetic.latitude).toFixed(2),
        lng: satellite.degreesLong(geodetic.longitude).toFixed(2)
      });

      if (alt < 500) {
        setRiskAssessment({ level: 'LOW', color: 'text-[#00FFCC]', msg: 'Atmospheric drag prevents long-term debris buildup. Safe orbit.' });
      } else if (alt >= 500 && alt <= 1000) {
        setRiskAssessment({ level: 'CRITICAL', color: 'text-[#FF3366]', msg: 'Peak spatial density zone. Kessler Syndrome risk is extreme.' });
      } else if (alt > 1000 && alt < 2000) {
        setRiskAssessment({ level: 'ELEVATED', color: 'text-[#FFB300]', msg: 'Upper LEO. Debris persists for centuries.' });
      } else {
        setRiskAssessment({ level: 'STABLE', color: 'text-gray-300', msg: 'MEO/GEO orbit. Low spatial density, structurally monitored.' });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [satrec]);

  return (
    <div className="space-y-4">
      <div className="bg-[#00FFCC]/10 border border-[#00FFCC]/30 p-3 rounded flex justify-between items-start">
        <div>
          <p className="text-[#00FFCC] font-bold text-lg tracking-tight">{sat.name}</p>
          <p className="text-[10px] text-green-400 mt-1 uppercase">Status: Active Tracking</p>
        </div>
      </div>

      <div className="bg-black p-3 rounded border border-gray-800">
        <label className="text-[10px] text-gray-500 block mb-2 border-b border-gray-800 pb-1">CONJUNCTION RISK</label>
        <div className="py-1">
          <p className="text-xs text-gray-300">THREAT LEVEL: <span className={`font-bold ${riskAssessment.color}`}>{riskAssessment.level}</span></p>
          <p className="text-[9px] text-gray-500 mt-1">{riskAssessment.msg}</p>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
          <button 
            onClick={() => setTrackingMode(!isTracking)}
            className={`flex-1 text-xs py-1.5 rounded font-bold uppercase transition-colors ${
              isTracking ? 'bg-[#FF3366] text-black' : 'bg-[#00FFCC] text-black'
            }`}
          >
            {isTracking ? 'Unlock Camera' : 'Track Orbit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black p-2 rounded border border-gray-800">
          <label className="text-[9px] text-gray-500 block mb-1">ALTITUDE</label>
          <span className="text-sm text-white">{metrics.alt} km</span>
        </div>
        <div className="bg-black p-2 rounded border border-gray-800">
          <label className="text-[9px] text-gray-500 block mb-1">VELOCITY</label>
          <span className="text-sm text-white">{metrics.vel} km/s</span>
        </div>
        <div className="bg-black p-2 rounded border border-gray-800">
          <label className="text-[9px] text-gray-500 block mb-1">LATITUDE</label>
          <span className="text-sm text-white">{metrics.lat}°</span>
        </div>
        <div className="bg-black p-2 rounded border border-gray-800">
          <label className="text-[9px] text-gray-500 block mb-1">LONGITUDE</label>
          <span className="text-sm text-white">{metrics.lng}°</span>
        </div>
      </div>

      <div className="bg-black p-3 rounded border border-gray-800 overflow-hidden">
        <label className="text-[10px] text-gray-500 block mb-2 border-b border-gray-800 pb-1">ORBITAL MECHANICS</label>
        <div className="grid grid-cols-2 gap-y-3 mt-2">
          <div>
            <label className="text-[8px] text-gray-500 block">INCLINATION</label>
            <span className="text-xs text-gray-300">{inclination}°</span>
          </div>
          <div>
            <label className="text-[8px] text-gray-500 block">ECCENTRICITY</label>
            <span className="text-xs text-gray-300">{eccentricity}</span>
          </div>
          <div>
            <label className="text-[8px] text-gray-500 block">PERIOD</label>
            <span className="text-xs text-gray-300">{period} min</span>
          </div>
          <div>
            <label className="text-[8px] text-gray-500 block">MEAN MOTION</label>
            <span className="text-xs text-gray-300">{revsPerDay} rev/day</span>
          </div>
        </div>
      </div>
      
      <div className="bg-black p-2 rounded border border-gray-900 overflow-x-auto">
         <p className="text-[8px] text-gray-600 font-mono whitespace-nowrap">{sat.tle1}</p>
         <p className="text-[8px] text-gray-600 font-mono whitespace-nowrap">{sat.tle2}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [catalog, setCatalog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSat, setSelectedSat] = useState(null);
  const [trackingMode, setTrackingMode] = useState(false);
  const [hoveredSatName, setHoveredSatName] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [catalogLimit, setCatalogLimit] = useState(5000);

  useEffect(() => {
    fetch(`http://localhost:8000/catalog?limit=${catalogLimit}`)
      .then(res => res.json())
      .then(data => setCatalog(data))
      .catch(err => console.error("API offline", err));
  }, [catalogLimit]);

  const filteredCatalog = catalog.filter(sat => 
    sat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSatellite = (sat) => {
    setSelectedSat(sat);
    setTrackingMode(false); 
  };

  const handleClearTarget = () => {
    setSelectedSat(null);
    setTrackingMode(false);
  };

  const shellData = useMemo(() => {
    let counts = { low: 0, mid: 0, high: 0 };
    const now = new Date();
    
    catalog.forEach(sat => {
      try {
        const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
        const pos = satellite.propagate(satrec, now).position;
        if (pos) {
          const geodetic = satellite.eciToGeodetic(pos, satellite.gstime(now));
          const alt = geodetic.height;
          
          if (alt < 500) counts.low++;
          else if (alt >= 500 && alt <= 1000) counts.mid++;
          else if (alt > 1000 && alt <= 2000) counts.high++;
        }
      } catch (e) {}
    });
    return counts;
  }, [catalog]);

  const CAP_LOW = 50000;
  const CAP_MID = 10000; 
  const CAP_HIGH = 15000;

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden font-mono relative">
      
      <div 
        className={`fixed p-2 text-xs bg-black/80 text-[#00FFCC] border border-[#00FFCC] rounded pointer-events-none z-30 transition-opacity flex items-center gap-2 ${
          hoveredSatName ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ left: `${tooltipPos.x + 10}px`, top: `${tooltipPos.y + 10}px` }}
      >
        <div className="w-1 h-3 bg-red-500"></div>
        {hoveredSatName}
      </div>

      <div className="absolute inset-0 w-full h-full z-0">
        <Canvas camera={{ position: [0, 0, 22], fov: 45 }}>
          <color attach="background" args={['#020202']} />
          <OrbitControls enabled={!trackingMode} enablePan={false} maxDistance={40} minDistance={8} />
          <Suspense fallback={null}>
            <Globe 
              tleData={filteredCatalog} 
              onSelectSatellite={handleSelectSatellite} 
              trackingMode={trackingMode}
              setHoveredSatName={setHoveredSatName}
              setTooltipPos={setTooltipPos}
              selectedSat={selectedSat}
            />
            <EffectComposer>
              <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={1.5} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute top-0 left-0 p-6 z-10 pointer-events-none w-96">
        <h1 className="text-3xl text-[#00FFCC] font-bold tracking-widest drop-shadow-md">KESSLER SHIELD</h1>
        <p className="text-xs text-gray-400 mt-1">LEO Probabilistic Risk Assessment Console</p>
        
        <div className="mt-4 flex gap-2 pointer-events-auto">
          <button 
            onClick={() => setCatalogLimit(5000)}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded border transition-colors ${
              catalogLimit === 5000 
                ? 'bg-[#00FFCC] text-black border-[#00FFCC]' 
                : 'bg-black text-gray-500 border-gray-800 hover:border-[#00FFCC]'
            }`}
          >
            Performance (5K)
          </button>
          <button 
            onClick={() => setCatalogLimit(25000)}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded border transition-colors ${
              catalogLimit === 25000 
                ? 'bg-[#FF3366] text-black border-[#FF3366]' 
                : 'bg-black text-gray-500 border-gray-800 hover:border-[#FF3366]'
            }`}
          >
            Max Kessler (25K)
          </button>
        </div>

        <div className="mt-4 pointer-events-auto">
          <input 
            type="text" 
            placeholder="Search catalog (e.g., STARLINK)..." 
            className="w-full bg-black/60 border border-gray-800 text-[#00FFCC] text-sm px-4 py-2 rounded focus:outline-none focus:border-[#00FFCC]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="absolute top-0 right-0 h-full w-[400px] bg-[#050505]/80 backdrop-blur-md border-l border-gray-800 p-6 z-20 flex flex-col gap-4 overflow-y-auto">
        
        <div>
          <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-3">
            <h2 className="text-sm font-bold text-gray-400">TARGET ACQUISITION</h2>
            {selectedSat && (
              <button 
                onClick={handleClearTarget}
                className="text-[10px] text-gray-500 hover:text-[#FF3366] transition-colors uppercase font-bold pointer-events-auto"
              >
                [ Clear Target ]
              </button>
            )}
          </div>
          
          {selectedSat ? (
            <LiveTelemetry sat={selectedSat} isTracking={trackingMode} setTrackingMode={setTrackingMode} />
          ) : (
            <div className="h-24 flex items-center justify-center border border-dashed border-gray-700 rounded text-gray-600 text-xs">
              CLICK A SATELLITE TO LOCK TARGET
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-400 border-b border-gray-700 pb-2 mb-3 mt-4">SHELL-BASED KESSLER PREDICTOR</h2>
          
          <div className="bg-black/50 p-3 rounded border border-gray-800 space-y-4">
            <div>
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span className="text-[#00FFCC]">LOW LEO (&lt; 500km)</span>
                <span className={shellData.low > CAP_LOW ? 'text-[#FF3366]' : 'text-[#00FFCC]'}>
                  {((shellData.low / CAP_LOW) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-900 h-1.5 rounded overflow-hidden flex mb-1">
                <div 
                  className={`h-full transition-all duration-1000 ${shellData.low > CAP_LOW ? 'bg-[#FF3366]' : 'bg-[#00FFCC]'}`} 
                  style={{ width: `${Math.min((shellData.low / CAP_LOW) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-[8px] text-gray-500">Rapid atmospheric decay. Cap: {CAP_LOW.toLocaleString()}</p>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span className="text-[#FF3366]">MID LEO (500 - 1000km)</span>
                <span className={shellData.mid > CAP_MID ? 'text-[#FF3366]' : 'text-[#FFB300]'}>
                  {((shellData.mid / CAP_MID) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-900 h-1.5 rounded overflow-hidden flex mb-1">
                <div 
                  className={`h-full transition-all duration-1000 ${shellData.mid > CAP_MID ? 'bg-[#FF3366]' : 'bg-[#FFB300]'}`} 
                  style={{ width: `${Math.min((shellData.mid / CAP_MID) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-[8px] text-gray-500">Decades of debris persistence. Cap: {CAP_MID.toLocaleString()}</p>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span className="text-[#FFB300]">UPPER LEO (1000 - 2000km)</span>
                <span className={shellData.high > CAP_HIGH ? 'text-[#FF3366]' : 'text-[#FFB300]'}>
                  {((shellData.high / CAP_HIGH) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-900 h-1.5 rounded overflow-hidden flex mb-1">
                <div 
                  className={`h-full transition-all duration-1000 ${shellData.high > CAP_HIGH ? 'bg-[#FF3366]' : 'bg-[#FFB300]'}`} 
                  style={{ width: `${Math.min((shellData.high / CAP_HIGH) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-[8px] text-gray-500">Centuries of debris persistence. Cap: {CAP_HIGH.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}