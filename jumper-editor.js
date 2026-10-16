const jumperLicenseLabels={0:'None',1:'AFF',2:'A',3:'B',4:'C',5:'D'};
function jumperLicenseText(value){return value===null || value===undefined || value===''?'—':jumperLicenseLabels[Number(value)] ?? `Unknown (${value})`;}
function parseJumperLicense(value,original){
  if(String(value).trim()==='' || !Number.isInteger(Number(value)))throw new Error('Select a license.');
  const number=Number(value);
  if(!Object.prototype.hasOwnProperty.call(jumperLicenseLabels,number) && number!==Number(original))throw new Error('Select a valid license.');
  return number;
}
const jumperIntFields=new Set(['balance','weight','afflevel','numberofjumpestoday','numberofjumpstoday']);
const jumperWorkerRoles=new Set(['V','VS','S','AFF','T','TF','TFF','TFFF','TH','TFH','TFFH','TFFFF','TFFFFH','OTHER']);
function jumperDateParts(value){
  const text=String(value??'').trim();
  let match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/),year,month,day;
  if(match){year=Number(match[1]);month=Number(match[2]);day=Number(match[3]);}
  else{match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!match)throw new Error('Choose a valid date.');day=Number(match[1]);month=Number(match[2]);year=Number(match[3]);}
  const leap=year%4===0 && (year%100!==0 || year%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1 || year>9999 || month<1 || month>12 || day<1 || day>days[month-1])throw new Error('Choose a real calendar date.');
  return {year,month,day};
}
function jumperDateInput(value){try{const {year,month,day}=jumperDateParts(value);return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}catch{return '';}}
function validateJumperField(field,value){
  const key=field.toLowerCase();
  if(jumperIntFields.has(key)){
    if(typeof value!=='number' || !Number.isInteger(value) || value< -2147483648 || value>2147483647)throw new Error('Enter a whole number within the supported range.');
    if(key!=='balance' && value<0)throw new Error('Enter zero or a positive whole number.');
  }else if(key==='license'){
    if(typeof value!=='number' || !Number.isInteger(value) || value<0 || value>5)throw new Error('Select a valid license.');
  }else if(/date$/i.test(field)){
    if(typeof value!=='string')throw new Error('Choose a valid date.');jumperDateParts(value);
  }else if(key==='isrental'){
    if(typeof value!=='boolean')throw new Error('Use the checkbox.');
  }else if(key==='worker'){
    if(!Array.isArray(value) || value.some(role=>typeof role!=='string' || !jumperWorkerRoles.has(role)) || new Set(value).size!==value.length)throw new Error('Worker must be a list of valid, unique roles: '+[...jumperWorkerRoles].join(', '));
  }else if(['id','phone','emergency'].includes(key)){
    if(typeof value!=='string' || /[\u0000-\u001f\u007f]/.test(value))throw new Error('Enter plain text without control characters.');
  }
  return value;
}
function parseJumperField(field,original,input){
  const key=field.toLowerCase();let value;
  if(key==='license')value=parseJumperLicense(input,original);
  else if(jumperIntFields.has(key)){
    if(!/^-?\d+$/.test(String(input).trim()))throw new Error('Enter a whole number using digits only.');
    value=Number(input);
  }else if(/date$/i.test(field)){
    const {year,month,day}=jumperDateParts(input);value=`${day}/${month}/${String(year).padStart(4,'0')}`;
  }else value=parseJumperEditValue(original,input);
  return validateJumperField(field,value);
}

const jumperIdentityFields=new Set(['name','surname','uid','key']);
const jumperReadOnlyFields=new Set([...jumperIdentityFields,'worker','workers']);
function parseJumperEditValue(original,input){
  if(typeof original==='boolean'){if(typeof input!=='boolean')throw new Error('Use the checkbox.');return input;}
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
    if(['worker','workers'].includes(field.toLowerCase()))throw new Error('Worker is read only.');
    if(jumperIdentityFields.has(field.toLowerCase()))throw new Error('Name, surname and UID cannot be edited.');
    if(!Object.prototype.hasOwnProperty.call(original,field))throw new Error('Unknown field. Reload the data.');
    if(JSON.stringify(value)===JSON.stringify(original[field]))continue;
    try{validateJumperField(field,value);}catch(error){throw new Error(`${field}: ${error.message}`);}
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
  const identityRow=document.createElement('div');identityRow.className='jumper-edit-identity';grid.appendChild(identityRow);
  const inputs=new Map();
  const initialInputs=new Map();
  let affLevelLabel=null;
  const order=['name','surname','uid','id','balance','phone','emergency','license','afflevel','isrental','reservedate'];
  const pairRows=new Map();
  const fields=Object.entries(j).sort(([a],[b])=>{
    const ai=order.indexOf(a.toLowerCase()),bi=order.indexOf(b.toLowerCase());
    return (ai<0?99:ai)-(bi<0?99:bi);
  });
  for(const [field,value] of fields){
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
    }else if(/date$/i.test(field)){
      input=document.createElement('input');input.type='date';input.min='0001-01-01';input.max='9999-12-31';input.value=jumperDateInput(value);
    }else if(value!==null && typeof value==='object'){
      input=document.createElement('textarea');input.rows=4;input.value=JSON.stringify(value,null,2);
    }else{
      input=document.createElement('input');input.type=field.toLowerCase()==='isrental' || typeof value==='boolean'?'checkbox':jumperIntFields.has(field.toLowerCase()) || typeof value==='number'?'number':'text';
      if(input.type==='checkbox')input.checked=value;
      else{input.value=value??'';if(input.type==='number'){input.step=jumperIntFields.has(field.toLowerCase()) || Number.isInteger(value)?'1':'any';input.min=field.toLowerCase()==='balance'?'-2147483648':'0';input.max='2147483647';}}
    }
    input.className='jumper-edit-input';input.disabled=jumperReadOnlyFields.has(field.toLowerCase());
    label.appendChild(title);
    if(input.type==='date'){
      const dateControl=document.createElement('div');dateControl.className='jumper-edit-date-control';
      const picker=document.createElement('button');picker.type='button';picker.className='small-btn jumper-date-picker';
      picker.setAttribute('aria-label',`Choose ${field} date`);picker.title='Choose date';
      picker.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></svg>';
      const openPicker=()=>{if(input.disabled)return;try{if(typeof input.showPicker==='function')input.showPicker();else input.focus();}catch{input.focus();}};
      picker.onclick=event=>{event.preventDefault();openPicker();};input.addEventListener('click',openPicker);
      dateControl.append(input,picker);label.appendChild(dateControl);
    }else label.appendChild(input);
    if(!input.disabled && value!==null && typeof value==='object'){const hint=document.createElement('small');hint.textContent=Array.isArray(value)?'JSON list, e.g. ["T", "V"]. Use [] to clear.':'JSON object';label.appendChild(hint);}
    if(field.toLowerCase()==="afflevel")affLevelLabel=label;
    if(['name','surname','uid','id'].includes(field.toLowerCase()))identityRow.appendChild(label);
    else{
      const key=field.toLowerCase();
      const group=['phone','emergency'].includes(key)?'contact':['license','afflevel'].includes(key)?'license':['isrental','reservedate'].includes(key)?'rental':null;
      if(group){
        if(!pairRows.has(group)){const row=document.createElement('div');row.className=`jumper-edit-pair jumper-edit-${group}-row`;pairRows.set(group,row);grid.appendChild(row);}
        pairRows.get(group).appendChild(label);
      }else{if(key==='balance')label.className+=' jumper-edit-balance';grid.appendChild(label);}
    }
    if(!input.disabled){inputs.set(field,input);initialInputs.set(field,input.type==='checkbox'?input.checked:input.value);}
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
      for(const [field,input] of inputs){
        const raw=input.type==='checkbox'?input.checked:input.value;
        if(raw===initialInputs.get(field))continue;
        try{changes[field]=parseJumperField(field,j[field],raw);}catch(error){input.setAttribute('aria-invalid','true');input.focus();throw new Error(`${field}: ${error.message}`);}
        input.removeAttribute('aria-invalid');
      }
      for(const input of inputs.values())input.disabled=true;
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
    finally{for(const input of inputs.values())input.disabled=false;save.disabled=false;cancel.disabled=false;listEl.inert=false;reloadBtn.disabled=false;}
  };
}
