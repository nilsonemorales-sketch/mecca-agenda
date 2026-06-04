#!/usr/bin/env node
// migrate-fotos.js
// Migrates photos from Supabase Storage to Google Drive.
// Usage: DRIVE_URL=https://script.google.com/macros/s/.../exec node migrate-fotos.js

const SB  = 'https://qeurcozssghkqgezilfj.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldXJjb3pzc2doa3FnZXppbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODIzMjcsImV4cCI6MjA5NTU1ODMyN30.y8ToEt8YvvbZYL5jei1dmjFRAcANeaNBKo-xHC7UKCA';
const DRIVE_URL = process.env.DRIVE_URL || '';

if (!DRIVE_URL) {
  console.error('ERROR: Set DRIVE_URL env var to your Apps Script /exec URL');
  console.error('  Example: DRIVE_URL="https://script.google.com/macros/s/.../exec" node migrate-fotos.js');
  process.exit(1);
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function sb(path, opts={}){
  const r=await fetch(SB+'/rest/v1/'+path,{
    headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Prefer':opts.prefer||'return=representation',...(opts.headers||{})},
    ...opts
  });
  if(!r.ok) throw new Error(await r.text());
  const t=await r.text(); return t?JSON.parse(t):[];
}

async function downloadAsBase64(url){
  const r=await fetch(url);
  if(!r.ok) throw new Error('HTTP '+r.status+' downloading: '+url);
  const buf=await r.arrayBuffer();
  const b64=Buffer.from(buf).toString('base64');
  const mime=r.headers.get('content-type')||'image/jpeg';
  return 'data:'+mime+';base64,'+b64;
}

async function uploadToDrive(dataUrl, fileName, folder, actId){
  const resp=await fetch(DRIVE_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain'},
    body:JSON.stringify({image:dataUrl,fileName,folder,actId})
  });
  const json=await resp.json();
  if(!json.success) throw new Error(json.error||'Drive upload failed');
  return json.thumbUrl||json.url;
}

async function main(){
  console.log('Fetching activities with fotos from Supabase...');
  const acts=await sb('obra_actividades?fotos=not.is.null&fotos=neq.&select=id,fotos,area&order=id');
  const withFotos=acts.filter(a=>a.fotos&&a.fotos.trim());
  console.log(`Found ${withFotos.length} activities with fotos\n`);

  let migrated=0, already=0, errors=0;

  for(const act of withFotos){
    const entries=(act.fotos||'').split('||').filter(Boolean);
    const supabaseEntries=entries.filter(e=>e.includes('supabase.co'));
    if(!supabaseEntries.length){
      already+=entries.length;
      continue;
    }

    console.log(`Activity ${act.id} (${act.area||'Sin area'}): ${supabaseEntries.length} foto(s) to migrate`);
    const newEntries=[];
    let changed=false;

    for(const entry of entries){
      const [url, byName]=(entry+'::').split('::');
      if(!url.includes('supabase.co')){
        newEntries.push(entry);
        already++;
        continue;
      }
      try{
        process.stdout.write('  Downloading '+url.slice(-50)+'... ');
        const dataUrl=await downloadAsBase64(url);
        process.stdout.write('OK. Uploading to Drive... ');
        const folder=act.area||'Sin ubicacion';
        const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
        const driveUrl=await uploadToDrive(dataUrl,'foto_'+ts+'.jpg',folder,act.id);
        const newEntry=driveUrl+(byName?'::'+byName:'');
        newEntries.push(newEntry);
        changed=true;
        migrated++;
        console.log('✓');
        await sleep(1500);
      }catch(e){
        console.log('✗ ERROR: '+e.message);
        newEntries.push(entry);
        errors++;
      }
    }

    if(changed){
      await sb('obra_actividades?id=eq.'+act.id,{
        method:'PATCH',
        prefer:'return=minimal',
        body:JSON.stringify({fotos:newEntries.join('||')})
      });
      console.log(`  → Record updated\n`);
    }
  }

  console.log('─'.repeat(50));
  console.log(`Done.  Migrated: ${migrated}  Already in Drive: ${already}  Errors: ${errors}`);
  if(errors>0) console.log('Photos with errors kept their original Supabase URL — re-run to retry.');
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1);});
