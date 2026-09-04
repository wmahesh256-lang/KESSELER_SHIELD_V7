# Kessler Shield

**LEO Probabilistic Risk Assessment & Orbital Traffic Console**

Kessler Shield is a high-performance, WebGL-accelerated space traffic monitoring system built for the Smart India Hackathon (Problem Statement 26209: Space Technology). It shifts satellite tracking from static data tables to a dynamic, live-computed 3D physics engine, capable of tracking up to 25,000 active satellites and debris fragments in real-time.

By applying continuous SGP4 orbital propagation calculus directly in the browser, the console predicts specific altitude shell saturation to evaluate the risk of Kessler Syndrome—a theoretical tipping point where low-Earth orbit (LEO) becomes so congested that collisions trigger a cascading chain reaction.

## Core Features

* **Real-Time SGP4 Kinematics:** Derives live velocity (km/s), geodetic altitude, latitude, and longitude from static NORAD Two-Line Element (TLE) telemetry.
* **Shell-Based Kessler Predictor:** Algorithmic risk assessment categorizing LEO into specific altitude shells (Low, Mid, High). It calculates live spatial density against atmospheric drag limits to flag critical "Danger Zones" (600km–1000km).
* **Hardware-Accelerated 3D Engine:** Leverages Instanced Meshing and algorithmic Time Slicing to render and compute 25,000 simultaneous 3D objects at 60 FPS without bottlenecking the main thread.
* **Interactive Targeting Computer:** Employs precise raycasting for hover-detection and a smooth, lerp-based auto-pilot camera that locks onto a target's orbital trajectory.

## System Architecture

The application utilizes a distributed, multi-language micro-architecture to separate high-speed data ingestion from computational rendering.

| Component | Technology | Primary Function |
| --- | --- | --- |
| **Data Broker** | Go | High-throughput concurrent ingestion of raw CelesTrak TLE streams. |
| **API Backend** | Python (FastAPI) | Serves cleaned telemetry to the client and handles database querying. |
| **Frontend UI** | React & Tailwind CSS | Manages state, dynamic targeting HUD, and risk assessment logic. |
| **3D Engine** | Three.js & React Three Fiber | WebGL rendering, instanced matrix calculations, and bloom post-processing. |
| **Astrodynamics** | `satellite.js` | Evaluates Keplerian elements and executes the mathematical propagation. |

## Installation & Execution

The system requires three active terminal processes to handle the data broker, API, and frontend concurrently.

**1. Clone the repository:**

```bash
git clone https://github.com/yourusername/kessler-shield.git
cd kessler-shield

```

**2. Start the Go Telemetry Broker (Terminal 1):**

```bash
# Fetches and processes raw TLE data
go run main.go

```

**3. Start the FastAPI Server (Terminal 2):**

```bash
# Activates the Python environment and serves the API on port 8000
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

```

**4. Start the Vite Frontend (Terminal 3):**

```bash
# Installs WebGL dependencies and launches the interactive UI
cd src
npm install
npm run dev

```

## Performance Note

Kessler Shield includes two rendering modes to accommodate different hardware profiles. **Performance Mode (5K)** isolates standard operational bounds, while **Max Kessler (25K)** pulls the entire global catalog. The engine is heavily optimized and will run the 25K swarm effortlessly on modern ARM architectures (such as Apple Silicon) at maximum framerates.

## Acknowledgements

Designed and engineered by **Team SynapTech**(is what I would say if my team helped me, but i did this entire thing on my own) at the College of Engineering, Guindy. Theoretical foundation based on the 1978 models of Donald J. Kessler and NORAD Spacetrack Report No. 3.