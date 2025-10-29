import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import AnimatedMarker from './AnimatedMarker';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateSpeedKmH, calculateTotalDistance } from '../utils';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const INITIAL_CENTER = [17.385044, 78.486671];
const ZOOM_LEVEL = 15;

// Custom vehicle icon
const vehicleIcon = L.divIcon({
    className: 'vehicle-marker',
    html: `
        <div class="relative">
            <div class="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 animate-ping"></div>
            <div class="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30 animate-pulse" 
                 style="animation-delay: 0.5s"></div>
            <div class="relative z-10 text-2xl transform -translate-x-2 -translate-y-2 animate-bounce"
                 style="animation-duration: 2s">🚗</div>
        </div>
    `,
    iconSize: [32, 32]
});

function VehicleMap() {
    const [routeData, setRouteData] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [showInfo, setShowInfo] = useState(true);
    const intervalRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await fetch('/dummy-route.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Validate data structure
                if (!Array.isArray(data)) {
                    throw new Error('Route data must be an array');
                }
                
                // Validate each point
                const validData = data.every(point => 
                    typeof point.latitude === 'number' && 
                    typeof point.longitude === 'number' &&
                    !isNaN(point.latitude) && 
                    !isNaN(point.longitude) &&
                    point.latitude >= -90 && 
                    point.latitude <= 90 &&
                    point.longitude >= -180 && 
                    point.longitude <= 180
                );
                
                if (!validData) {
                    throw new Error('Invalid coordinates in route data');
                }
                
                setRouteData(data);
            } catch (error) {
                console.error("Error loading route data:", error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        // Start/stop interval when playback or speed changes. Do not include currentIndex
        // as a dependency because we update it inside the interval using functional setState.
    if (isPlaying && routeData.length > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex(prevIndex => {
                    if (prevIndex >= routeData.length - 1) {
                        setIsPlaying(false);
                        return prevIndex;
                    }
                    return prevIndex + 1;
                });
            }, 2000 / speed); // Update based on speed
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPlaying, routeData.length, speed]);

    const togglePlay = () => setIsPlaying(!isPlaying);
    const resetSimulation = () => {
        setIsPlaying(false);
        setCurrentIndex(0);
    };

    const currentPosition = routeData[currentIndex];
    const fullRouteCoords = routeData.map(p => [p.latitude, p.longitude]);
    const traveledRouteCoords = fullRouteCoords.slice(0, currentIndex + 1);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading route data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-4 max-w-md mx-auto">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                        <div className="mt-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="btn btn-danger"
                                aria-label="Retry loading route data"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentPosition) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-4">
                    <p className="text-gray-600">No route data available.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100vh] w-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900" style={{ minHeight: '100vh', height: '100vh' }}>
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 bg-repeat opacity-10 z-0" 
                 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Cpolygon points="0 0 20 0 10 10"%3E%3C/polygon%3E%3C/g%3E%3C/svg%3E")' }}>
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80 text-white p-4 z-[1000] backdrop-blur-sm shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-wider">
                        🚗 Vehicle Route Simulator
                    </h1>
                    <div className="text-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            <MapContainer
                center={INITIAL_CENTER}
                zoom={ZOOM_LEVEL}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
                style={{ background: 'rgba(0, 0, 0, 0.1)' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {routeData.length > 0 && (
                    <>
                        <Polyline
                            pathOptions={{ color: 'gray', weight: 3, opacity: 0.5 }}
                            positions={fullRouteCoords}
                        />
                        <Polyline
                            pathOptions={{ color: 'red', weight: 5, opacity: 0.8 }}
                            positions={traveledRouteCoords}
                        />
                        <AnimatedMarker
                            position={[currentPosition.latitude, currentPosition.longitude]}
                            icon={vehicleIcon}
                            duration={2000} // Match the interval time
                        />
                    </>
                )}
            </MapContainer>

            {/* Info Toggle Button */}
            <button
                onClick={() => setShowInfo(!showInfo)}
                className="absolute top-20 right-4 z-[1000] btn-icon"
                title={showInfo ? "Hide Info" : "Show Info"}
                aria-pressed={showInfo}
            >
                <span className="text-xl">ℹ️</span>
            </button>

            {/* Controls Panel */}
            <div className={`absolute top-20 right-4 z-[1000] p-6 bg-white bg-opacity-90 backdrop-blur-md shadow-2xl rounded-2xl w-full max-w-xs md:max-w-sm 
                           transition-all duration-300 transform ${showInfo ? 'translate-y-12 opacity-100' : 'translate-y-0 opacity-0 pointer-events-none'}
                           border border-white border-opacity-20`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="title heading-glow">
                        Vehicle Status
                    </h2>
                    <div className="px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm shadow-md">
                        Point {currentIndex + 1}/{routeData.length}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="text-block bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-5 rounded-xl border border-white/20 backdrop-blur-sm">
                        <label className="label mb-2">Current Location</label>
                        <div className="font-mono stat break-all bg-white/50 p-3 rounded-lg text-black">
                            {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-block bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-5 rounded-xl border border-white/20 backdrop-blur-sm">
                            <label className="label mb-2">Speed</label>
                            <div className="stat text-green-400">
                                {calculateSpeedKmH(currentIndex, routeData)} km/h
                            </div>
                        </div>
                        <div className="text-block bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-5 rounded-xl border border-white/20 backdrop-blur-sm">
                            <label className="label mb-2">Distance</label>
                            <div className="stat text-purple-300">
                                {calculateTotalDistance(routeData, currentIndex)} km
                            </div>
                        </div>
                    </div>

                    <div className="text-block bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-5 rounded-xl border border-white/20 backdrop-blur-sm">
                        <label className="label mb-2">Timestamp</label>
                        <div className="stat text-orange-200">
                            {new Date(currentPosition.timestamp).toLocaleTimeString()}
                        </div>
                    </div>                    {/* Simulation Speed Control */}
                    <div className="mt-8 mb-6 text-block">
                        <label className="label mb-3">
                            Simulation Speed
                        </label>
                        <div className="btn-group">
                            <button 
                                onClick={() => setSpeed(0.5)} 
                                className="btn-speed" 
                                aria-pressed={speed === 0.5}
                            >
                                0.5x
                            </button>
                            <button 
                                onClick={() => setSpeed(1)} 
                                className="btn-speed" 
                                aria-pressed={speed === 1}
                            >
                                1x
                            </button>
                            <button 
                                onClick={() => setSpeed(2)} 
                                className="btn-speed" 
                                aria-pressed={speed === 2}
                            >
                                2x
                            </button>
                            <button 
                                onClick={() => setSpeed(5)} 
                                className="btn-speed" 
                                aria-pressed={speed === 5}
                            >
                                5x
                            </button>
                        </div>
                    </div>

                    {/* Control Buttons */}
                        <div className="flex gap-4 mt-6 p-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 rounded-xl border border-white/10 backdrop-blur-sm">
                            <button
                                onClick={togglePlay}
                                className={`btn flex-1 ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
                                aria-pressed={isPlaying}
                            >
                                {isPlaying ? '⏸ Pause' : '▶ Play'}
                            </button>
                            <button
                                onClick={resetSimulation}
                                className="btn btn-reset"
                            >
                                🔄 Reset
                            </button>
                        </div>
                </div>
            </div>
        </div>
    );
}

export default VehicleMap;