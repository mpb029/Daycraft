export const BACKGROUNDS=Object.freeze({
 meadow:{name:'Meadow',description:'Long grass, rolling hills and room for your collection.'},
 water:{name:'Water planet',description:'Endless gentle water, with a towering wave passing every 20 minutes.'},
 cinema:{name:'90s Macca’s',description:'Burgundy booths, lush plants and familiar fibreglass mascots in a quiet 90s restaurant.'},
 'video-store':{name:'After Hours Video',description:'An independent video store, film posters and sunny windows overlooking the car park.'},
 forest:{name:'Forest bus stop',description:'Rain, towering trees and a warm lamp beside a quiet forest road.'}
});
export const normaliseBackground=id=>Object.hasOwn(BACKGROUNDS,id)?id:'meadow';
export const backgroundRain=settings=>settings.background==='cinema'?false:settings.background==='video-store'?settings.storeRain===true:settings.background==='forest'?settings.forestRain!==false:!!settings.rain;
