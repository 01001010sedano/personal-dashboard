(() => {
  const panel=document.querySelector('#music');
  panel.innerHTML=`<article class="card music-card"><p class="eyebrow">YOUR SOUNDTRACK</p><h2>Music</h2><p id="spotifyStatus" role="status">Connect your Spotify to see what’s playing.</p><div id="nowPlaying"></div><div class="dialog-actions"><button class="primary" id="spotifyConnect">Connect Spotify</button><button class="ghost-btn" id="spotifyRefresh" hidden>Refresh</button><button class="ghost-btn" id="spotifyDisconnect" hidden>Disconnect</button></div></article>`;
  const status=document.querySelector('#spotifyStatus'), player=document.querySelector('#nowPlaying');
  const connect=document.querySelector('#spotifyConnect'), refresh=document.querySelector('#spotifyRefresh'), disconnect=document.querySelector('#spotifyDisconnect');
  const config=window.SPOTIFY_CONFIG;
  let token=JSON.parse(sessionStorage.getItem('spotifyToken')||'null'), timer, busy=false, backoff=0;
  const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  function saveToken(value){token=value;sessionStorage.setItem('spotifyToken',JSON.stringify(value));}
  function connected(){connect.hidden=!!token;refresh.hidden=disconnect.hidden=!token;}
  async function tokenRequest(params){
    const response=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});
    const result=await response.json();
    if(!response.ok)throw Error(result.error_description||'Spotify login expired. Please reconnect.');
    saveToken({access:result.access_token,refresh:result.refresh_token||token?.refresh,expires:Date.now()+result.expires_in*1000});
  }
  connect.onclick=async()=>{
    connect.disabled=true;
    try{
      const verifier=base64url(crypto.getRandomValues(new Uint8Array(64)));
      const state=base64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      sessionStorage.setItem('spotifyAuth',JSON.stringify({verifier,state,at:Date.now()}));
      const query=new URLSearchParams({client_id:config.clientId,response_type:'code',redirect_uri:config.redirectUri,scope:'user-read-currently-playing',state,code_challenge_method:'S256',code_challenge:challenge});
      window.location.assign('https://accounts.spotify.com/authorize?'+query);
    }catch{status.textContent='Could not start Spotify login. Please try again.';connect.disabled=false;}
  };
  disconnect.onclick=()=>{clearTimeout(timer);sessionStorage.removeItem('spotifyToken');token=null;player.replaceChildren();status.textContent='Disconnected from this dashboard.';connected();};
  function showTrack(playback){
    player.replaceChildren();
    if(!playback?.item){status.textContent='Nothing playing right now. Play a song in Spotify.';return;}
    const track=playback.item;status.textContent=playback.is_playing?'Now playing · updates every 15 seconds':'Paused';
    const row=document.createElement('div');row.className='spotify-track';
    const art=track.album?.images?.[0]?.url||track.images?.[0]?.url;
    if(art){const image=document.createElement('img');image.src=art;image.alt='Album artwork';row.append(image);}
    const detail=document.createElement('div'), title=document.createElement('h3'), artist=document.createElement('p');
    title.textContent=track.name;artist.textContent=track.artists?.map(a=>a.name).join(', ')||track.show?.publisher||'';
    detail.append(title,artist);
    const progress=document.createElement('progress');progress.max=track.duration_ms||1;progress.value=playback.progress_ms||0;progress.setAttribute('aria-label','Track progress');detail.append(progress);
    if(track.external_urls?.spotify){const link=document.createElement('a');link.href=track.external_urls.spotify;link.target='_blank';link.rel='noopener';link.textContent='Open in Spotify';detail.append(link);}
    row.append(detail);player.append(row);
  }
  async function update(){
    clearTimeout(timer);
    if(!token||busy)return;
    if(document.hidden||!panel.classList.contains('active-panel')){timer=setTimeout(update,15000);return;}
    if(Date.now()<backoff){timer=setTimeout(update,backoff-Date.now());return;}
    busy=true;
    try{
      if(Date.now()>token.expires-60000)await tokenRequest({grant_type:'refresh_token',refresh_token:token.refresh,client_id:config.clientId});
      const response=await fetch('https://api.spotify.com/v1/me/player/currently-playing',{headers:{Authorization:'Bearer '+token.access}});
      if(response.status===429){backoff=Date.now()+Math.max(15,Number(response.headers.get('Retry-After'))||30)*1000;throw Error('Spotify is busy. Waiting before retrying.');}
      if(response.status===401){token.expires=0;throw Error('Refreshing Spotify session…');}
      if(response.status===403)throw Error('Spotify denied access. Check Premium and add your account under the app’s User Management.');
      if(!response.ok)throw Error('Could not load Spotify. Please try again.');
      showTrack(response.status===204?null:await response.json());
    }catch(error){status.textContent=error.message;}
    finally{busy=false;if(token)timer=setTimeout(update,Math.max(15000,backoff-Date.now()));}
  }
  refresh.onclick=update;
  document.querySelector('[data-tab="music"]').addEventListener('click',update);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  async function initialize(){
    const url=new URL(location.href), code=url.searchParams.get('code'), error=url.searchParams.get('error');
    if(code||error){
      const state=url.searchParams.get('state');
      const auth=JSON.parse(sessionStorage.getItem('spotifyAuth')||'null');
      ['code','state','error','error_description'].forEach(k=>url.searchParams.delete(k));
      history.replaceState(null,'',url.pathname+url.search+url.hash);
      sessionStorage.removeItem('spotifyAuth');
      document.querySelector('[data-tab="music"]').click();
      try{
        if(error)throw Error('Spotify permission was cancelled. You can reconnect anytime.');
        if(!auth||state!==auth.state||Date.now()-auth.at>600000)throw Error('Login expired. Please click Connect Spotify again.');
        status.textContent='Connecting…';
        await tokenRequest({grant_type:'authorization_code',code,redirect_uri:config.redirectUri,client_id:config.clientId,code_verifier:auth.verifier});
      }catch(e){status.textContent=e.message;connected();return;}
    }
    connected();if(token)update();
  }
  initialize();
})();
