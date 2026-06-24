(function(){
  var QKEY='doWallet.quarantine.v1';
  var PKEY='doWallet.quarantinePending.v1';
  var AKEY='doWallet.allowlist.v1';
  var UKEY='doWallet.userApprovals.v1';
  var SKEY='doWalletQuarantineV1';
  var RURL='/static/approved-assets/top-500-coingecko-20260519.json?v=20260519a';
  var registry=null;
  var defaultAllow=['do','btc','eth','bnb','sol','lunc','luna','scrt','dgn','idtc','krtc','ordi','matic','osmo','akt','udo','uluna','uscrt','udgn'];
  var defaultChains=['dochain-1','bitcoin-mainnet','ethereum-mainnet','bnb-smart-chain-mainnet','solana-mainnet','polygon-mainnet','optimism-mainnet','base-mainnet','avalanche-c-chain','arbitrum-one','tron-mainnet','xrp-ledger-mainnet','cardano-mainnet','columbus-5','phoenix-1','secret-4','dungeon-1'];
  function norm(v){return String(v||'').trim().toLowerCase();}
  function esc(v){return String(v||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
  function read(k,fallback){try{var v=JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback||[]));return Array.isArray(v)||typeof v==='object'?v:fallback}catch(e){return fallback||[]}}
  function write(k,v){localStorage.setItem(k,JSON.stringify(v));}
  function unique(a){var m={}; (a||[]).forEach(function(x){x=norm(x); if(x)m[x]=1;}); return Object.keys(m);}
  function safeObj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
  function walletKey(){
    var user=safeObj(read('user',{})), bridge=safeObj(read('do-wallet-bridge-wallet',{})), bw=safeObj(bridge.wallet||bridge);
    var addrs=safeObj(user.addresses||bw.addresses), words=safeObj(user.words||bw.words);
    return norm(user.address||bw.address||addrs['dochain-1']||addrs['columbus-5']||addrs['phoenix-1']||words['888']||words['118']||user.name||bw.name||'unknown-wallet');
  }
  function storeCtx(){
    var store=safeObj(read(SKEY,{byWallet:{}})); store.byWallet=safeObj(store.byWallet);
    var key=walletKey(), b=safeObj(store.byWallet[key]);
    b.approved=unique(b.approved||[]); b.declined=unique(b.declined||[]); b.pending=safeObj(b.pending);
    store.byWallet[key]=b; return {store:store,key:key,bucket:b};
  }
  function saveCtx(ctx){ctx.store.byWallet[ctx.key]=ctx.bucket; write(SKEY,ctx.store); try{window.dispatchEvent(new CustomEvent('do_wallet_quarantine_change',{detail:{wallet:ctx.key}}));}catch(e){}}
  function seed(){
    var allow=read(AKEY,[]).concat(defaultAllow.map(function(s){return 'symbol:global:'+s;}),defaultChains.map(function(c){return 'chain:'+c;}));
    write(AKEY,unique(allow));
    var approvals=read(UKEY,{}); if(Array.isArray(approvals)) approvals={}; write(UKEY,approvals);
  }
  function keyFor(item){
    if(!item)return''; if(typeof item==='string')return norm(item);
    var type=norm(item.type||'symbol'), chain=norm(item.chain||item.chainID||item.network||'global'), value=norm(item.value||item.contract||item.denom||item.symbol||item.token||item.id||'');
    return value ? [type,chain,value].join(':') : '';
  }
  function keyParts(k){var p=norm(k).split(':'); if(p[0]==='chain')return {type:'chain',chain:p[1]||'',value:p[1]||''}; return {type:p[0]||'',chain:p[1]||'',value:p.slice(2).join(':')||p[1]||''};}
  function tokenFromKey(k){return keyParts(k).value;}
  function getQuarantine(){var c=storeCtx(); return unique((c.bucket.declined||[]).concat(read(QKEY,[]).filter(Boolean)));}
  function setQuarantine(v){var c=storeCtx(); c.bucket.declined=unique(v); saveCtx(c); write(QKEY,unique(v)); renderQuarantinePage(); applyVisibilityFilters();}
  function getPending(){var c=storeCtx(); return unique(Object.keys(c.bucket.pending||{}).concat(read(PKEY,[]).filter(Boolean)));}
  function setPending(v){var c=storeCtx(); c.bucket.pending={}; unique(v).forEach(function(k){c.bucket.pending[k]={key:k,label:tokenFromKey(k)||k,source:'website',status:'pending',firstSeenAt:Date.now(),updatedAt:Date.now()};}); saveCtx(c); write(PKEY,unique(v)); renderQuarantinePage();}
  function getAllow(){var c=storeCtx(); return unique((c.bucket.approved||[]).concat(read(AKEY,[]).filter(Boolean)));}
  function addAllow(k){var c=storeCtx(); c.bucket.approved=unique((c.bucket.approved||[]).concat([k])); saveCtx(c); write(AKEY,unique(getAllow().concat([k])));}
  function getApprovals(){var x=read(UKEY,{}); return Array.isArray(x)?{}:x;}
  function addPending(item){var k=keyFor(item); if(!k||isKnownSafe(k))return false; var p=getPending(); if(p.indexOf(k)<0&&getQuarantine().indexOf(k)<0)p.push(k); setPending(p); return true;}
  function addQuarantine(item,rerender){var k=keyFor(item); if(!k)return false; var q=getQuarantine(); if(q.indexOf(k)<0)q.push(k); setQuarantine(q); write(PKEY,getPending().filter(function(x){return x!==k;})); if(rerender!==false){renderQuarantinePage(); applyVisibilityFilters();} return true;}
  function removeQuarantine(k,rerender){k=norm(k); write(QKEY,getQuarantine().filter(function(x){return x!==k;})); if(rerender!==false){renderQuarantinePage(); applyVisibilityFilters();}}
  function setDecision(k,decision){k=norm(k); var a=getApprovals(); a[k]={decision:decision,updatedAt:new Date().toISOString()}; write(UKEY,a); if(decision==='approved'){addAllow(k); removeQuarantine(k,false); write(PKEY,getPending().filter(function(x){return x!==k;}));} if(decision==='declined'){addQuarantine(k,false);} renderQuarantinePage(); applyVisibilityFilters();}
  async function loadRegistry(){if(registry)return registry; try{var r=await fetch(RURL,{cache:'force-cache'}); registry=await r.json();}catch(e){registry={assets:[]};} return registry;}
  function isKnownSafe(k){
    k=norm(k); if(getAllow().indexOf(k)>=0)return true;
    var p=keyParts(k); if(defaultAllow.indexOf(p.value)>=0)return true; if(p.type==='chain'&&defaultChains.indexOf(p.chain)>=0)return true;
    return false;
  }
  function isBlockedAsset(asset){
    var chain=norm(asset&& (asset.chain||asset.chainID)); var denom=norm(asset&& (asset.denom||asset.token||asset.contract||asset.symbol));
    return getQuarantine().some(function(k){var p=keyParts(k); return p.value && (!p.chain||p.chain==='global'||p.chain===chain) && (p.value===denom || denom.indexOf(p.value)>=0);});
  }
  function maybeFlagAsset(asset){
    var k=keyFor(asset); if(!k||isKnownSafe(k))return false;
    var p=keyParts(k); var risky=p.type==='contract'||p.value.length>12||['eth','btc','usdt','usdc','do','bnb','sol','lunc'].indexOf(p.value)>=0;
    if(risky)return addPending(k);
    return false;
  }
  function scanTx(payload){var text; try{text=norm(JSON.stringify(payload));}catch(e){text=norm(payload)} if(!text)return null; var hit=null; getQuarantine().some(function(k){var v=tokenFromKey(k); if(v&&v.length>3&&text.indexOf(v)>=0){hit=k; return true;} return false;}); return hit;}
  function detectUnknownTxAsset(payload){
    var text; try{text=norm(JSON.stringify(payload));}catch(e){text=norm(payload)}
    if(!text)return null;
    var approval=false;
    function hasApprovalIntent(value,key,depth){
      if(approval||depth>14)return;
      var k=norm(key).replace(/[^a-z0-9]/g,'');
      if(['approve','approveall','increaseallowance','decreaseallowance','setapprovalforall','permit'].indexOf(k)>=0){approval=true; return;}
      if((k==='type'||k==='typeurl'||k==='typeurls')&&typeof value==='string'&&/msggrant|grantallowance/i.test(value)){approval=true; return;}
      if(typeof value==='string'&&/\/(cosmos\.authz\.v1beta1\.MsgGrant|cosmos\.feegrant\.v1beta1\.MsgGrantAllowance)\b/i.test(value)){approval=true; return;}
      if(value&&typeof value==='object'){
        Object.keys(value).some(function(childKey){hasApprovalIntent(value[childKey],childKey,depth+1); return approval;});
      }
    }
    hasApprovalIntent(payload,'',0);
    if(!approval)return null;
    var match=text.match(/(terra1[0-9a-z]{20,}|secret1[0-9a-z]{20,}|do1[0-9a-z]{20,}|0x[0-9a-f]{40}|[a-z0-9]{32,}i0)/);
    var value=match&&match[1] ? match[1] : 'unknown-permission-request';
    var key=value==='unknown-permission-request'?'approval:global:'+value:'contract:global:'+value;
    if(isKnownSafe(key)||getAllow().indexOf(key)>=0)return null;
    return key;
  }
  function assertAllowedTx(payload){var hit=scanTx(payload); if(hit)throw new Error('Do-Wallet quarantine blocked transaction involving '+hit); var unknown=detectUnknownTxAsset(payload); if(unknown){addPending(unknown); throw new Error('Do-Wallet moved an unknown approval/contract request to Quarantine: '+unknown);} return true;}
  function wrap(obj,methods,label){if(!obj||obj.__doWalletQuarantineWrapped)return; methods.forEach(function(m){if(typeof obj[m]!=='function')return; var original=obj[m]; obj[m]=function(){assertAllowedTx([label,m,Array.prototype.slice.call(arguments)]); return original.apply(this,arguments);};}); obj.__doWalletQuarantineWrapped=true;}
  function wrapProviders(){try{wrap(window.doWallet,['post','sign','signAmino','signDirect'],'doWallet');}catch(e){} try{wrap(window.ethereum,['request','send','sendAsync'],'ethereum');}catch(e){} try{wrap(window.solana,['signTransaction','signAllTransactions','signAndSendTransaction'],'solana');}catch(e){}}
  
  var ORDI_TOKEN_ID='b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735i0';
  function approveOrdi(){setDecision('symbol:global:ordi','approved'); setDecision('brc20:bitcoin-mainnet:'+ORDI_TOKEN_ID,'approved'); addAllow('symbol:global:ordi'); addAllow('brc20:bitcoin-mainnet:'+ORDI_TOKEN_ID);}
  function manageTokensModal(){return Array.prototype.find.call(document.querySelectorAll('div,section,article'),function(el){return /manage tokens/i.test((el.textContent||'').slice(0,80));});}
  function injectOrdiSearchResult(){
    var modal=manageTokensModal(); if(!modal)return;
    var input=modal.querySelector('input'); if(!input)return;
    var q=norm(input.value); if(!q||!(q.indexOf('ordi')>=0||ORDI_TOKEN_ID.indexOf(q)>=0||q.indexOf(ORDI_TOKEN_ID)>=0))return;
    if(modal.querySelector('#doq-ordi-result'))return;
    var empty=Array.prototype.find.call(modal.querySelectorAll('p,div'),function(el){return /no results|search by token/i.test(el.textContent||'');});
    var row=document.createElement('div'); row.id='doq-ordi-result';
    row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-bottom:1px solid #4b276d;color:#fff;';
    row.innerHTML='<div style="display:flex;align-items:center;gap:12px"><div style="width:28px;height:28px;border-radius:50%;background:#f7931a;color:#fff;display:grid;place-items:center;font-weight:900">₿</div><div><strong>ORDI</strong><div style="color:#bda9e5;font-size:12px">Bitcoin BRC-20 token</div><div style="color:#a855f7;font-size:11px;font-family:monospace;max-width:430px;overflow:hidden;text-overflow:ellipsis">'+ORDI_TOKEN_ID+'</div></div></div><button type="button" id="doq-add-ordi" style="border:0;border-radius:999px;background:#fff;color:#1b1028;width:26px;height:26px;font-weight:900;cursor:pointer">+</button>';
    var target=input.closest('div');
    while(target&&target.parentElement!==modal&&target.parentElement)target=target.parentElement;
    (empty&&empty.parentElement?empty.parentElement:modal).appendChild(row);
    var btn=row.querySelector('#doq-add-ordi');
    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();approveOrdi();btn.textContent='✓';btn.style.background='#fff';btn.title='ORDI approved for this user';});
  }

  function installStyles(){if(document.getElementById('doq-style'))return; var s=document.createElement('style'); s.id='doq-style'; s.textContent='.doq-side{display:flex;align-items:center;gap:12px;width:calc(100% - 16px);margin:4px 8px;padding:13px 18px;border:0;border-radius:10px;background:transparent;color:#c8bdd7;font-weight:800;font:inherit;cursor:pointer;text-align:left}.doq-side:hover,.doq-side.active{background:#211b2b;color:#fff}.doq-dot{width:16px;height:16px;border-radius:5px;border:2px solid currentColor;box-sizing:border-box;position:relative}.doq-dot:after{content:"";position:absolute;left:3px;top:3px;width:6px;height:6px;border-radius:50%;background:currentColor}.doq-page{max-width:1220px;padding:8px 18px}.doq-page h1{margin:0 0 20px;font-size:38px}.doq-panel{border:1px solid #4b276d;background:#171020;border-radius:14px;padding:20px;margin:0 0 24px;color:#fff}.doq-panel p{color:#c9b7ef;margin:6px 0 14px}.doq-form{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.doq-input{background:#0d0717;border:1px solid #4b276d;color:#fff;border-radius:10px;padding:10px 12px;min-width:220px}.doq-btn{border:1px solid #5f2f95;background:#241936;color:#fff;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer}.doq-btn.primary{background:#933cff;border-color:#b35cff}.doq-btn.danger{background:#3b1826;border-color:#96324d}.doq-table{width:100%;border-collapse:collapse;margin-top:12px}.doq-table th,.doq-table td{border-bottom:1px solid #3b2454;padding:12px 10px;text-align:left;vertical-align:middle}.doq-table th{color:#bda9e5;font-size:12px;text-transform:uppercase}.doq-table td{color:#fff}.doq-key{font-family:monospace;color:#d8c8ff;word-break:break-all;font-size:12px}.doq-small{font-size:12px;color:#b6a3dd}.doq-pill{display:inline-flex;padding:3px 8px;border-radius:999px;background:#2a1b3d;color:#d9c6ff;font-size:12px;font-weight:800}.doq-pill.warn{background:#402f11;color:#ffd77a}.doq-pill.bad{background:#471a26;color:#ff8299}.doq-empty{padding:22px;border:1px dashed #4b276d;border-radius:12px;color:#c9b7ef}.doq-hidden{display:none!important}'; document.head.appendChild(s);}
  function findByText(sel,rx){return Array.prototype.find.call(document.querySelectorAll(sel),function(el){return rx.test((el.textContent||'').trim());});}
  function insertSideMenu(){installStyles();}
  function findMain(){return document.querySelector('main')||document.querySelector('[class*=Layout_main]')||document.body;}
  function hideMainChildren(root,hide){Array.prototype.forEach.call(root.children,function(el){if(el.id!=='doq-page')el.classList.toggle('doq-hidden',hide);});}
  function showPortfolio(){var main=findMain(), page=document.getElementById('doq-page'); if(main)hideMainChildren(main,false); if(page)page.classList.add('doq-hidden'); var side=document.getElementById('doq-side'); if(side)side.classList.remove('active');}
  function showQuarantine(){installStyles(); var main=findMain(); if(!main)return; var page=document.getElementById('doq-page'); if(!page){page=document.createElement('div'); page.id='doq-page'; main.insertBefore(page,main.firstChild);} hideMainChildren(main,true); page.classList.remove('doq-hidden'); var side=document.getElementById('doq-side'); if(side)side.classList.add('active'); renderQuarantinePage();}
  function rowHtml(row){var pill=row.status==='declined'?'bad':'warn'; return '<tr><td><strong>'+esc(row.asset)+'</strong><div class="doq-small">'+esc(row.chain)+'</div></td><td>'+esc(row.reason)+'</td><td><span class="doq-pill '+pill+'">'+esc(row.status)+'</span></td><td class="doq-key">'+esc(row.key)+'</td><td><button class="doq-btn primary" data-approve="'+encodeURIComponent(row.key)+'">Approve</button> <button class="doq-btn danger" data-decline="'+encodeURIComponent(row.key)+'">Decline</button></td></tr>';}
  async function buildRows(){await loadRegistry(); var approvals=getApprovals(), pending=getPending(), quarantine=getQuarantine(), rows=[]; pending.forEach(function(k){if(approvals[k]&&approvals[k].decision==='approved')return; var p=keyParts(k); rows.push({asset:p.value||k,chain:p.chain||'global',reason:'Suspicious or unknown received asset',status:'pending review',key:k});}); quarantine.forEach(function(k){var p=keyParts(k); rows.push({asset:p.value||k,chain:p.chain||'global',reason:'User declined or blocked asset',status:'declined',key:k});}); return rows.filter(function(r,i,a){return a.findIndex(function(x){return x.key===r.key;})===i;});}
  async function renderQuarantinePage(){var page=document.getElementById('doq-page'); if(!page)return; page.innerHTML='<div class="doq-page"><h1>Quarantine</h1><section class="doq-panel"><h2>Suspicious assets inbox</h2><p>This page only shows coins/contracts that look risky or have been declined by this user. Known safe L1/L2 assets and approved reference coins stay out of the inbox.</p><div class="doq-form"><input class="doq-input" id="doq-chain" placeholder="chain id, optional"><input class="doq-input" id="doq-value" placeholder="contract / denom / symbol"><button class="doq-btn danger" id="doq-add">Decline custom</button><button class="doq-btn" id="doq-back">Back</button></div><div class="doq-small">Approve shows the asset for this user. Decline hides it and blocks signing/interactions for this user.</div><div id="doq-table-wrap" class="doq-small">Loading quarantine inbox...</div></section></div>'; var rows=await buildRows(); var wrap=document.getElementById('doq-table-wrap'); if(!wrap)return; wrap.innerHTML=rows.length?'<table class="doq-table"><thead><tr><th>Asset</th><th>Reason</th><th>Status</th><th>Reference key</th><th>Action</th></tr></thead><tbody>'+rows.map(rowHtml).join('')+'</tbody></table>':'<div class="doq-empty">No suspicious assets detected. If a risky token arrives, it will appear here for this user to approve or decline.</div>';}
  function lowBalanceFilterEnabled(){
    var checks=Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"]'));
    return checks.some(function(input){
      var label=(input.closest('label')||input.parentElement||{}).textContent||'';
      if(input.id){var forLabel=document.querySelector('label[for="'+input.id.replace(/"/g,'\\"')+'"]'); if(forLabel)label+=' '+(forLabel.textContent||'');}
      return /hide\s+low[-\s]?balance/i.test(label)&&input.checked;
    });
  }
  function parseAssetAmount(text){
    var matches=String(text||'').match(/([0-9][0-9,]*\.?[0-9]*)\s+([A-Z0-9.]{2,12})(?=\s|$)/ig);
    if(!matches||!matches.length)return NaN;
    var last=matches[matches.length-1].match(/([0-9][0-9,]*\.?[0-9]*)/);
    return last?Number(last[1].replace(/,/g,'')):NaN;
  }
  function looksLikeAssetRow(el){
    var text=el&&el.textContent||'';
    if(!/[0-9][0-9,]*\.?[0-9]*\s+[A-Z0-9.]{2,12}/i.test(text))return false;
    if(/portfolio value|assets\s*manage|hide\s+low[-\s]?balance|send\s+swap\s+receive|buy\s*\/\s*sell/i.test(text))return false;
    var r=el.getBoundingClientRect&&el.getBoundingClientRect();
    return !r || (r.width>180&&r.height>=34&&r.height<170);
  }
  function clearLowBalanceFilter(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-doq-low-balance-hidden="1"]'),function(el){
      el.classList.remove('doq-hidden');
      el.removeAttribute('data-doq-low-balance-hidden');
    });
  }
  function applyLowBalanceFilter(){
    clearLowBalanceFilter();
    if(!lowBalanceFilterEnabled())return;
    Array.prototype.forEach.call(document.querySelectorAll('aside *, [class*=Wallet] *, [class*=Asset] *'),function(el){
      if(!looksLikeAssetRow(el)||el.closest('#doq-page'))return;
      var text=norm(el.textContent), amount=parseAssetAmount(el.textContent), sym=(String(el.textContent).match(/\s([A-Z0-9.]{2,12})\s*$/)||[])[1];
      sym=norm(sym||'');
      if(!isNaN(amount)&&amount<=1){el.setAttribute('data-doq-low-balance-hidden','1'); el.classList.add('doq-hidden');}
    });
  }
  function applyVisibilityFilters(){
    var q=getQuarantine().map(tokenFromKey).filter(Boolean);
    if(q.length)Array.prototype.forEach.call(document.querySelectorAll('*'),function(el){if(el.children.length>3||el.closest('#doq-page'))return; var text=norm(el.textContent); if(text && q.some(function(v){return v.length>3 && text.indexOf(v)>=0;})) el.classList.add('doq-hidden');});
    applyLowBalanceFilter();
  }
  document.addEventListener('click',function(e){var side=e.target.closest&&e.target.closest('#doq-side'); var inPage=e.target.closest&&e.target.closest('#doq-page'); if(!side&&!inPage){var nav=e.target.closest&&e.target.closest('a,button'); if(nav)showPortfolio();} var b=e.target.closest&&e.target.closest('button'); if(!b)return; if(b.id==='doq-add'){var chain=document.getElementById('doq-chain'), value=document.getElementById('doq-value'); var raw=norm(value&&value.value); var type=raw.indexOf(':')>0?null:(raw.indexOf('0x')===0||raw.indexOf('1')>0?'contract':'symbol'); if(raw)setDecision(type?[type,chain&&chain.value||'global',raw].join(':'):raw,'declined'); if(value)value.value='';} if(b.id==='doq-back')showPortfolio(); if(b.dataset.approve)setDecision(decodeURIComponent(b.dataset.approve),'approved'); if(b.dataset.decline)setDecision(decodeURIComponent(b.dataset.decline),'declined');},true);
  window.addEventListener('hashchange',showPortfolio); window.addEventListener('popstate',showPortfolio);
  function initOrdiSearchResult(){
    injectOrdiSearchResult();
    document.addEventListener('input',function(e){
      var modal=manageTokensModal();
      if(modal&&e.target&&modal.contains(e.target))setTimeout(injectOrdiSearchResult,80);
    },true);
    setInterval(injectOrdiSearchResult,30000);
  }
  function initVisibilityFilters(){
    applyVisibilityFilters();
    ['do_wallet_quarantine_change','do_wallet_portfolio_snapshot','do_wallet_chain_assets_update'].forEach(function(name){
      window.addEventListener(name,function(){setTimeout(applyVisibilityFilters,300);});
    });
    setInterval(applyVisibilityFilters,30000);
  }
  seed(); window.doWalletQuarantine={addPending:addPending,flag:maybeFlagAsset,add:addQuarantine,remove:removeQuarantine,allow:function(x){setDecision(keyFor(x),'approved')},decline:function(x){setDecision(keyFor(x),'declined')},list:getQuarantine,pending:getPending,allowlist:getAllow,decisions:getApprovals,isBlockedAsset:isBlockedAsset,scanTx:scanTx,assertAllowedTx:assertAllowedTx,show:showQuarantine};
  wrapProviders(); setInterval(wrapProviders,30000); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insertSideMenu); else insertSideMenu(); initOrdiSearchResult(); initVisibilityFilters();
})();
