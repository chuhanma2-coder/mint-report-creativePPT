import fs from 'node:fs';
import path from 'node:path';
import {createTaskCard} from './lib/team-task.mjs';
const [inputArg,outputArg]=process.argv.slice(2);
if(!outputArg) throw new Error('Usage: create-task-card.mjs INPUT.json NEW_report.creative-task.json');
const output=path.resolve(outputArg);if(fs.existsSync(output)) throw new Error(`OUTPUT_EXISTS: ${output}`);
const card=createTaskCard(JSON.parse(fs.readFileSync(path.resolve(inputArg),'utf8')));
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(card,null,2)+'\n');
console.log(JSON.stringify({status:'pass',file:output,chapters:card.chapters.map(({order,title,owner})=>({order,title,owner}))}));
