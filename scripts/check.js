const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const file of ['app.js','mobile.js','server.js','deck.js','game.js','deal-animation.js','avatars.js','runtime-config.js']){
 const result=spawnSync(process.execPath,['--check',path.join(__dirname,'..',file)],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
console.log('Sintaxis verificada.');
