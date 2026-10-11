// Approximate starting area; optional device coordinates never leave this app.
export const DEFAULT_SKY_LOCATION=Object.freeze({latitude:-26.2,longitude:152.67,label:'Gympie area (approximate)',source:'default'});

export function validCoordinates(latitude,longitude){
 return typeof latitude==='number'&&typeof longitude==='number'&&Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
}
export function normaliseSkyLocation(value){
 if(!value||!validCoordinates(value.latitude,value.longitude))return {...DEFAULT_SKY_LOCATION};
 return {latitude:value.latitude,longitude:value.longitude,label:typeof value.label==='string'?value.label.trim().slice(0,60)||'Saved location':'Saved location',source:['device','manual','default'].includes(value.source)?value.source:'manual'};
}
export function manualSkyLocation(latitude,longitude,label=''){
 if(String(latitude).trim()===''||String(longitude).trim()===''||!validCoordinates(Number(latitude),Number(longitude)))throw Error('Enter a latitude from −90 to 90 and a longitude from −180 to 180.');
 return normaliseSkyLocation({latitude:Number(latitude),longitude:Number(longitude),label:String(label).trim()||'My location',source:'manual'});
}
export function requestSkyLocation(geolocation=globalThis.navigator?.geolocation){
 if(!geolocation)return Promise.reject(Error('Location is unavailable here. You can enter your coordinates instead.'));
 return new Promise((resolve,reject)=>geolocation.getCurrentPosition(position=>{
  const latitude=Math.round(position.coords.latitude*1000)/1000,longitude=Math.round(position.coords.longitude*1000)/1000;
  if(!validCoordinates(latitude,longitude)){reject(Error('The device returned an invalid location. Your saved location has not changed.'));return;}
  resolve({latitude,longitude,label:'Device location (saved)',source:'device'});
 },error=>reject(Error(error?.code===1?'Location permission was not granted. Your saved location has not changed. You can enter coordinates instead.':'Your location could not be found. Your saved location has not changed. Try again or enter coordinates.')),{enableHighAccuracy:false,timeout:10000,maximumAge:86400000}));
}
