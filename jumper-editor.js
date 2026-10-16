const jumperLicenseLabels={0:'None',1:'AFF',2:'A',3:'B',4:'C',5:'D'};
function jumperLicenseText(value){return value===null || value===undefined || value===''?'—':jumperLicenseLabels[Number(value)] ?? `Unknown (${value})`;}
function parseJumperLicense(value,original){
  if(String(value).trim()==='' || !Number.isInteger(Number(value)))throw new Error('Select a license.');
  const number=Number(value);
  if(!Object.prototype.hasOwnProperty.call(jumperLicenseLabels,number) && number!==Number(original))throw new Error('Select a valid license.');
  return number;
}
const jumperIdentityFields=new Set(['name','surname','uid','key']);
function parseJumperEditValue(original,input){
  if(typeof original==='boolean')return Boolean(input);
  if(typeof original==='number'){
    if(String(input).trim()==='' || !Number.isFinite(Number(input)))throw new Error('Enter a valid number.');
    if(Number.isInteger(original) && !Number.isInteger(Number(input)))throw new Error("Enter a whole number.");
    return Number(input);
  }
  if(original!==null && typeof original==='object'){
    let value;try{value=JSON.parse(input);}catch{throw new Error('Enter valid JSON.');}
    if(value===null || typeof value!=='object' || Array.isArray(value)!==Array.isArray(original))throw new Error(Array.isArray(original)?'Enter a JSON list, e.g. ["T", "V"].':'Enter a JSON object.');
    return value;
  }
  return original===null && input===''?null:String(input);
}
function buildJumperEditPatch(original,fresh,changes,byName){
  const uid=String(original.Uid??original.uid??'').trim();
  if(!uid || String(original.key)!==uid)throw new Error('Jumper UID does not match the record key. Reload the data.');
  if(!fresh || String(fresh.Uid??fresh.uid??'')!==uid || fresh.Name!==original.Name || fresh.Surname!==original.Surname)throw new Error('Jumper identity changed. Reload the data.');
  const records=Object.entries(byName||{}).filter(([,v])=>v && typeof v==='object');
  let matches=records.filter(([,v])=>String(v.Uid??v.uid??'')===uid);
  if(!matches.length){
    const canonical=`${String(original.Name??'').replace(/ /g,'_')}_${String(original.Surname??'').replace(/ /g,'-')}`;
    matches=records.filter(([key,v])=>key===canonical && v.Name===original.Name && v.Surname===original.Surname && v.Uid==null && v.uid==null);
  }
  if(matches.length!==1)throw new Error('Could not identify one matching jumpers_by_name record. No changes saved.');
  const [nameKey,nameRecord]=matches[0];
  if(nameRecord.Name!==fresh.Name || nameRecord.Surname!==fresh.Surname)throw new Error('The two jumper records have different names. No changes saved.');
  const patch={};
  for(const [field,value] of Object.entries(changes)){
    if(jumperIdentityFields.has(field.toLowerCase()))throw new Error('Name, surname and UID cannot be edited.');
    if(!Object.prototype.hasOwnProperty.call(original,field))throw new Error('Unknown field. Reload the data.');
    if(JSON.stringify(value)===JSON.stringify(original[field]))continue;
    if(JSON.stringify(fresh[field])!==JSON.stringify(original[field]))throw new Error(`${field} was changed on the server. Reload before editing.`);
    patch[`jumpers/${uid}/${field}`]=value;
    patch[`jumpers_by_name/${nameKey}/${field}`]=value;
  }
  return patch;
}

function addJumperEditButton(j){
  if(!SkyKefAdminAuth.isDeveloper())return;
  const actions=document.createElement('div');actions.className='jumper-edit-actions';
  const button=document.createElement('button');button.type='button';button.className='small-btn';button.textContent='Edit Jumper Details';
  button.disabled=document.documentElement.classList.contains('manifest-view-only');
  button.title=button.disabled?'Editing is disabled while a jumping day is running':'';
  const status=document.createElement('span');status.className='jumper-edit-status';status.setAttribute('role','status');
  button.onclick=async()=>{
    button.disabled=true;status.textContent='Checking day status…';
    try{
      if(!SkyKefAdminAuth.isDeveloper())throw new Error('DEV login required.');
      if((await SkyKefAdminAuth.getDayState()).active)throw new Error('Editing is disabled while a jumping day is running.');
      if(selectedKey!==j.key)return;
      renderJumperEditor(j);
    }catch(error){status.textContent=error.message;button.disabled=false;}
  };
  actions.append(button,status);detailsEl.appendChild(actions);
}
function renderJumperEditor(j){
  detailsEl.replaceChildren();
  const heading=document.createElement('div');heading.className='detail-title';heading.textContent=`Edit ${displayName(j)}`;detailsEl.appendChild(heading);
  const form=document.createElement('form');form.className='jumper-edit-form';
  const grid=document.createElement('div');grid.className='data-grid';
  const inputs=new Map();
  let affLevelLabel=null;
  for(const [field,value] of Object.entries(j)){
    if(field==='key' || ['numberofjumpestoday','numberofjumpstoday'].includes(field.toLowerCase()))continue;
    const label=document.createElement('label');label.className='data-item';
    const title=document.createElement('span');title.className='data-key';title.textContent=field;
    let input;
    if(field.toLowerCase()==='license'){
      input=document.createElement('select');
      for(const [code,name] of Object.entries(jumperLicenseLabels)){
        const option=document.createElement('option');option.value=code;option.textContent=name;input.appendChild(option);
      }
      if(value!==null && value!=='' && !Object.prototype.hasOwnProperty.call(jumperLicenseLabels,Number(value))){
        const option=document.createElement('option');option.value=String(value);option.textContent=jumperLicenseText(value);input.appendChild(option);
      }
      input.value=value===null || value===''?'0':String(value);
    }else if(value!==null && typeof value==='object'){
      input=document.createElement('textarea');input.rows=4;input.value=JSON.stringify(value,null,2);
    }else{
      input=document.createElement('input');input.type=typeof value==='boolean'?'checkbox':typeof value==='number'?'number':'text';
      if(input.type==='checkbox')input.checked=value;
      else{input.value=value??'';if(input.type==='number')input.step=Number.isInteger(value)?'1':'any';}
    }
    input.className='jumper-edit-input';input.disabled=jumperIdentityFields.has(field.toLowerCase());
    label.append(title,input);
    if(value!==null && typeof value==='object'){const hint=document.createElement('small');hint.textContent=Array.isArray(value)?'JSON list, e.g. ["T", "V"]. Use [] to clear.':'JSON object';label.appendChild(hint);}
    if(field.toLowerCase()==="afflevel")affLevelLabel=label;
    grid.appendChild(label);if(!input.disabled)inputs.set(field,input);
  }
  const licenseEntry=[...inputs].find(([field])=>field.toLowerCase()==='license');
  function updateAffLevelVisibility(){if(affLevelLabel)affLevelLabel.hidden=Number(licenseEntry?.[1].value ?? j.License)!==1;}
  if(licenseEntry)licenseEntry[1].addEventListener('change',updateAffLevelVisibility);
  updateAffLevelVisibility();
  const actions=document.createElement('div');actions.className='jumper-edit-actions';
  const save=document.createElement('button');save.type='submit';save.className='small-btn';save.textContent='Save Changes';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='small-btn';cancel.textContent='Cancel';cancel.onclick=()=>renderDetails(j);
  const status=document.createElement('div');status.className='jumper-edit-status';status.setAttribute('role','status');
  actions.append(save,cancel);form.append(grid,actions,status);detailsEl.appendChild(form);
  form.onsubmit=async event=>{
    event.preventDefault();save.disabled=true;cancel.disabled=true;listEl.inert=true;reloadBtn.disabled=true;status.textContent='Saving…';
    try{
      if(!SkyKefAdminAuth.isDeveloper())throw new Error('DEV login required.');
      const changes={};
      for(const [field,input] of inputs){try{changes[field]=field.toLowerCase()==='license'?parseJumperLicense(input.value,j[field]):parseJumperEditValue(j[field],input.type==='checkbox'?input.checked:input.value);}catch(error){throw new Error(`${field}: ${error.message}`);}}
      const [state,fresh,byName]=await Promise.all([SkyKefAdminAuth.getDayState(),fetchDb(`jumpers/${encodeURIComponent(String(j.Uid??j.uid))}`),fetchDb('jumpers_by_name')]);
      if(state.active)throw new Error('Editing is disabled while a jumping day is running.');
      const patch=buildJumperEditPatch(j,fresh,changes,byName);
      if(!Object.keys(patch).length){status.textContent='No changes to save.';return;}
      if(!SkyKefAdminAuth.isDeveloper())throw new Error('DEV login required.');
      // One Firebase multi-location update: both indexes succeed or fail together.
      const response=await fetch(`${DB}/.json`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
      if(!response.ok)throw new Error(`Could not save changes (HTTP ${response.status}).`);
      const savedFields=Object.fromEntries(Object.entries(changes).filter(([field])=>Object.prototype.hasOwnProperty.call(patch,`jumpers/${j.Uid??j.uid}/${field}`)));
      const updated={...fresh,...savedFields,key:j.key};
      jumpers=jumpers.map(record=>record.key===j.key?updated:record);
      if(selectedKey===j.key){selectedJumper=updated;renderList();renderDetails(updated);const success=document.createElement('div');success.className='jumper-edit-status saved';success.setAttribute('role','status');success.textContent='Changes saved to both jumper records.';detailsEl.appendChild(success);}
    }catch(error){console.error(error);status.textContent=error.message;}
    finally{save.disabled=false;cancel.disabled=false;listEl.inert=false;reloadBtn.disabled=false;}
  };
}
