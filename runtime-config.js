const path=require('node:path');
function runtimeConfig(env=process.env){
 const port=Number(env.PORT||5173);
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('PORT debe ser un puerto válido.');
 const publicUrl=env.PUBLIC_URL||env.RENDER_EXTERNAL_URL||null;
 if(publicUrl){const address=new URL(publicUrl);if(!['http:','https:'].includes(address.protocol)||address.username||address.password)throw Error('PUBLIC_URL debe ser una dirección HTTP o HTTPS.');}
 if(env.STORAGE_MODE&&!['ephemeral','persistent'].includes(env.STORAGE_MODE))throw Error('STORAGE_MODE debe ser ephemeral o persistent.');
 const ephemeral=env.STORAGE_MODE==='ephemeral';
 if(env.RENDER==='true'&&!ephemeral&&!env.DATA_DIR)throw Error('Configura STORAGE_MODE=ephemeral para la demo gratuita o DATA_DIR para un disco persistente.');
 return {port,host:'0.0.0.0',statePath:ephemeral?null:path.join(path.resolve(env.DATA_DIR||path.join(__dirname,'.runtime')),'rooms.json'),publicUrl,trustProxy:env.RENDER==='true'||env.TRUST_PROXY==='1'};
}
module.exports={runtimeConfig};
