// ═══════════════════════════════════════════════════════════════════════════
// PHASE 6: INVOICE & PO TRACKING FOR FREELANCERS
// ═══════════════════════════════════════════════════════════════════════════

function initInvoiceSystem(){
  if(!S.invoices) S.invoices=[];
}

function addInvoice(){
  initInvoiceSystem();
  const personIdx=currentPersonIdx;
  const invoiceNum=(document.getElementById('invNumber').value||'').trim();
  const poRef=(document.getElementById('invPO').value||'').trim();
  const amount=parseMoney(document.getElementById('invAmount').value)||0;
  const issueDate=document.getElementById('invIssueDate').value;
  const dueDate=document.getElementById('invDueDate').value;
  const status=document.getElementById('invStatus').value||'unpaid';
  const notes=(document.getElementById('invNotes').value||'').trim();
  
  if(!invoiceNum||!amount){ toast('Invoice number and amount required'); return; }
  
  S.invoices.push({
    person:personIdx,
    invoiceNum,
    poRef,
    amount,
    issueDate,
    dueDate,
    status,
    notes,
    createdDate:new Date().toISOString().split('T')[0]
  });
  
  save();
  toast('Invoice recorded');
  document.getElementById('invNumber').value='';
  document.getElementById('invPO').value='';
  document.getElementById('invAmount').value='';
  document.getElementById('invIssueDate').value='';
  document.getElementById('invDueDate').value='';
  document.getElementById('invNotes').value='';
  document.getElementById('invStatus').value='unpaid';
  renderInvoiceList();
}

function renderInvoiceList(){
  initInvoiceSystem();
  const personIdx=currentPersonIdx;
  const personInvoices=(S.invoices||[]).filter(i=>i.person===personIdx).sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate));
  
  if(!personInvoices.length){
    document.getElementById('invoiceList').innerHTML='<div style="text-align:center;padding:20px;color:var(--muted);">No invoices recorded</div>';
    return;
  }
  
  let cumulativeTotal=0;
  let paidTotal=0;
  const rows=personInvoices.map((inv,idx)=>{
    cumulativeTotal+=inv.amount;
    if(inv.status==='paid') paidTotal+=inv.amount;
    
    const isOverdue=inv.dueDate && new Date(inv.dueDate)<new Date() && inv.status==='unpaid';
    const isPaid=inv.status==='paid';
    
    return`
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:10px;font-variation-settings:'wght' 600;">${inv.invoiceNum}</td>
        <td style="padding:10px;">${inv.poRef||'—'}</td>
        <td style="padding:10px;text-align:right;color:var(--green);">${fmt(inv.amount)}</td>
        <td style="padding:10px;font-size:12px;color:var(--muted);">${fmtDate(inv.issueDate)}</td>
        <td style="padding:10px;"><span class="pill ${isPaid?'p-income':isOverdue?'p-payment':'p-warn'}" style="font-size:11px;">${inv.status}${isOverdue?' (overdue)':''}</span></td>
        <td style="padding:10px;text-align:right;font-variation-settings:'wght' 600;">${fmt(cumulativeTotal)}</td>
        <td style="padding:10px;"><button class="icon-btn" onclick="toggleInvoiceStatus(${idx})" title="Toggle paid/unpaid">${isPaid?'✓':'✕'}</button></td>
      </tr>
    `;
  }).join('');
  
  const pendingTotal=cumulativeTotal-paidTotal;
  const html=`
    <div style="margin-bottom:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
      <div class="sal-card">
        <div class="sal-label">Total invoiced</div>
        <div class="sal-val val">${fmt(cumulativeTotal)}</div>
        <div class="sal-sub">all time</div>
      </div>
      <div class="sal-card" style="border-color:var(--green);">
        <div class="sal-label">Paid</div>
        <div class="sal-val pos val">${fmt(paidTotal)}</div>
        <div class="sal-sub">${personInvoices.filter(i=>i.status==='paid').length} invoices</div>
      </div>
      <div class="sal-card" style="border-color:var(--orange);">
        <div class="sal-label">Pending</div>
        <div class="sal-val val">${fmt(pendingTotal)}</div>
        <div class="sal-sub">${personInvoices.filter(i=>i.status!=='paid').length} unpaid</div>
      </div>
    </div>
    <div class="table-wrap">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid var(--border);">
          <th style="padding:10px;text-align:left;">Invoice</th>
          <th style="padding:10px;text-align:left;">PO</th>
          <th style="padding:10px;text-align:right;">Amount</th>
          <th style="padding:10px;text-align:left;">Issued</th>
          <th style="padding:10px;text-align:left;">Status</th>
          <th style="padding:10px;text-align:right;">Cumulative</th>
          <th style="padding:10px;"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  
  document.getElementById('invoiceList').innerHTML=html;
}

function toggleInvoiceStatus(idx){
  initInvoiceSystem();
  const invoice=S.invoices[idx];
  invoice.status=invoice.status==='paid'?'unpaid':'paid';
  save();
  renderInvoiceList();
  toast(`Invoice marked as ${invoice.status}`);
}

function deleteInvoice(idx){
  initInvoiceSystem();
  if(confirm('Delete this invoice record?')){
    S.invoices.splice(idx,1);
    save();
    renderInvoiceList();
    toast('Invoice deleted');
  }
}
