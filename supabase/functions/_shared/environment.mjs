// Prefer current Supabase server credentials; legacy JWT keys may be disabled on the project.
export function serviceKey(env){
 const configured=env('SUPABASE_SECRET_KEYS');
 if(configured){try{const keys=JSON.parse(configured);const values=Array.isArray(keys)?keys:Object.values(keys);const key=typeof keys.default==='string'&&keys.default.startsWith('sb_secret_')?keys.default:values.find(v=>typeof v==='string'&&v.startsWith('sb_secret_'));if(key)return key;}catch{throw Error('Server credential configuration could not be read.');}}
 const legacy=env('SUPABASE_SERVICE_ROLE_KEY');if(!legacy)throw Error('Server credentials are unavailable.');return legacy;
}
