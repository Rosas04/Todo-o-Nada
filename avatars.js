(function(root){
 const avatars=[
  {file:'pato-sinfondo.png',name:'Pato'},
  {file:'fantasmacute-sinfondo.png',name:'Fantasma tierno'},
  {file:'calavera-sinfondo.png',name:'Calavera'},
  {file:'caraderretida-sinfondo.png',name:'Cara derretida'},
  {file:'fantasma-sinfondo.png',name:'Fantasma'},
  {file:'copa-sinfondo.png',name:'Copa'}
 ];
 if(typeof module!=='undefined'&&module.exports)module.exports=avatars;else root.PLAYER_AVATARS=avatars;
})(typeof globalThis!=='undefined'?globalThis:this);
