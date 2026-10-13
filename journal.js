// Encrypted journal vault: the passcode and decrypted entries never go to storage.
(() => {
  const $ = id => document.getElementById(id);
  const old = $('journal');
  old.closest('article').innerHTML = '<h3>Your private space</h3><p>Write a little, feel a little lighter.</p><button class="primary" id="openJournal">Open journal</button>';
  document.querySelector('.tabs').insertAdjacentHTML('beforeend','<button class="tab" data-tab="journalPanel">Journal</button>');
  document.querySelector('.app-shell').insertAdjacentHTML('beforeend', `
    <section class="panel" id="journalPanel">
      <div class="card" id="journalGate"><h2>Private journal</h2><p id="gateHint"></p>
        <form id="unlockForm"><label for="passcode">Passcode</label><input id="passcode" type="password" minlength="6" required autocomplete="off">
        <label id="confirmLabel" for="confirmPass">Confirm passcode</label><input id="confirmPass" type="password" autocomplete="off">
        <button class="primary" id="unlockButton">Unlock</button><p role="status" id="gateMessage"></p></form>
        <p class="save-note">Stored only in this browser. Remember your passcode: there is no recovery.</p></div>
      <div id="journalVault" hidden><div class="section-heading"><h2>Your journal</h2><button class="ghost-btn" id="lockJournal">Lock</button></div>
        <div class="tabs"><button class="ghost-btn" id="entriesTab">Entries</button><button class="ghost-btn" id="historyTab">Mood History</button></div>
        <div id="entriesView"><form class="card" id="entryForm"><label for="entryText">What's on your mind?</label><textarea id="entryText" required placeholder="Write freely…"></textarea><button class="primary">Save entry</button><p role="status" id="entryMessage"></p></form><div id="entryList"></div></div>
        <div id="historyView" hidden><p class="save-note">Mood changes and the reasons you shared, newest first.</p><div id="historyList"></div></div>
      </div></section>`);
  let key = null, data = null, queue = Promise.resolve();
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = bytes => btoa(String.fromCharCode(...bytes));
  const bytes = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
  async function derive(pass,salt) {
    const base = await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function persist() {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const blob = JSON.parse(localStorage.getItem('journalVault') || '{}');
    const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(data)));
    localStorage.setItem('journalVault',JSON.stringify({...blob,iv:b64(iv),cipher:b64(new Uint8Array(cipher))}));
  }
  function gate() {
    const setup = !localStorage.getItem('journalVault');
    $('gateHint').textContent = setup ? 'Choose your passcode on this first visit (at least 6 characters).' : 'Enter your saved passcode.';
    $('confirmLabel').hidden = $('confirmPass').hidden = !setup;
    $('confirmPass').required = setup;
    $('unlockButton').textContent = setup ? 'Set passcode' : 'Unlock';
  }
  const textNode = (tag,text) => {const el=document.createElement(tag);el.textContent=text;return el;};
  function renderList(id,items,history=false) {
    $(id).replaceChildren();
    if(!items.length) $(id).append(textNode('p','Nothing here yet.'));
    [...items].reverse().forEach(item=>{
      const card=document.createElement('article');card.className='card journal-record';
      card.append(textNode('h3',history?item.label:item.mood),textNode('p',new Date(item.at).toLocaleString()),textNode('p',history?(item.note||'No reason added.'):item.text));
      $(id).append(card);
    });
  }
  function render() {renderList('entryList',data.entries);renderList('historyList',JSON.parse(localStorage.getItem('moodHistory')||'[]'),true);}
  $('unlockForm').onsubmit=async e=>{
    e.preventDefault();$('gateMessage').textContent='Opening…';$('unlockButton').disabled=true;
    try {
      const existing=JSON.parse(localStorage.getItem('journalVault')||'null');
      if(!existing && $('passcode').value!==$('confirmPass').value) throw Error('Passcodes do not match.');
      const salt=existing?bytes(existing.salt):crypto.getRandomValues(new Uint8Array(16));
      const candidate=await derive($('passcode').value,salt);
      const opened=existing?JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(existing.iv)},candidate,bytes(existing.cipher)))):{entries:[],history:[]};
      key=candidate;data=opened;
      if(!existing) {
        localStorage.setItem('journalVault',JSON.stringify({salt:b64(salt)}));
        const legacy=JSON.parse(localStorage.getItem('journal')||'""');
        if(legacy)data.entries.push({at:new Date().toISOString(),mood:'Imported note',text:legacy});
        await persist();localStorage.removeItem('journal');
      }
      $('unlockForm').reset();$('gateMessage').textContent='';$('journalGate').hidden=true;$('journalVault').hidden=false;render();
    } catch(err) {$('gateMessage').textContent=err.message==='Passcodes do not match.'?err.message:'Could not unlock. Check your passcode and try again.';key=null;data=null;}
    finally{$('unlockButton').disabled=false;}
  };
  $('entryForm').onsubmit=e=>{
    e.preventDefault();const value=$('entryText').value.trim();if(!value)return;
    queue=queue.then(async()=>{data.entries.push({at:new Date().toISOString(),mood:$('moodTitle').textContent,text:value});await persist();$('entryText').value='';render();$('entryMessage').textContent='Saved.';}).catch(()=>$('entryMessage').textContent='Could not save. Please keep your text and try again.');
  };
  $('lockJournal').onclick=async()=>{await queue;key=null;data=null;$('entryList').replaceChildren();$('historyList').replaceChildren();$('entryText').value='';$('journalVault').hidden=true;$('journalGate').hidden=false;gate();};
  $('entriesTab').onclick=()=>{$('entriesView').hidden=false;$('historyView').hidden=true;};
  $('historyTab').onclick=()=>{$('entriesView').hidden=true;$('historyView').hidden=false;};
  $('openJournal').onclick=()=>document.querySelector('[data-tab="journalPanel"]').click();
  // Mood history works while locked; mood reasons are already visible on Home.
  const historyKey='moodHistory';
  $('moodForm').addEventListener('submit',e=>{
    if(e.submitter?.value!=='save')return;
    const history=JSON.parse(localStorage.getItem(historyKey)||'[]');
    history.push({at:new Date().toISOString(),label:document.querySelector('.mood-choice.selected')?.textContent.trim()||$('moodTitle').textContent,note:$('moodNote').value.trim()});
    localStorage.setItem(historyKey,JSON.stringify(history));
    if(data){renderList('historyList',history,true);}
  });
  $('historyTab').addEventListener('click',()=>renderList('historyList',JSON.parse(localStorage.getItem(historyKey)||'[]'),true));
  gate();
})();
