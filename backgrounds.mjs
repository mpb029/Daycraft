export const BACKGROUNDS=Object.freeze({
 meadow:{name:'Meadow',description:'Long grass, rolling hills and room for your collection.'},
 water:{name:'Water planet',description:'Endless gentle water, with a towering wave passing every 20 minutes.'},
 'video-store':{name:'1980s video store',description:'Blue carpet, original VHS scans and trailers on the ceiling TV.'},
 forest:{name:'Forest bus stop',description:'Rain, towering trees and a warm lamp beside a quiet forest road.'}
});
export const normaliseBackground=id=>Object.hasOwn(BACKGROUNDS,id)?id:'meadow';
export const backgroundRain=settings=>settings.background==='video-store'?false:settings.background==='forest'?settings.forestRain!==false:!!settings.rain;
