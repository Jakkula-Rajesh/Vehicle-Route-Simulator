// Calculate distance between two points using Haversine formula
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Convert degrees to radians
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Calculate speed in km/h between two points
export function calculateTotalDistance(routeData, currentIndex) {
    if (!routeData || currentIndex === 0) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i <= currentIndex; i++) {
        totalDistance += calculateDistanceKm(
            routeData[i-1].latitude,
            routeData[i-1].longitude,
            routeData[i].latitude,
            routeData[i].longitude
        );
    }
    return totalDistance.toFixed(2);
}

export function calculateSpeedKmH(currentIndex, routeData) {
    if (currentIndex === 0 || routeData.length <= 1) return '0.00';

    const currPoint = routeData[currentIndex];
    const prevPoint = routeData[currentIndex - 1];

    if (!prevPoint || !currPoint) return '0.00';

    const distanceKm = calculateDistanceKm(
        prevPoint.latitude, prevPoint.longitude,
        currPoint.latitude, currPoint.longitude
    );

    const timeDeltaMs = new Date(currPoint.timestamp).getTime() - 
                        new Date(prevPoint.timestamp).getTime();
    const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60); // Convert ms to hours

    if (timeDeltaHours <= 0) return 'N/A';

    const speed = distanceKm / timeDeltaHours; // Speed in km/h
    return speed.toFixed(2);
}