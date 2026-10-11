// Water planet is a fictional setting: its moon remains above the incoming
// wave every night. Meadow continues to use the real local lunar ephemeris.
const altitude=20*Math.PI/180,azimuth=6*Math.PI/180;
export const WATER_MOON=Object.freeze({
 altitude:20,fraction:.9,
 direction:Object.freeze([Math.sin(azimuth)*Math.cos(altitude),Math.sin(altitude),-Math.cos(azimuth)*Math.cos(altitude)]),
 right:Object.freeze([Math.cos(azimuth),0,Math.sin(azimuth)]),
 up:Object.freeze([-Math.sin(azimuth)*Math.sin(altitude),Math.cos(altitude),Math.cos(azimuth)*Math.sin(altitude)]),
 light:Object.freeze([-.6,0,.8])
});
// Keep celestial objects beyond the distant waves. Scaling their positions
// and sizes together preserves the same moon and stars in the camera view.
export const WATER_SKY_SCALE=13;
export const WATER_NIGHT=Object.freeze({top:'#122138',horizon:'#435b74',body:'#284353'});
