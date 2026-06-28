(function(){
  var QKEY='doWallet.quarantine.v1';
  var PKEY='doWallet.quarantinePending.v1';
  var AKEY='doWallet.allowlist.v1';
  var UKEY='doWallet.userApprovals.v1';
  var HKEY='doWallet.hiddenAssets.v1';
  var SKEY='doWalletQuarantineV1';
  var RURL='/static/approved-assets/top-500-coingecko-20260519.json?v=20260519a';
  var registry=null;
  var defaultAllow=['do','btc','eth','bnb','sol','lunc','luna','scrt','dgn','idtc','krtc','ordi','matic','osmo','akt','udo','uluna','uscrt','udgn'];
  var defaultChains=['dochain-1','bitcoin-mainnet','ethereum-mainnet','bnb-smart-chain-mainnet','solana-mainnet','polygon-mainnet','optimism-mainnet','base-mainnet','avalanche-c-chain','arbitrum-one','tron-mainnet','xrp-ledger-mainnet','cardano-mainnet','columbus-5','phoenix-1','secret-4','dungeon-1'];
  function text(v){
    var s=String(v||'');
    if(typeof s.toWellFormed==='function')return s.toWellFormed();
    return s.replace(/[\uD800-\uDFFF]/g,function(ch,i,str){
      var code=ch.charCodeAt(0), prev=i>0?str.charCodeAt(i-1):0, next=i<str.length-1?str.charCodeAt(i+1):0;
      if(code>=0xD800&&code<=0xDBFF)return next>=0xDC00&&next<=0xDFFF?ch:'';
      return prev>=0xD800&&prev<=0xDBFF?ch:'';
    });
  }
  function norm(v){return text(v).trim().toLowerCase();}
  function esc(v){return text(v).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
  function escAttr(v){return esc(v).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function safeEncode(v){try{return encodeURIComponent(text(v));}catch(e){return encodeURIComponent(norm(v));}}
  function read(k,fallback){try{var v=JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback||[]));return Array.isArray(v)||typeof v==='object'?v:fallback}catch(e){return fallback||[]}}
  function write(k,v){localStorage.setItem(k,JSON.stringify(v));}
  function toList(v){
    if(Array.isArray(v))return v;
    if(v&&typeof v==='object'){
      var out=Object.keys(v);
      Object.keys(v).forEach(function(k){var item=v[k]; if(typeof item==='string')out.push(item); else if(item&&typeof item==='object')out.push(item.key||item.value||item.contract||item.denom||item.symbol||item.id||'');});
      return out;
    }
    return [];
  }
  function storedList(k){return toList(read(k,[]));}
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
    b.approved=unique(b.approved||[]); b.declined=unique(b.declined||[]); b.hidden=unique(b.hidden||[]); b.pending=safeObj(b.pending);
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
  function keyForAsset(asset){
    if(!asset)return'';
    var chain=norm(asset.chain||asset.chainID||asset.chainId||asset.network||asset.networkID||asset.networkId||'global');
    var contract=norm(asset.contract||asset.contractAddress||asset.tokenAddress||asset.address);
    var denom=norm(asset.denom||asset.baseDenom||asset.token||asset.tokenId||asset.id||'');
    var symbol=norm(asset.symbol||asset.ticker||asset.name||'');
    if(contract&&(/^0x[0-9a-f]{40}$/i.test(contract)||contract.indexOf('terra1')===0||contract.indexOf('secret1')===0||contract.indexOf('do1')===0))return keyFor({type:'contract',chain:chain,value:contract});
    if(denom)return keyFor({type:denom.length>24||denom.indexOf('/')>=0||denom.indexOf(':')>=0?'contract':'denom',chain:chain,value:denom});
    if(symbol)return keyFor({type:'symbol',chain:chain,value:symbol});
    return '';
  }
  function matchingKeysForAsset(asset){
    var keys=[], base=keyForAsset(asset), chain=norm(asset&& (asset.chain||asset.chainID||asset.chainId||asset.network||asset.networkID||asset.networkId||'global')), symbol=norm(asset&& (asset.symbol||asset.ticker||asset.name)), denom=norm(asset&& (asset.denom||asset.baseDenom||asset.token||asset.tokenId||asset.id)), contract=norm(asset&& (asset.contract||asset.contractAddress||asset.tokenAddress||asset.address));
    function add(k){k=norm(k); if(k&&keys.indexOf(k)<0)keys.push(k);}
    add(base); add(chain?'chain:'+chain:'');
    if(symbol){add('symbol:'+chain+':'+symbol); add('symbol:global:'+symbol);}
    if(denom){add('denom:'+chain+':'+denom); add('denom:global:'+denom); add('contract:'+chain+':'+denom); add('contract:global:'+denom);}
    if(contract){add('contract:'+chain+':'+contract); add('contract:global:'+contract);}
    return keys;
  }
  function keyParts(k){var p=norm(k).split(':'); if(p[0]==='chain')return {type:'chain',chain:p[1]||'',value:p[1]||''}; return {type:p[0]||'',chain:p[1]||'',value:p.slice(2).join(':')||p[1]||''};}
  function tokenFromKey(k){return keyParts(k).value;}
  function getQuarantine(){var c=storeCtx(); return unique((c.bucket.declined||[]).concat(storedList(QKEY).filter(Boolean)));}
  function setQuarantine(v,rerender){var c=storeCtx(); c.bucket.declined=unique(v); saveCtx(c); write(QKEY,unique(v)); if(rerender!==false){renderQuarantinePage(); applyVisibilityFilters();}}
  function getHidden(){var c=storeCtx(); return unique((c.bucket.hidden||[]).concat(storedList(HKEY).filter(Boolean)));}
  function setHidden(v,rerender){var c=storeCtx(); c.bucket.hidden=unique(v); saveCtx(c); if(rerender!==false){renderQuarantinePage(); applyVisibilityFilters();}}
  function addHidden(item,rerender){var k=keyForAsset(item)||keyFor(item); if(!k)return false; var h=getHidden(); if(h.indexOf(k)<0)h.push(k); setHidden(h,rerender); return true;}
  function removeHidden(k,rerender){k=norm(k); var next=getHidden().filter(function(x){return x!==k;}); write(HKEY,unique(storedList(HKEY).filter(function(x){return norm(x)!==k;}))); setHidden(next,rerender); return true;}
  function getPending(){var c=storeCtx(); return unique(Object.keys(c.bucket.pending||{}).concat(storedList(PKEY).filter(Boolean)));}
  function setPending(v){var c=storeCtx(); c.bucket.pending={}; unique(v).forEach(function(k){c.bucket.pending[k]={key:k,label:tokenFromKey(k)||k,source:'website',status:'pending',firstSeenAt:Date.now(),updatedAt:Date.now()};}); saveCtx(c); write(PKEY,unique(v)); renderQuarantinePage();}
  function getAllow(){var c=storeCtx(); return unique((c.bucket.approved||[]).concat(storedList(AKEY).filter(Boolean)));}
  function addAllow(k){var c=storeCtx(); c.bucket.approved=unique((c.bucket.approved||[]).concat([k])); saveCtx(c); write(AKEY,unique(getAllow().concat([k])));}
  function getApprovals(){return safeObj(read(UKEY,{}));}
  function addPending(item){var k=keyFor(item); if(!k||isKnownSafe(k))return false; var p=getPending(); if(p.indexOf(k)<0&&getQuarantine().indexOf(k)<0)p.push(k); setPending(p); return true;}
  function addQuarantine(item,rerender){var k=keyForAsset(item)||keyFor(item); if(!k)return false; var q=getQuarantine(); if(q.indexOf(k)<0)q.push(k); setQuarantine(q,false); write(PKEY,getPending().filter(function(x){return x!==k;})); removeHidden(k,false); if(rerender!==false){renderQuarantinePage(); applyVisibilityFilters();} return true;}
  function removeQuarantine(k,rerender){k=norm(k); var c=storeCtx(); c.bucket.declined=unique((c.bucket.declined||[]).filter(function(x){return x!==k;})); saveCtx(c); write(QKEY,unique(storedList(QKEY).filter(function(x){return norm(x)!==k;}))); if(rerender!==false){renderQuarantinePage(); applyVisibilityFilters();}}
  function setDecision(k,decision){k=norm(k); var a=getApprovals(); a[k]={decision:decision,updatedAt:new Date().toISOString()}; write(UKEY,a); if(decision==='approved'){addAllow(k); removeQuarantine(k,false); removeHidden(k,false); write(PKEY,getPending().filter(function(x){return x!==k;}));} if(decision==='hidden'){addHidden(k,false); removeQuarantine(k,false);} if(decision==='declined'){addQuarantine(k,false);} renderQuarantinePage(); applyVisibilityFilters();}
  function firstField(obj,names){for(var i=0;i<names.length;i++){var v=obj&&obj[names[i]]; if(v!==undefined&&v!==null&&String(v).trim())return String(v).trim();} return '';}
  function assetDetailRow(label,value){if(!value)return ''; return '<div class="doq-asset-detail-row"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';}
  function closeAssetModal(){var m=document.getElementById('doq-asset-modal'); if(m)m.remove();}
  function installAssetModalStyles(){
    if(document.getElementById('doq-asset-modal-style'))return;
    var s=document.createElement('style'); s.id='doq-asset-modal-style';
    s.textContent='.doq-asset-modal-backdrop{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:rgba(3,0,10,.72);padding:18px;color:#fff}.doq-asset-modal{box-sizing:border-box;width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border:1px solid #6e2ca5;border-radius:14px;background:#171020;box-shadow:0 24px 80px rgba(0,0,0,.55);font-family:inherit}.doq-asset-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #392050}.doq-asset-modal-title{display:flex;flex-direction:column;gap:5px;min-width:0}.doq-asset-modal-title strong{font-size:22px;line-height:1.1;font-weight:var(--bold,500)}.doq-asset-modal-title small{font-size:13px;line-height:1.2;color:#c9bbef;font-weight:var(--bold,500);word-break:break-word}.doq-asset-modal-close{border:0;background:transparent;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:0}.doq-asset-modal-body{display:flex;flex-direction:column;gap:14px;padding:18px 22px}.doq-asset-detail-row{display:grid;grid-template-columns:118px minmax(0,1fr);gap:12px;padding:10px 0;border-bottom:1px solid rgba(135,57,190,.25)}.doq-asset-detail-row span{color:#aaa0bd;font-size:12px;font-weight:var(--bold,500)}.doq-asset-detail-row strong{color:#fff;font-size:13px;font-weight:var(--bold,500);word-break:break-word}.doq-asset-modal-note{color:#c9bbef;font-size:13px;line-height:1.35;margin:0}.doq-asset-modal-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;padding:0 22px 22px}.doq-asset-modal-actions button{border:1px solid #5f2f95;border-radius:10px;background:#241936;color:#fff;padding:10px 13px;font:inherit;font-size:13px;font-weight:var(--bold,500);cursor:pointer}.doq-asset-modal-actions button[data-doq-asset-hide]{color:#d9c6ff;border-color:#8739be}.doq-asset-modal-actions button[data-doq-asset-quarantine]{color:#ffb3c2;border-color:#b92e54;background:#35131f}@media(max-width:520px){.doq-asset-modal-backdrop{align-items:end;padding:10px}.doq-asset-modal{width:100%;border-radius:14px 14px 0 0}.doq-asset-detail-row{grid-template-columns:1fr}.doq-asset-modal-actions{justify-content:stretch}.doq-asset-modal-actions button{flex:1 1 100%}}';
    document.head.appendChild(s);
  }
  function showAssetDecision(asset){
    var payload=safeObj(asset), key=keyForAsset(payload)||keyFor(payload); if(!key)return false;
    var parts=keyParts(key), symbol=firstField(payload,['symbol','ticker','nativeSymbol'])||parts.value||'Asset';
    var name=firstField(payload,['displayName','name','label','chainName'])||symbol;
    var chain=firstField(payload,['chainName','networkName','network','chainID','chainId','chain'])||parts.chain||'global';
    var denom=firstField(payload,['denom','baseDenom','token','tokenId','id']);
    var contract=firstField(payload,['contract','contractAddress','tokenAddress']);
    var amount=firstField(payload,['amountText','displayAmount','balanceText','quantityText']);
    var value=firstField(payload,['valueText','usdValueText','fiatValueText','valueFormatted']);
    var price=firstField(payload,['priceText','usdPriceText','priceFormatted','unitPriceText']);
    var change=firstField(payload,['changeText','priceChangeText','percentText','change24hText']);
    closeAssetModal(); installAssetModalStyles();
    var modal=document.createElement('div'); modal.id='doq-asset-modal'; modal.className='doq-asset-modal-backdrop';
    modal.innerHTML='<section class="doq-asset-modal" role="dialog" aria-modal="true" aria-label="Asset details"><div class="doq-asset-modal-head"><div class="doq-asset-modal-title"><strong>'+esc(name)+'</strong><small>'+esc(symbol)+' on '+esc(chain)+'</small></div><button type="button" class="doq-asset-modal-close" data-doq-asset-close="1" aria-label="Close">x</button></div><div class="doq-asset-modal-body">'+assetDetailRow('Value',value)+assetDetailRow('Amount',amount)+assetDetailRow('Price',price)+assetDetailRow('24h change',change)+assetDetailRow('Chain',chain)+assetDetailRow('Symbol',symbol)+assetDetailRow('Denom',denom)+assetDetailRow('Contract',contract)+assetDetailRow('Reference',key)+'<p class="doq-asset-modal-note">Leave keeps this coin visible. Hide removes it from wallet views only. Quarantine hides it and blocks interactions for this wallet.</p></div><div class="doq-asset-modal-actions"><button type="button" data-doq-asset-close="1">Leave in wallet</button><button type="button" data-doq-asset-hide="1">Hide from view</button><button type="button" data-doq-asset-quarantine="1">Quarantine</button></div></section>';
    modal.addEventListener('click',function(e){var btn=e.target.closest&&e.target.closest('button,[data-doq-asset-close],[data-doq-asset-hide],[data-doq-asset-quarantine]'); if(!btn&&e.target===modal){closeAssetModal(); return;} if(!btn)return; e.preventDefault(); e.stopPropagation(); if(btn.hasAttribute('data-doq-asset-hide')){addHidden(payload,false); closeAssetModal(); renderQuarantinePage(); applyVisibilityFilters(); return;} if(btn.hasAttribute('data-doq-asset-quarantine')){addQuarantine(payload,false); closeAssetModal(); renderQuarantinePage(); applyVisibilityFilters(); return;} if(btn.hasAttribute('data-doq-asset-close'))closeAssetModal();},true);
    document.body.appendChild(modal); return true;
  }
  async function loadRegistry(){if(registry)return registry; try{var r=await fetch(RURL,{cache:'force-cache'}); registry=await r.json();}catch(e){registry={assets:[]};} return registry;}
  function isKnownSafe(k){
    k=norm(k); if(getAllow().indexOf(k)>=0)return true;
    var p=keyParts(k); if(defaultAllow.indexOf(p.value)>=0)return true; if(p.type==='chain'&&defaultChains.indexOf(p.chain)>=0)return true;
    return false;
  }
  function isBlockedAsset(asset){
    var matches=matchingKeysForAsset(asset), q=getQuarantine();
    if(matches.some(function(k){return q.indexOf(k)>=0;}))return true;
    var chain=norm(asset&& (asset.chain||asset.chainID||asset.chainId||asset.network)); var values=matchingKeysForAsset(asset).map(tokenFromKey).filter(Boolean);
    return q.some(function(k){var p=keyParts(k); return p.value && (!p.chain||p.chain==='global'||p.chain===chain) && values.some(function(v){return v===p.value || v.indexOf(p.value)>=0;});});
  }
  function isHiddenAsset(asset){
    var matches=matchingKeysForAsset(asset), h=getHidden();
    if(matches.some(function(k){return h.indexOf(k)>=0;}))return true;
    var chain=norm(asset&& (asset.chain||asset.chainID||asset.chainId||asset.network)); var values=matches.map(tokenFromKey).filter(Boolean);
    return h.some(function(k){var p=keyParts(k); return p.value && (!p.chain||p.chain==='global'||p.chain===chain) && values.some(function(v){return v===p.value || v.indexOf(p.value)>=0;});});
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
    row.innerHTML='<div style="display:flex;align-items:center;gap:12px"><div style="width:28px;height:28px;border-radius:50%;background:#f7931a;color:#fff;display:grid;place-items:center;font-weight: 700">₿</div><div><strong>ORDI</strong><div style="color:#bda9e5;font-size:12px">Bitcoin BRC-20 token</div><div style="color:#a855f7;font-size:11px;font-family:monospace;max-width:430px;overflow:hidden;text-overflow:ellipsis">'+ORDI_TOKEN_ID+'</div></div></div><button type="button" id="doq-add-ordi" style="border:0;border-radius:999px;background:#fff;color:#1b1028;width:26px;height:26px;font-weight: 700;cursor:pointer">+</button>';
    var target=input.closest('div');
    while(target&&target.parentElement!==modal&&target.parentElement)target=target.parentElement;
    (empty&&empty.parentElement?empty.parentElement:modal).appendChild(row);
    var btn=row.querySelector('#doq-add-ordi');
    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();approveOrdi();btn.textContent='✓';btn.style.background='#fff';btn.title='ORDI approved for this user';});
  }

  function installStyles(){if(document.getElementById('doq-style'))return; var s=document.createElement('style'); s.id='doq-style'; s.textContent='.doq-side{display:flex;align-items:center;gap:12px;width:calc(100% - 16px);margin:4px 8px;padding:13px 18px;border:0;border-radius:10px;background:transparent;color:#c8bdd7;font-weight: 700;font:inherit;cursor:pointer;text-align:left}.doq-side:hover,.doq-side.active{background:#211b2b;color:#fff}.doq-dot{width:16px;height:16px;border-radius:5px;border:2px solid currentColor;box-sizing:border-box;position:relative}.doq-dot:after{content:"";position:absolute;left:3px;top:3px;width:6px;height:6px;border-radius:50%;background:currentColor}.doq-page{max-width:1220px;padding:8px 18px}.doq-page h1{margin:0 0 20px;font-size:38px}.doq-panel{border:1px solid #4b276d;background:#171020;border-radius:14px;padding:20px;margin:0 0 24px;color:#fff}.doq-panel p{color:#c9b7ef;margin:6px 0 14px}.doq-form{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.doq-input{background:#0d0717;border:1px solid #4b276d;color:#fff;border-radius:10px;padding:10px 12px;min-width:220px}.doq-btn{border:1px solid #5f2f95;background:#241936;color:#fff;border-radius:10px;padding:8px 12px;font-weight: 700;cursor:pointer}.doq-btn.primary{background:#933cff;border-color:#b35cff}.doq-btn.danger{background:#3b1826;border-color:#96324d}.doq-table{width:100%;border-collapse:collapse;margin-top:12px}.doq-table th,.doq-table td{border-bottom:1px solid #3b2454;padding:12px 10px;text-align:left;vertical-align:middle}.doq-table th{color:#bda9e5;font-size:12px;text-transform:uppercase}.doq-table td{color:#fff}.doq-key{font-family:monospace;color:#d8c8ff;word-break:break-all;font-size:12px}.doq-small{font-size:12px;color:#b6a3dd}.doq-pill{display:inline-flex;padding:3px 8px;border-radius:999px;background:#2a1b3d;color:#d9c6ff;font-size:12px;font-weight: 700}.doq-pill.warn{background:#402f11;color:#ffd77a}.doq-pill.bad{background:#471a26;color:#ff8299}.doq-empty{padding:22px;border:1px dashed #4b276d;border-radius:12px;color:#c9b7ef}.doq-hidden{display:none!important}'; document.head.appendChild(s);}
  function findByText(sel,rx){return Array.prototype.find.call(document.querySelectorAll(sel),function(el){return rx.test((el.textContent||'').trim());});}
  function insertSideMenu(){installStyles();}
  function findMain(){return document.querySelector('main')||document.querySelector('[class*=Layout_main]')||document.body;}
  function hideMainChildren(root,hide){Array.prototype.forEach.call(root.children,function(el){if(el.id!=='doq-page')el.classList.toggle('doq-hidden',hide);});}
  function showPortfolio(){var main=findMain(), page=document.getElementById('doq-page'); if(main)hideMainChildren(main,false); if(page)page.classList.add('doq-hidden'); var side=document.getElementById('doq-side'); if(side)side.classList.remove('active');}
  function isQuarantineRoute(){return /^\/quarantine(?:\/|$)/i.test(window.location.pathname||'');}
  function showQuarantine(){installStyles(); var main=findMain(); if(!main)return false; var page=document.getElementById('doq-page'); if(!page){page=document.createElement('div'); page.id='doq-page'; main.insertBefore(page,main.firstChild);} hideMainChildren(main,true); page.classList.remove('doq-hidden'); var side=document.getElementById('doq-side'); if(side)side.classList.add('active'); renderQuarantinePage(); return true;}
  function rowHtml(row){row=safeObj(row); var key=String(row.key||''), encoded=safeEncode(key), pill=row.status==='declined'?'bad':row.status==='hidden'?'':'warn'; var actions=row.status==='hidden'?'<button class="doq-btn primary" data-restore="'+encoded+'">Restore</button> <button class="doq-btn danger" data-decline="'+encoded+'">Quarantine</button>':'<button class="doq-btn primary" data-approve="'+encoded+'">Approve</button> <button class="doq-btn danger" data-decline="'+encoded+'">Decline</button>'; return '<tr><td><strong>'+esc(row.asset)+'</strong><div class="doq-small">'+esc(row.chain)+'</div></td><td>'+esc(row.reason)+'</td><td><span class="doq-pill '+pill+'">'+esc(row.status)+'</span></td><td class="doq-key">'+esc(key)+'</td><td>'+actions+'</td></tr>';}
  async function buildRows(){await loadRegistry(); var approvals=getApprovals(), pending=getPending(), quarantine=getQuarantine(), hidden=getHidden(), rows=[]; pending.forEach(function(k){if(!k||(approvals[k]&&approvals[k].decision==='approved'))return; var p=keyParts(k); rows.push({asset:p.value||k,chain:p.chain||'global',reason:'Suspicious or unknown received asset',status:'pending review',key:k});}); quarantine.forEach(function(k){if(!k)return; var p=keyParts(k); rows.push({asset:p.value||k,chain:p.chain||'global',reason:'User declined or blocked asset',status:'declined',key:k});}); hidden.forEach(function(k){if(!k||quarantine.indexOf(k)>=0)return; var p=keyParts(k); rows.push({asset:p.value||k,chain:p.chain||'global',reason:'Hidden from wallet views by this user',status:'hidden',key:k});}); return rows.filter(function(r,i,a){return r&&r.key&&a.findIndex(function(x){return x&&x.key===r.key;})===i;});}
  async function renderQuarantinePage(){var page=document.getElementById('doq-page'); if(!page)return; page.innerHTML='<div class="doq-page"><h1>Quarantine</h1><section class="doq-panel"><h2>Suspicious assets inbox</h2><p>This page only shows coins/contracts that look risky or have been declined by this user. Known safe L1/L2 assets and approved reference coins stay out of the inbox.</p><div class="doq-form"><input class="doq-input" id="doq-chain" placeholder="chain id, optional"><input class="doq-input" id="doq-value" placeholder="contract / denom / symbol"><button class="doq-btn danger" id="doq-add">Decline custom</button><button class="doq-btn" id="doq-back">Back</button></div><div class="doq-small">Approve shows the asset for this user. Decline hides it and blocks signing/interactions for this user.</div><div id="doq-table-wrap" class="doq-small">Loading quarantine inbox...</div></section></div>'; var wrap=document.getElementById('doq-table-wrap'); try{var rows=await buildRows(); wrap=document.getElementById('doq-table-wrap'); if(!wrap)return; wrap.innerHTML=rows.length?'<table class="doq-table"><thead><tr><th>Asset</th><th>Reason</th><th>Status</th><th>Reference key</th><th>Action</th></tr></thead><tbody>'+rows.map(rowHtml).join('')+'</tbody></table>':'<div class="doq-empty">No suspicious assets detected. If a risky token arrives, it will appear here for this user to approve or decline.</div>';}catch(error){wrap=document.getElementById('doq-table-wrap'); if(wrap)wrap.innerHTML='<div class="doq-empty">Quarantine data could not be rendered safely. The wallet is still protected; use Restore/Decline after refreshing, or clear malformed custom entries.</div>'; try{console.error('Do-Wallet quarantine render failed',error);}catch(e){}}}
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-doq-asset-visibility-hidden="1"]'),function(el){el.classList.remove('doq-hidden'); el.removeAttribute('data-doq-asset-visibility-hidden');});
    if(isQuarantineRoute()){
      clearLowBalanceFilter();
      return;
    }
    var q=getQuarantine().concat(getHidden()).map(tokenFromKey).filter(Boolean);
    if(q.length)Array.prototype.forEach.call(document.querySelectorAll('*'),function(el){
      if(el.children.length>3||el.closest('#doq-page')||el.closest('.doq-asset-modal'))return;
      if(el===document.documentElement||el===document.body||el.tagName==='MAIN'||el.id==='station'||el.id==='do-wallet')return;
      var text=norm(el.textContent);
      if(text && q.some(function(v){return v.length>3 && text.indexOf(v)>=0;})){el.setAttribute('data-doq-asset-visibility-hidden','1'); el.classList.add('doq-hidden');}
    });
    applyLowBalanceFilter();
  }
  document.addEventListener('click',function(e){var side=e.target.closest&&e.target.closest('#doq-side'); var inPage=e.target.closest&&e.target.closest('#doq-page'); if(!side&&!inPage){var nav=e.target.closest&&e.target.closest('a,button'); if(nav&&!isQuarantineRoute())showPortfolio();} var b=e.target.closest&&e.target.closest('button'); if(!b)return; if(b.id==='doq-add'){var chain=document.getElementById('doq-chain'), value=document.getElementById('doq-value'); var raw=norm(value&&value.value); var type=raw.indexOf(':')>0?null:(raw.indexOf('0x')===0||raw.indexOf('1')>0?'contract':'symbol'); if(raw)setDecision(type?[type,chain&&chain.value||'global',raw].join(':'):raw,'declined'); if(value)value.value='';} if(b.id==='doq-back')showPortfolio(); if(b.dataset.approve)setDecision(decodeURIComponent(b.dataset.approve),'approved'); if(b.dataset.restore){removeHidden(decodeURIComponent(b.dataset.restore)); renderQuarantinePage(); applyVisibilityFilters();} if(b.dataset.decline)setDecision(decodeURIComponent(b.dataset.decline),'declined');},true);
  function syncRoute(){if(isQuarantineRoute())showQuarantine(); else showPortfolio();}
  function ensureQuarantineRoute(){if(!isQuarantineRoute())return; var attempts=0; var timer=setInterval(function(){attempts+=1; if(showQuarantine()||attempts>30)clearInterval(timer);},120);}
  window.addEventListener('hashchange',syncRoute); window.addEventListener('popstate',syncRoute);
  function initOrdiSearchResult(){
    injectOrdiSearchResult();
    document.addEventListener('input',function(e){
      var modal=manageTokensModal();
      if(modal&&e.target&&modal.contains(e.target))setTimeout(injectOrdiSearchResult,80);
    },true);
    document.addEventListener('click',function(){setTimeout(injectOrdiSearchResult,80);},true);
  }
  function initVisibilityFilters(){
    applyVisibilityFilters();
    ['do_wallet_quarantine_change','do_wallet_portfolio_snapshot','do_wallet_chain_assets_update'].forEach(function(name){
      window.addEventListener(name,function(){setTimeout(applyVisibilityFilters,300);});
    });
  }
  seed(); window.doWalletQuarantine={addPending:addPending,flag:maybeFlagAsset,add:addQuarantine,remove:removeQuarantine,hide:addHidden,unhide:removeHidden,allow:function(x){setDecision(keyForAsset(x)||keyFor(x),'approved')},decline:function(x){setDecision(keyForAsset(x)||keyFor(x),'declined')},restore:function(x){removeHidden(keyForAsset(x)||keyFor(x));},inspect:showAssetDecision,inspectAsset:showAssetDecision,keyFor:keyFor,keyForAsset:keyForAsset,list:getQuarantine,hidden:getHidden,pending:getPending,allowlist:getAllow,decisions:getApprovals,isHiddenAsset:isHiddenAsset,isBlockedAsset:isBlockedAsset,isVisibleAsset:function(asset){return !isHiddenAsset(asset)&&!isBlockedAsset(asset);},scanTx:scanTx,assertAllowedTx:assertAllowedTx,show:showQuarantine};
  wrapProviders(); window.addEventListener('focus',wrapProviders); window.addEventListener('pageshow',function(){wrapProviders(); ensureQuarantineRoute();}); document.addEventListener('visibilitychange',function(){if(!document.hidden)wrapProviders();}); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){insertSideMenu(); ensureQuarantineRoute();}); else {insertSideMenu(); ensureQuarantineRoute();} initOrdiSearchResult(); initVisibilityFilters();
})();
