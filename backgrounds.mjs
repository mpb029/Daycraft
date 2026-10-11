export const BACKGROUNDS=Object.freeze({
 meadow:{name:'Meadow',description:'Long grass, rolling hills and room for your collection.'},
 water:{name:'Water planet',description:'Endless gentle water, with a towering wave passing every 20 minutes.'}
});
export const normaliseBackground=id=>Object.hasOwn(BACKGROUNDS,id)?id:'meadow';
