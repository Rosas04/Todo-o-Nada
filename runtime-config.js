const path=require('node:path');
function runtimeConfig(env=process.env){
 const port=Number(env.PORT||5173);
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('PORT debe ser un puerto válido.');
 const publicUrl=env.PUBLIC_URL||env.RENDER_EXTERNAL_URL||null;
 if(publicUrl){const address=new URL(publicUrl);if(!['http:','https:'].includes(address.protocol)||address.username||address.password)throw Error('PUBLIC_URL debe ser una dirección HTTP o HTTPS.');}
 if(env.RENDER==='true'&&!env.DATA_DIR)throw Error('Configura DATA_DIR con la ruta del disco persistente.');
 return {port,host:'0.0.0.0',statePath:path.join(path.resolve(env.DATA_DIR||path.join(__dirname,'.runtime')),'rooms.json'),publicUrl,trustProxy:env.RENDER==='true'||env.TRUST_PROXY==='1'};
}
module.exports={runtimeConfig};
