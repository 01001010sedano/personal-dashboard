// Character stills from Pixar's Inside Out 2 character profiles.
const characterBase='https://images.squarespace-cdn.com/content/v1/60241cb68df65b530cd84d95/';
const characterImages={
 joy:'aa141bea-dfdc-4fdd-91eb-c6a412df7683/i075_40uQ_4k.pub16.3601.jpg',
 anxiety:'5c1e360e-7f30-4cf2-ad92-cd0f99422e6b/i250_140a_cs.sel16.3361.jpg',
 anger:'64f23941-9e43-4e45-a225-5611ae1ff0e1/i170_55a.sel1616.126.jpg',
 sadness:'ed9515bb-dd3b-4d92-a6f9-ac1563e4c829/i110_19e_pub.pub16.1372.jpg',
 fear:'d7bf3766-644e-4bcd-b18c-73aaefcedc8d/i010_213m_cs.sel16.1035.jpg',
 disgust:'a82d1e99-0927-41bd-be3e-b58d34b13903/i010_217a_cs.sel16.1329.jpg',
 ennui:'c00f3047-1655-434a-8900-1262dcd9b861/i345_17.cs.sel16.219.jpg',
 envy:'8c1968f7-bbcf-428f-a2fd-823d677109aa/i170_42.sel1616.155.jpg',
 embarrassment:'80aa8aa1-5b14-493d-9726-d55564861196/i170_152.sel1616.331.jpg'
};
function characterPortrait(key){
 const img=document.createElement('img');img.src=characterBase+characterImages[key]+'?format=500w';img.alt=key[0].toUpperCase()+key.slice(1);img.className='character-portrait';
 img.onerror=()=>{img.replaceWith(document.createTextNode(img.alt));};
 return img;
}
new MutationObserver(()=>{
 const orb=document.getElementById('moodOrb');
 if(!orb.querySelector('img') && characterImages[document.body.dataset.mood])orb.replaceChildren(characterPortrait(document.body.dataset.mood));
}).observe(document.getElementById('moodOrb'),{childList:true});
new MutationObserver(()=>{
 document.querySelectorAll('.mood-choice:not([data-portrait])').forEach(button=>{
  const key=button.dataset.moodChoice;button.dataset.portrait='true';button.replaceChildren(characterPortrait(key),document.createTextNode(key[0].toUpperCase()+key.slice(1)));
 });
}).observe(document.getElementById('moodChoices'),{childList:true});
document.querySelector('.app-shell').insertAdjacentHTML('beforeend','<p class="save-note">Character images © Disney/Pixar · <a href="https://www.pixar.com/inside-out-2" target="_blank" rel="noopener">Pixar character profiles</a></p>');
