import React, { useEffect, useRef } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

function AnimatedMarker({ position, icon, duration = 2000 }) {
    const markerRef = useRef(null);
    const map = useMap();
    const lastPosition = useRef(position);
    const frameRef = useRef(null);

    useEffect(() => {
        if (!markerRef.current || !position) return;

        const marker = markerRef.current;
        const startLatLng = marker.getLatLng();
        const endLatLng = L.latLng(position);

        // If it's the first position, just set it without animation
        if (!lastPosition.current) {
            marker.setLatLng(endLatLng);
            lastPosition.current = position;
            return;
        }

        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(1, elapsedTime / duration);

            // Linear interpolation between points
            const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * progress;
            const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * progress;

            marker.setLatLng([lat, lng]);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                marker.setLatLng(endLatLng);
                lastPosition.current = position;
            }
        };

        // Cancel any ongoing animation
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }

        frameRef.current = requestAnimationFrame(animate);

        // Pan map to follow the marker with smooth animation
        map.panTo(endLatLng, {
            duration: duration / 1000,
            easeLinearity: 0.5,
        });

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [position, duration, map]);

    return <Marker ref={markerRef} position={position} icon={icon} />;
}

export default AnimatedMarker;