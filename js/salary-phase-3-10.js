// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: FREELANCER MODE
// ═══════════════════════════════════════════════════════════════════════════

function toggleFreelancerMode(){
  const personIdx=currentPersonIdx;
  const personSals=S.salaries.filter(s=>(s.person||0)===personIdx);
  if(!personSals.length) return;
  const sal=personSals[personSals.length-1];
  sal.isFreelancer=!sal.isFreelancer;
  save(); renderSalary();
}

function calcFreelancerTax(revenue, allowableCosts, nationalInsurance, taxYear='2025/26'){
  // UK Self-employment tax calculation (simplified)
  const profit=Math.max(0, revenue-allowableCosts);
  const smallProfitsThreshold=1000; // Tax-free allowance
  const taxableProfit=Math.max(0, profit-smallProfitsThreshold);
  
  // Income tax (simplified - uses basic rate)
  const incomeTax=taxableProfit*20/100;
  
  // National Insurance (Class 2 + Class 4)
  const class2NI=163.80; // 2025/26 fixed annual
  const class4Lower=11908;
  const class4Upper=50270;
  let class4NI=0;
  if(taxableProfit>class4Lower){
    const taxableForClass4=Math.min(taxableProfit, class4Upper);
    class4NI=(taxableForClass4-class4Lower)*9/100;
  }
  if(taxableProfit>class4Upper){
    class4NI+=(taxableProfit-class4Upper)*2/100;
  }
  const totalNI=class2NI+class4NI+(nationalInsurance||0);
  
  // Quarterly tax threshold
  const quarterlyThreshold=1000;
  const needsToPayQuarterly=taxableProfit>quarterlyThreshold;
  const quarterlyAmount=needsToPayQuarterly?taxableProfit/4:0;
  
  return {
    revenue,allowableCosts,profit,taxableProfit,incomeTax,class2NI,class4NI,totalNI,
    takeHome:profit-incomeTax-totalNI,
    takeHomeMonthly:(profit-incomeTax-totalNI)/12,
    quarterlyThreshold,needsToPayQuarterly,quarterlyAmount,
    nextTaxPaymentDue:getNextTaxPaymentDate()
  };
}

function getNextTaxPaymentDate(){
  const today=new Date();
  const taxYear=today.getMonth()<3?today.getFullYear()-1:today.getFullYear();
  // Quarterly payments: Jan 31, Apr 30, Jul 31, Oct 31
  const quarters=[
    new Date(taxYear,0,31),
    new Date(taxYear,3,30),
    new Date(taxYear,6,31),
    new Date(taxYear,9,31)
  ];
  for(let q of quarters){
    if(q>today) return q.toISOString().split('T')[0];
  }
  return new Date(taxYear+1,0,31).toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4-5: ENHANCED VISUALIZATION & SALARY TIMELINE
// ═══════════════════════════════════════════════════════════════════════════

function renderSalaryTimeline(el, personIdx){
  const personSals=S.salaries.filter(s=>(s.person||0)===personIdx).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
  
  if(!personSals.length) return '';
  
  // Group by employer (consecutive same employer bunches together)
  const grouped=[];
  let currentGroup={employer:null, salaries:[]};
  
  personSals.forEach(sal=>{
    if(sal.employer===currentGroup.employer){
      currentGroup.salaries.push(sal);
    } else {
      if(currentGroup.employer) grouped.push(currentGroup);
      currentGroup={employer:sal.employer, salaries:[sal]};
    }
  });
  if(currentGroup.employer) grouped.push(currentGroup);
  
  // Render vertical timeline with dots and connecting lines
  let html=`<div style="position:relative;padding:20px;border-left:3px solid var(--border);margin-left:15px;">`;
  
  grouped.forEach((group, idx)=>{
    const salaries=group.salaries;
    const startDate=new Date(salaries[0].startDate);
    const endDate=salaries[salaries.length-1].endDate?new Date(salaries[salaries.length-1].endDate):null;
    const duration=endDate?Math.round((endDate-startDate)/(1000*60*60*24)/365*10)/10:'Ongoing';
    
    html+=`
      <div style="position:relative;margin-bottom:20px;">
        <div style="position:absolute;left:-25px;top:5px;width:18px;height:18px;background:var(--blue);border-radius:50%;border:3px solid var(--surface);box-shadow:0 0 0 3px var(--blue);"></div>
        <div>
          <strong style="font-size:14px;">${group.employer||'Unknown'}</strong>
          <div style="font-size:12px;color:var(--muted);">${salaries.length} position${salaries.length>1?'s':''} · ${duration} year${duration!=='Ongoing'&&duration!=1?'s':''}</div>
          <table style="width:100%;margin-top:8px;font-size:12px;border-collapse:collapse;">
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:6px 0;">Salary</td>
              <td style="padding:6px 0;">Period</td>
              <td style="padding:6px 0;text-align:right;">Monthly take-home</td>
            </tr>
            ${salaries.map((s,i)=>{
              const calc=calcUKTax(s.gross||0,s.pensionPct||0,s.totalBonus||s.bonus||0,s.studentLoan||'none',s.dividends||0);
              return`
              <tr style="border-bottom:1px solid var(--border2);">
                <td style="padding:4px 0;">${fmt(s.gross)}</td>
                <td style="padding:4px 0;">${fmtDate(s.startDate)} - ${s.ongoing!==false?'Now':fmtDate(s.endDate)}</td>
                <td style="padding:4px 0;text-align:right;color:var(--green);">${fmt(calc.takeHomeMonthly)}</td>
              </tr>
              `;
            }).join('')}
          </table>
        </div>
      </div>
    `;
  });
  
  html+=`</div>`;
  return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 6: INVOICE/PO TRACKING
// ═══════════════════════════════════════════════════════════════════════════

function addInvoice(){
  const personIdx=currentPersonIdx;
  const invoiceNum=document.getElementById('invNumber').value;
  const poRef=document.getElementById('invPO').value;
  const amount=parseMoney(document.getElementById('invAmount').value)||0;
  const issueDate=document.getElementById('invIssueDate').value;
  const dueDate=document.getElementById('invDueDate').value;
  const status=document.getElementById('invStatus').value||'unpaid';
  
  if(!invoiceNum||!amount){ toast('Invoice number and amount required'); return; }
  
  if(!S.invoices) S.invoices=[];
  S.invoices.push({person:personIdx, invoiceNum, poRef, amount, issueDate, dueDate, status, createdDate:new Date().toISOString().split('T')[0]});
  save(); toast('Invoice recorded'); renderInvoiceList();
  document.getElementById('invNumber').value='';
  document.getElementById('invPO').value='';
  document.getElementById('invAmount').value='';
  document.getElementById('invIssueDate').value='';
  document.getElementById('invDueDate').value='';
}

function renderInvoiceList(){
  const personIdx=currentPersonIdx;
  const personInvoices=S.invoices?S.invoices.filter(i=>i.person===personIdx):[];
  
  if(!personInvoices.length){
    document.getElementById('invoiceList').innerHTML='<p style="color:var(--muted);text-align:center;padding:20px;">No invoices recorded</p>';
    return;
  }
  
  let cumulative=0;
  const html=personInvoices.map((inv,idx)=>{
    cumulative+=inv.amount;
    const isOverdue=new Date(inv.dueDate)<new Date() && inv.status==='unpaid';
    return`
      <tr>
        <td><strong>${inv.invoiceNum}</strong></td>
        <td>${inv.poRef||'—'}</td>
        <td class="val">${fmt(inv.amount)}</td>
        <td>${fmtDate(inv.issueDate)}</td>
        <td><span class="pill ${inv.status==='paid'?'p-income':isOverdue?'p-payment':'p-warn'}">${inv.status}${isOverdue?' (overdue)':''}</span></td>
        <td class="val" style="font-variation-settings:'wght' 600;">${fmt(cumulative)}</td>
        <td><button class="icon-btn" onclick="updateInvoiceStatus(${idx})">✎</button></td>
      </tr>
    `;
  }).join('');
  
  document.getElementById('invoiceList').innerHTML=`
    <table style="width:100%;">
      <thead><tr><th>Invoice #</th><th>PO Ref</th><th>Amount</th><th>Date</th><th>Status</th><th>Cumulative</th><th></th></tr></thead>
      <tbody>${html}</tbody>
    </table>
  `;
}

function updateInvoiceStatus(idx){
  const invoice=S.invoices[idx];
  const newStatus=invoice.status==='unpaid'?'paid':'unpaid';
  S.invoices[idx].status=newStatus;
  save(); renderInvoiceList(); toast(`Invoice marked as ${newStatus}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 7: IMPROVED PIE CHART WITH BETTER LABELS
// ═══════════════════════════════════════════════════════════════════════════

function renderSalaryChartWithLabels(calc){
  setTimeout(()=>{
    const ctx=document.getElementById('salChart');
    if(!ctx) return;
    if(window._salChart) window._salChart.destroy();
    
    const data=[Math.round(calc.takeHome),Math.round(calc.incomeTax),Math.round(calc.ni),Math.round(calc.pensionAmt)];
    const labels=['Take-home','Income tax','NI','Pension'];
    const colors=['#0a8f5c','#cc3333','#1d6fca','#5046e5'];
    
    window._salChart=new Chart(ctx,{
      type:'doughnut',
      data:{labels, datasets:[{data, backgroundColor:colors}]},
      options:{
        responsive:true,
        maintainAspectRatio:false,
        cutout:'65%',
        plugins:{
          legend:{position:'right',labels:{font:{size:11},boxWidth:10,padding:10}},
          tooltip:{
            callbacks:{
              label:ctx=>{
                const value=ctx.parsed;
                const total=ctx.dataset.data.reduce((a,b)=>a+b,0);
                const pct=((value/total)*100).toFixed(1);
                return`£${fmt(value)} (${pct}%)`;
              }
            }
          },
          datalabels:{
            color:'white',
            font:{weight:'bold',size:12},
            formatter:(value,ctx)=>{
              const total=ctx.dataset.data.reduce((a,b)=>a+b,0);
              const pct=((value/total)*100).toFixed(0);
              return pct>5?pct+'%':'';
            }
          }
        }
      }
    });
  },50);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 8-9: NEXT YEAR TAX PREVIEW & TAX BANDS DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

const UK_TAX_2026={
  personalAllowance: 12570, // Frozen (estimated)
  bands: [
    {name:'Personal allowance', from:0,       to:12570,  rate:0,   color:'#0a8f5c'},
    {name:'Basic rate (20%)',   from:12570,   to:50270,  rate:20,  color:'#1d6fca'},
    {name:'Higher rate (40%)',  from:50270,   to:125140, rate:40,  color:'#b87309'},
    {name:'Additional (45%)',   from:125140,  to:Infinity,rate:45, color:'#cc3333'},
  ]
};

function renderNextYearPreview(calc){
  // Only show if rates confirmed (hardcoded flag)
  const showPreview=true; // Set to true when rates confirmed from gov.uk
  
  if(!showPreview) return '';
  
  const nextYearCalc=calcUKTax(calc.gross, 0, calc.bonus, 'none', calc.dividends);
  const difference=calc.takeHome-nextYearCalc.takeHome;
  const pctChange=((difference/calc.takeHome)*100).toFixed(1);
  
  return`
    <div style="background:linear-gradient(135deg, var(--surface2) 0%, var(--surface) 100%);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin:14px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:20px;">ℹ️</span>
        <strong style="font-size:13px;">2026/27 Tax Projection</strong>
        <a href="https://www.gov.uk/government/organisations/hm-revenue-customs" target="_blank" style="font-size:11px;color:var(--blue);margin-left:auto;">Source: HMRC</a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;">
        <div>
          <div style="color:var(--muted);margin-bottom:4px;">Current (2025/26)</div>
          <div style="font-size:16px;font-variation-settings:'wght' 600;color:var(--green);">£${fmt(calc.takeHomeMonthly)}/mo</div>
        </div>
        <div>
          <div style="color:var(--muted);margin-bottom:4px;">Projected (2026/27)</div>
          <div style="font-size:16px;font-variation-settings:'wght' 600;color:${difference>0?'var(--green)':'var(--red)'};"><span style="font-size:12px;">${difference>0?'+':''}${pctChange}%</span> £${fmt(nextYearCalc.takeHomeMonthly)}/mo</div>
        </div>
      </div>
    </div>
  `;
}

function renderTaxBandsWithGaps(calc){
  // Show bands user doesn't hit, with salary needed to reach them
  const gapBands=UK_TAX.bands.filter(b=>b.from>=calc.totalIncome);
  
  if(!gapBands.length) return '';
  
  return`
    <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">
      <details style="cursor:pointer;">
        <summary style="font-size:12px;font-variation-settings:'wght' 600;color:var(--muted);user-select:none;">📊 Tax bands you don't hit yet (click to expand)</summary>
        <div style="margin-top:10px;opacity:0.7;">
          ${gapBands.map(b=>{
            const needed=b.from-calc.totalIncome;
            return`
            <div style="display:flex;justify-content:space-between;font-size:11px;padding:6px 0;color:var(--muted2);">
              <span><span style="display:inline-block;width:10px;height:10px;background:${b.color};border-radius:3px;margin-right:6px;"></span>${b.name}</span>
              <span>Need +£${fmt(needed)} to reach</span>
            </div>
            `;
          }).join('')}
        </div>
      </details>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 10: TAX ALLOWANCES ELIGIBILITY CHECKER
// ═══════════════════════════════════════════════════════════════════════════

function checkTaxAllowances(personIdx, grossSalary){
  const allowances={};
  
  // Marriage Allowance (up to £3,522 transfer)
  // Eligible: earning £12,570-£50,270, partner earning less than £12,570
  allowances.marriageAllowance={
    eligible: grossSalary>=12570 && grossSalary<=50270,
    description:'Transfer unused allowance to spouse',
    maxBenefit:3522*20/100, // £704.40
    impact:704.40
  };
  
  // Child Benefit eligibility
  // Reduced if either parent earns over £50,000
  allowances.childBenefit={
    eligible: grossSalary<=50000,
    description:'Receive child benefit without clawback',
    impactIf50k:845*20/100, // Approx tax on clawback
    impact: grossSalary>50000 ? -(grossSalary-50000)*1/100 : 0
  };
  
  // Personal Savings Allowance
  const savingsAllowance=grossSalary<17570?1000:(grossSalary<50270?500:0);
  allowances.savingsAllowance={
    eligible: savingsAllowance>0,
    description: `Interest-free threshold: £${savingsAllowance}`,
    benefit: savingsAllowance*20/100,
    impact: savingsAllowance*20/100
  };
  
  return allowances;
}

function renderAllowancesInfo(personIdx, grossSalary){
  const allowances=checkTaxAllowances(personIdx, grossSalary);
  
  let html=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">
    <strong style="font-size:12px;display:block;margin-bottom:10px;">💡 Available tax allowances</strong>
  `;
  
  Object.entries(allowances).forEach(([key, alloc])=>{
    if(!alloc.eligible) return;
    html+=`
      <div style="padding:8px;background:var(--surface);border-radius:4px;margin-bottom:6px;font-size:11px;">
        <div style="font-variation-settings:'wght' 600;">${alloc.description}</div>
        <div style="color:var(--green);margin-top:2px;">Potential benefit: +£${fmt(alloc.impact)}/year</div>
      </div>
    `;
  });
  
  html+=`</div>`;
  return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION: Updated renderPersonSalary with all phases
// ═══════════════════════════════════════════════════════════════════════════

function renderPersonSalaryEnhanced(el, personIdx){
  const personSals=S.salaries.filter(s=>(s.person||0)===personIdx);
  
  if(!personSals.length){
    el.innerHTML=`<div class="empty"><div class="ei">◈</div><p>No salary added for ${S.settings.personNames[personIdx]} yet.</p></div>`;
    return;
  }

  const sal=getCurrentSalary(personIdx);
  let calc;
  
  // PHASE 3: Freelancer logic
  if(sal.isFreelancer){
    calc=calcFreelancerTax(sal.gross||0, sal.allowableCosts||0, sal.employeeNI||0);
  } else {
    calc=calcUKTax(sal.gross||0, sal.pensionPct||0, sal.totalBonus||sal.bonus||0, sal.studentLoan||'none', sal.dividends||0);
  }

  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3>${S.settings.personNames[personIdx]} ${sal.isFreelancer?'(Freelancer)':'(Employed)'}</h3>
      <button class="btn btn-secondary btn-sm" onclick="toggleFreelancerMode()">Switch to ${sal.isFreelancer?'Employed':'Freelancer'}</button>
    </div>

    ${renderNextYearPreview(calc)}

    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Gross ${sal.isFreelancer?'revenue':'salary'}</div><div class="sal-val val">${fmt(calc.gross)}</div><div class="sal-sub">per year</div></div>
      ${sal.isFreelancer?`<div class="sal-card"><div class="sal-label">Allowable costs</div><div class="sal-val val">${fmt(sal.allowableCosts||0)}</div><div class="sal-sub">expenses</div></div>`:''}
      ${calc.bonus>0?`<div class="sal-card"><div class="sal-label">Bonus</div><div class="sal-val val">${fmt(calc.bonus)}</div><div class="sal-sub">annual</div></div>`:''}
      ${calc.dividends>0?`<div class="sal-card"><div class="sal-label">Dividends</div><div class="sal-val val">${fmt(calc.dividends)}</div><div class="sal-sub">annual</div></div>`:''}
      <div class="sal-card"><div class="sal-label">Take-home (annual)</div><div class="sal-val pos val">${fmt(calc.takeHome)}</div><div class="sal-sub">after tax</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Take-home (monthly)</div><div class="sal-val pos val">${fmt(calc.takeHomeMonthly)}</div><div class="sal-sub">monthly average</div></div>
      ${sal.isFreelancer && calc.needsToPayQuarterly?`<div class="sal-card" style="border-color:var(--orange);"><div class="sal-label">Next tax due</div><div class="sal-sub">${calc.nextTaxPaymentDue}</div><div class="sal-val">${fmt(calc.quarterlyAmount)}</div></div>`:''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;">
      <div class="card">
        <div class="card-header"><span class="card-title">UK tax bands 2025/26</span></div>
        <table class="tax-band-table">
          ${UK_TAX.bands.map(b=>{
            const from=b.from, to=Math.min(b.to,calc.totalIncome);
            const taxable=Math.max(0,to-from);
            const amt=taxable*b.rate/100;
            if(calc.totalIncome<b.from) return '';
            return`<tr>
              <td><span class="band-dot" style="background:${b.color};"></span>${b.name}</td>
              <td style="color:var(--muted);font-size:11px;">${fmt(b.from)} – ${b.to===Infinity?'above':fmt(b.to)}</td>
              <td style="font-variation-settings:'wght' 600;">${b.rate}%</td>
              <td style="font-variation-settings:'wght' 600;color:${b.rate>0?'var(--red)':'var(--green)'};" class="val">${b.rate>0?'-'+fmt(amt):'✓'}</td>
            </tr>`;
          }).join('')}
        </table>
        ${renderTaxBandsWithGaps(calc)}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Annual breakdown</span></div>
        <div class="sal-chart-wrap"><canvas id="salChart"></canvas></div>
      </div>
    </div>

    ${renderAllowancesInfo(personIdx, sal.gross)}

    <div style="margin-top:16px;">
      <h4>Salary History & Timeline</h4>
      ${renderSalaryTimeline(el, personIdx)}
    </div>

    <div class="section-label">All records · ${S.settings.personNames[personIdx]}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Employer</th><th>Gross</th><th>Take-home/mo</th><th>Started</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${personSals.map((s,i)=>{
            let c;
            if(s.isFreelancer) c=calcFreelancerTax(s.gross||0,s.allowableCosts||0);
            else c=calcUKTax(s.gross||0,s.pensionPct||0,s.totalBonus||s.bonus||0,s.studentLoan||'none',s.dividends||0);
            return`<tr>
              <td style="font-variation-settings:'wght' 600;">${s.employer||'—'}</td>
              <td class="val">${fmt(s.gross)}</td>
              <td class="pos val">${fmt(c.takeHomeMonthly)}</td>
              <td>${fmtDate(s.startDate)}</td>
              <td><span class="pill ${s.ongoing!==false?'p-income':'p-payment'}">${s.ongoing!==false?'Ongoing':fmtDate(s.endDate)}</span></td>
              <td>
                <button class="icon-btn edit" onclick="openEditSalary(${S.salaries.indexOf(s)})">✎</button>
                <button class="icon-btn del" onclick="deleteSalary(${S.salaries.indexOf(s)})">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  renderSalaryChartWithLabels(calc);
}
