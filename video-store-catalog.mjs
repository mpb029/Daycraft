export const TRAILERS = Object.freeze([
 {title:'Back to the Future Part II',year:1989,provider:'youtube',id:'5LnPaD-jHdI',url:'https://www.youtube.com/watch?v=5LnPaD-jHdI',credit:'Theatrical trailer linked by Amblin'},
 {title:'Gremlins',year:1984,provider:'youtube',id:'gd20j2Hb-0Y',url:'https://www.youtube.com/watch?v=gd20j2Hb-0Y',credit:'Warner Bros. Entertainment'},
 {title:'Toys',year:1992,provider:'vimeo',id:305134422,url:'https://vimeo.com/305134422',credit:'Public HD trailer upload · requested 1992 exception'},
 {title:'The Thing',year:1982,provider:'youtube',id:'ySvzHdtCiWE',url:'https://www.youtube.com/watch?v=ySvzHdtCiWE',credit:'Scream Factory · the 1982 film'}
]);
// These are scans of specific US VHS editions, not generated packaging.
export const VHS_EDITIONS = Object.freeze([
 {id:'gremlins',title:'Gremlins',edition:'Warner Home Video · US 1985 · 11388',front:'./assets/video-store/gremlins-front.jpg',spine:'./assets/video-store/gremlins-spine.jpg',source:'https://vhscollector.com/movie/gremlins-0'},
 {id:'thing',title:'The Thing',edition:'MCA Videocassette · US · 77009',front:'./assets/video-store/thing-front.jpg',spine:'./assets/video-store/thing-spine.jpg',source:'https://vhscollector.com/movie/thing-0'},
 {id:'bttf',title:'Back to the Future',edition:'MCA Home Video · US 1986 · 80196',front:null,spine:'./assets/video-store/bttf-spine.jpg',source:'https://vhscollector.com/movie/back-future'}
]);
export function nextTrailer(index){return (index+1)%TRAILERS.length;}

// Four screen corners, clockwise from top left, in world metres.
export const STORE_TV = Object.freeze({width:1.56,height:1.17,position:[.55,2.87,-.08]});
export const STORE_VIEW = Object.freeze({yaw:-.045,pitch:.035,fov:62});
export const STORE_EYES = Object.freeze({entrance:[.7,1.72,8.4],tv:[.55,2.37,3.55],shelf:[-2.72,1.13,6.78]});
export function storeCameraPose(view,station='entrance'){
 const {yaw,pitch}=view;
 return {position:[...(STORE_EYES[station]||STORE_EYES.entrance)],direction:[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)]};
}
