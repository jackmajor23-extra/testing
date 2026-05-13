// ── Holdings ─────────────────────────────────────────
// 12. JS: HOLDINGS (REFACTORED)
// ═══════════════════════════════════════════════════
function renderInvestments(){
  invTab('stocks', document.querySelector('#page-investments .tab-btn.active') || document.querySelector('#page-investments .tab-btn'));
}

function setHFilter(f,el){
  hFilter=f;
  document.querySelectorAll('#htab-open .filter-btn').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  renderHoldings();
}

/**
 * Main holdings render - uses shared renderHoldingRow helper
 */
function renderHoldings(){
  const q=(document.getElementById('holdingsSearch')||{}).value||'';
  let H=S.holdings;
  if(hFilter!=='all') H=H.filter(h=>h.type===hFilter);
  if(q) H=H.filter(h=>h.name.toLowerCase().includes(q.toLowerCase())||(h.ticker||'').toLowerCase().includes(q.toLowerCase()));
  const tb=document.getElementById('holdingsBody');
  if(!H.length){ 
    tb.innerHTML=renderEmptyState('◫', 'No holdings yet.<br>Add one via the Add tab.', '10');
    return;
  }
  tb.innerHTML=H.map(h=>{
    const originalIndex = S.holdings.findIndex(x => x.id === h.id);
    return renderHoldingRow(h, originalIndex);
  }).join('');
}

/**
 * Stocks holdings render - uses shared renderHoldingRow helper
 * BUG FIX: Avoid duplicate holdings by properly filtering
 */
function renderStocksHoldings(){
  const q=(document.getElementById('holdingsSearch')||{}).value||'';
  let H=S.holdings.filter(h=>h.type==='stocks');
  if(q) H=H.filter(h=>h.name.toLowerCase().includes(q.toLowerCase())||(h.ticker||'').toLowerCase().includes(q.toLowerCase()));
  const tb=document.getElementById('stocksBody');
  if(!H.length){ 
    tb.innerHTML=renderEmptyState('◫', 'No stock holdings yet.', '10');
    return;
  }
  tb.innerHTML=H.map(h=>{
    const originalIndex = S.holdings.findIndex(x => x.id === h.id);
    return renderHoldingRow(h, originalIndex);
  }).join('');
}

/**
 * Crypto holdings render - uses shared renderHoldingRow helper
 * BUG FIX: Avoid duplicate holdings by properly filtering
 */
function renderCryptoHoldings(){
  const q=(document.getElementById('cryptoSearch')||{}).value||'';
  let H=S.holdings.filter(h=>h.type==='crypto');
  if(q) H=H.filter(h=>h.name.toLowerCase().includes(q.toLowerCase())||(h.ticker||'').toLowerCase().includes(q.toLowerCase()));
  const tb=document.getElementById('cryptoBody');
  if(!H.length){ 
    tb.innerHTML=renderEmptyState('◫', 'No crypto holdings yet.', '10');
    return;
  }
  tb.innerHTML=H.map(h=>{
    const originalIndex = S.holdings.findIndex(x => x.id === h.id);
    return renderHoldingRow(h, originalIndex);
  }).join('');
}

/**
 * Consolidated investment stats rendering
 * Reduces code duplication across type-specific stat renderers
 */
function renderInvestmentStats(){
  renderInvestmentTypeStats(S.holdings, 'investmentStats');
}

function renderStocksStats(){
  renderInvestmentTypeStats(S.holdings.filter(h=>h.type==='stocks'), 'stocksStats', 'Stocks');
}

function renderCryptoStats(){
  renderInvestmentTypeStats(S.holdings.filter(h=>h.type==='crypto'), 'cryptoStats', 'Crypto');
}

function renderClosed(){
  const tb=document.getElementById('closedBody');
  if(!S.closedHoldings.length){ 
    tb.innerHTML=renderEmptyState('◫', 'No sold positions yet.', '11');
    return;
  }
  tb.innerHTML=S.closedHoldings.map((h,i)=>{
    const pl=(h.soldFor||0)-h.invested, ret=pct(h.soldFor||0,h.invested);
    return`<tr>
      <td><span style="font-variation-settings:'wght' 600;">${h.name}</span>${h.ticker?`<span class="ticker-badge">${h.ticker}</span>`:''}</td>
      <td>${renderTypePill(h.type)}</td>
      <td class="val">${h.buyPrice?CUR()+parseFloat(h.buyPrice).toFixed(2):'—'}</td>
      <td>${fmtDate(h.buyDate)}</td>
      <td class="val">${h.sellPrice?CUR()+parseFloat(h.sellPrice).toFixed(2):'—'}</td>
      <td>${fmtDate(h.sellDate)}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(h.soldFor||0)}</td>
      <td class="${cls(pl)} val">${fmtS(pl)}</td>
      <td class="${cls(ret)}">${fmtP(ret)}</td>
      <td><button class="icon-btn del" onclick="deleteClosedHolding(${i})">✕</button></td>
    </tr>`;
  }).join('');
}

function addHolding(){
  const name=(document.getElementById('hName').value||'').trim();
  const ticker=(document.getElementById('hTicker').value||'').trim().toUpperCase();
  const type=document.getElementById('hType').value;
  const invested=parseMoney(document.getElementById('hInvested').value);
  const current=parseMoney(document.getElementById('hCurrent').value);
  const buyPrice=document.getElementById('hBuyPrice').value;
  const shares=document.getElementById('hShares').value;
  const buyDate=document.getElementById('hBuyDate').value;
  const wrapper=document.getElementById('hWrapper').value;
  const notes=document.getElementById('hNotes').value;
  if(!name||isNaN(invested)||isNaN(current)){ toast('Please fill: name, invested, and current value.'); return; }
  S.holdings.push({id:Date.now(),name,ticker,type,invested,current,buyPrice,shares,buyDate,wrapper,notes});
  _addTx({txtype:'buy',date:buyDate||new Date().toISOString().split('T')[0],desc:`Bought ${name}${ticker?' ('+ticker+')':''}`,amount:invested,pnl:0,notes});
  save(); closeModal('addHoldingModal'); renderHoldings(); renderOverview(); toast(`Added ${name}`);
  ['hName','hTicker','hInvested','hCurrent','hBuyPrice','hShares','hBuyDate','hNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('hType').value='stocks';
  document.getElementById('hWrapper').value='';
}

function deleteHolding(id){
  S.holdings=S.holdings.filter(h=>h.id!==id);
  save(); renderHoldings(); renderOverview(); toast('Holding deleted');
}

function deleteClosedHolding(i){
  S.closedHoldings.splice(i,1);
  save(); renderClosed(); toast('Deleted');
}

function moveHoldingUp(i){
  if(i<=0) return;
  [S.holdings[i], S.holdings[i-1]] = [S.holdings[i-1], S.holdings[i]];
  save(); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); toast('Moved up');
}

function moveHoldingDown(i){
  if(i>=S.holdings.length-1) return;
  [S.holdings[i], S.holdings[i+1]] = [S.holdings[i+1], S.holdings[i]];
  save(); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); toast('Moved down');
}

function openEditHolding(id){
  editingId=id;
  const h=S.holdings.find(x=>x.id===id);
  if(!h) return;
  document.getElementById('editFormGrid').innerHTML=`
    <div class="ff"><label>Name</label><input type="text" id="em-name" value="${h.name}"/></div>
    <div class="ff"><label>Ticker</label><input type="text" id="em-ticker" value="${h.ticker||''}"/></div>
    <div class="ff"><label>Type</label>
      <select id="em-type">${['stocks','isa','crypto','cash','pension','property','other'].map(t=>`<option value="${t}"${h.type===t?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="ff money-field"><label>Invested</label><input type="text" id="em-invested" value="${h.invested.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Current value</label><input type="text" id="em-current" value="${h.current.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Buy price / unit</label><input type="text" id="em-buyprice" value="${h.buyPrice ? h.buyPrice.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Shares / units</label><input type="number" id="em-shares" value="${h.shares||''}" step="any"/></div>
    <div class="ff"><label>Buy date</label><input type="date" id="em-buydate" value="${h.buyDate||''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="em-notes">${h.notes||''}</textarea></div>`;
  ['editSellPrice','editSellDate','editSellTotal'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('editModal').classList.remove('hidden');
}

function saveEditHolding(){
  const h=S.holdings.find(x=>x.id===editingId);
  if(!h) return;
  h.name    = document.getElementById('em-name').value;
  h.ticker  = (document.getElementById('em-ticker').value||'').toUpperCase();
  h.type    = document.getElementById('em-type').value;
  h.invested= parseMoney(document.getElementById('em-invested').value)||h.invested;
  h.current = parseMoney(document.getElementById('em-current').value)||h.current;
  h.buyPrice= document.getElementById('em-buyprice').value;
  h.shares  = document.getElementById('em-shares').value;
  h.buyDate = document.getElementById('em-buydate').value;
  h.notes   = document.getElementById('em-notes').value;
  save(); closeModal('editModal'); renderHoldings(); renderOverview(); toast('Saved');
}

function sellHolding(){
  const h=S.holdings.find(x=>x.id===editingId);
  if(!h) return;
  const sellPrice=document.getElementById('editSellPrice').value;
  const sellDate =document.getElementById('editSellDate').value||new Date().toISOString().split('T')[0];
  const sellTotal=parseMoney(document.getElementById('editSellTotal').value)||h.current;
  const pl=sellTotal-h.invested;
  S.closedHoldings.push({...h,sellPrice,sellDate,soldFor:sellTotal});
  S.holdings=S.holdings.filter(x=>x.id!==editingId);
  _addTx({txtype:'sell',date:sellDate,desc:`Sold ${h.name}${h.ticker?' ('+h.ticker+')':''}`,amount:sellTotal,pnl:pl,notes:`Cost: ${fmt(h.invested)} · Proceeds: ${fmt(sellTotal)}`});
  save(); closeModal('editModal'); renderHoldings(); renderClosed(); renderOverview();
  toast(`Sold ${h.name} · P&L: ${fmtS(pl)}`);
}
