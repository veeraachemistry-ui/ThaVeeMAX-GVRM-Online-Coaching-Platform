const $=id=>document.getElementById(id);const STORE='gvrm_lms_data_v1';const seed={Students:[{name:'Arun Kumar',group:'Grade 10',status:'Active'},{name:'Meena S',group:'Grade 9',status:'Active'},{name:'Rahul P',group:'Grade 11',status:'Active'}],Courses:[{name:'Chemistry Fundamentals',group:'Chemistry',status:'Published'},{name:'Mathematics Mastery',group:'Mathematics',status:'Published'}],Assignments:[{name:'Periodic Table Worksheet',group:'Grade 11',status:'Due soon'}],'Exams & Results':[{name:'Unit Test 1',group:'Grade 10',status:'Scheduled'}],Attendance:[{name:'Today attendance',group:'All classes',status:'Not marked'}],Timetable:[{name:'Chemistry â€¢ 10:00 AM',group:'Grade 11',status:'Monday'}],Fees:[{name:'Term 1 fee',group:'Student accounts',status:'Pending'}],Announcements:[{name:'Welcome to GVRM LMS',group:'All users',status:'Published'}],Reports:[], 'Cloud Sync':[],Settings:[]};let db;try{db=JSON.parse(localStorage.getItem(STORE))||seed}catch{db=seed}Object.keys(seed).forEach(k=>{if(!db[k])db[k]=seed[k]});const save=()=>localStorage.setItem(STORE,JSON.stringify(db));const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let current='Overview';$('themeToggle').onclick=$('topTheme').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('gvrm-theme',document.body.classList.contains('dark')?'dark':'light')};if(localStorage.getItem('gvrm-theme')==='dark')document.body.classList.add('dark');$('showPassword').onclick=()=>{$('password').type=$('password').type==='password'?'text':'password'};document.querySelectorAll('.rail-role[data-role]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.rail-role').forEach(x=>x.classList.toggle('active',x===btn));$('role').value=btn.dataset.role;$('loginMessage').textContent='Selected role: '+btn.dataset.role;}));$('role').addEventListener('change',()=>{document.querySelectorAll('.rail-role').forEach(x=>x.classList.toggle('active',x.dataset.role===$('role').value));});$('forgotBtn').onclick=()=>{$('loginMessage').textContent='Password reset requires a configured cloud authentication service.'};$('loginForm').onsubmit=async e=>{
e.preventDefault();
const email=$('email').value.trim();
const password=$('password').value;
const message=$('loginMessage');
message.textContent='Connecting to G.V.R.M. CLOUD LMS...';
try {
const response=await fetch('https://gvrm-cloud-lms-backend.onrender.com/auth/login',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({email,password})
});
const data=await response.json();
if(!response.ok || !data.token || !data.user) {
throw new Error(data.message||data.error||'Login failed. Check credentials and account status.');
}
localStorage.setItem('gvrm_lms_token',data.token);
localStorage.setItem('gvrm_demo_user',JSON.stringify(data.user));
$('dashRole').textContent=data.user.role||'User';
$('greeting').textContent=data.user.name||data.user.email;
$('dashAvatar').textContent=(data.user.name||data.user.email||'U')[0].toUpperCase();
$('loginView').classList.add('hidden');
$('dashboardView').classList.remove('hidden');
$('dashMessage').textContent='Backend login successful.';
render('Overview');
} catch(err) {
message.textContent=err.message||'Could not connect to the login service.';
}
};$('logoutBtn').onclick=()=>{$('dashboardView').classList.add('hidden');$('loginView').classList.remove('hidden');$('password').value=''};document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>render(b.dataset.page));function stat(icon,label,value,tint){return `<div class="stat" style="--tint:${tint}"><div class="ico">${icon}</div><small>${label}</small><strong>${value}</strong></div>`}function render(page){current=page;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('pageTitle').textContent=page==='Overview'?'Your overview':page;$('pageContent').innerHTML=page==='Overview'?overview():page==='Cloud Sync'?syncPage():page==='Subscription'?subscriptionPage():page==='Settings'?settingsPage():tablePage(page);wirePage(page)}function overview(){return `<div class="stats">${stat('','Students',db.Students.length,'#d9efff')}${stat('','Courses',db.Courses.length,'#e7ddff')}${stat('','Assignments',db.Assignments.length,'#ffe7d1')}${stat('','Announcements',db.Announcements.length,'#d8fff0')}</div><div class="section-head"><h3>Quick actions</h3><span class="offline-pill">Saved on this device</span></div><div class="panel"><div class="quick-grid">${[['ST','Students'],['CO','Courses'],['AS','Assignments'],['EX','Exams & Results'],['AT','Attendance'],['AN','Announcements']].map(([i,p],n)=>`<button class="quick" data-quick="${p}" style="--qbg:${['#e3f3ff','#eee7ff','#fff0df','#ffe7ef','#ddfff1','#e5f8ff'][n]}"><span>${p}</span></button>`).join('')}</div></div><div class="panel-grid"><div class="panel"><h3>Recent activity</h3><div class="activity"><div class="dot">CO</div><span>Course workspace ready</span></div><div class="activity"><div class="dot">CL</div><span>Cloud sync connection available</span></div><div class="activity"><div class="dot">OK</div><span>Demo records are stored on this device</span></div></div><div class="panel"><h3>Learning at a glance</h3><p style="font-size:12px;color:#7b8da8;line-height:1.8">Manage students, course materials, assignments, exams, attendance and notices from one workspace. Demo records are saved locally in this Windows user profile.</p><button class="primary-small" data-quick="Settings">Configure workspace</button></div></div>`}function subscriptionPage(){const plans=[{id:'teacher',icon:'ðŸ‘©â€ðŸ«',name:'Teacher Plan',price:'â‚¹499',audience:'For individual teachers',color:'#e3f3ff',features:['Personal teaching workspace','Courses and learning materials','Assignments and assessments','Student progress overview']},{id:'institution',icon:'ðŸ«',name:'Institution Plan',price:'â‚¹999',audience:'For schools and colleges',color:'#eee7ff',features:['Institution workspace','Teacher and student coordination','Assignments and announcements','Academic overview and reports']},{id:'coaching',icon:'ðŸŽ¯',name:'Coaching Centre Plan',price:'â‚¹1,999',audience:'For NEET/JEE and coaching centres',color:'#fff0df',features:['Coaching centre workspace','Batch and course organisation','Tests and assignments','Student progress overview']}];return `<div class="subscription-intro"><span class="eyebrow">FLEXIBLE PLANS FOR EVERY LEARNING TEAM</span><h2>Choose your GVRM LMS plan</h2><p>Pick a plan that fits your teaching or institution needs.</p><div class="subscription-period">Subscription pricing shown per month Â· Secure recurring subscription checkout</div></div><div class="subscription-grid">${plans.map(p=>`<article class="subscription-card" style="--plan-tint:${p.color}"><div class="plan-icon">${p.icon}</div><h3>${p.name}</h3><p class="plan-audience">${p.audience}</p><div class="plan-price">${p.price}<small>/ month</small></div><ul>${p.features.map(f=>`<li>âœ“ ${f}</li>`).join('')}</ul><button class="plan-button" data-plan="${p.id}">Choose ${p.name.replace(' Plan','')}</button><small class="plan-note">Monthly recurring plan Â· Secure checkout</small></article>`).join('')}</div><div class="panel upi-panel"><h3>ðŸ“² Pay manually using UPI QR</h3><p>Select a plan above, scan this QR using any UPI app, pay the exact amount, then submit your UTR/reference number for admin verification.</p><div class="upi-pay-layout"><img class="upi-qr" src="assets/gvrm-upi-qr.png" alt="G.V.R.M. UPI payment QR"><div class="upi-form"><label for="upiPlan">Subscription plan</label><select id="upiPlan"><option value="teacher">Teacher â€” â‚¹499/month</option><option value="institution">Institution â€” â‚¹999/month</option><option value="coaching">Coaching Centre â€” â‚¹1,999/month</option></select><label for="upiPayerName">Payer name</label><input id="upiPayerName" placeholder="Name shown in payment app" maxlength="120"><label for="upiUtr">UPI UTR / transaction reference</label><input id="upiUtr" placeholder="Enter transaction reference" maxlength="100" required><label for="upiNotes">Optional note</label><input id="upiNotes" placeholder="Institution / coaching centre name" maxlength="200"><button id="submitUpi" class="primary-btn" type="button">Submit payment for review â†’</button><div id="upiMessage" class="message" aria-live="polite"></div></div></div><p class="plan-note">Payment is not confirmed automatically from this QR. Access is activated only after the administrator verifies the payment.</p></div><div class="panel subscription-foot"><h3>ðŸ”’ Secure subscription activation</h3><p>Payments use the configured Razorpay subscription backend. Do not grant paid access until signed provider webhooks confirm activation. The API must be secured with real user authentication before production use.</p><div id="subscriptionMessage" class="message" aria-live="polite"></div></div>`}function tablePage(page){let rows=db[page]||[];let fields=page==='Students'?['name','group','status']:['name','group','status'];let placeholder=page==='Students'?'Student name':page==='Courses'?'Course name':page==='Assignments'?'Assignment title':page==='Exams & Results'?'Exam name':page==='Attendance'?'Attendance entry':page==='Timetable'?'Class / subject and time':page==='Fees'?'Fee item':page==='Announcements'?'Announcement title':'Report name';return `<div class="section-head"><h3>${page} workspace</h3><button class="primary-small" id="addRecord">ï¼‹ Add ${page==='Students'?'student':page==='Courses'?'course':'record'}</button></div><div class="panel"><div class="field-row"><input id="recordName" placeholder="${placeholder}"><input id="recordGroup" placeholder="Class / category"><select id="recordStatus"><option>Active</option><option>Draft</option><option>Published</option><option>Pending</option><option>Scheduled</option><option>Completed</option></select><button class="primary-small" id="saveRecord">Save record</button></div><p style="font-size:10px;color:#8292ab">Local demo data only. Production-grade permissions and cloud storage are not configured.</p></div><div class="table-wrap" style="margin-top:15px"><table><thead><tr><th>#</th><th>Name / Title</th><th>Class / Category</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.group)}</td><td><span class="offline-pill">${escapeHtml(r.status)}</span></td><td><button class="action-btn" data-delete="${i}">Delete</button></td></tr>`).join(''):`<tr><td colspan="5" class="empty">No records yet. Add your first record above.</td></tr>`}</tbody></table></div>`}function syncPage(){return `<div class="stats">${stat('DATABASE','Local records',Object.values(db).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0),'#d9efff')}${stat('STATUS','Sync status','Offline','#e7ddff')}${stat('PENDING','Pending sync','--','#ffe7d1')}${stat('POLICY','Conflict policy','Server required','#d8fff0')}</div><div class="panel"><h3>Cloud synchronisation settings</h3><p style="font-size:12px;color:#7386a3;line-height:1.8">Enter your deployed HTTPS API endpoint. Cloud sync requires authentication and conflict-safe implementation.</p><label>Cloud API URL</label><input id="apiUrl" placeholder="https://your-api.example.com" style="width:100%;padding:12px;border:1px solid #dbe6f5;border-radius:10px;margin:8px 0 12px" value="${escapeHtml(localStorage.getItem('gvrm_api_url')||'')}"><label>Access token</label><input id="apiToken" type="password" placeholder="Paste access token" style="width:100%;padding:12px;border:1px solid #dbe6f5;border-radius:10px;margin:8px 0 12px" value="${escapeHtml(localStorage.getItem('gvrm_api_token')||'')}"><div class="field-row"><button class="primary-small" id="saveCloud">Save settings</button><button class="action-btn" id="syncNow">Test connection</button></div><div id="syncResult" class="message"></div><div class="field-row" style="margin-top:12px"><button class="primary-small" id="testPush">Test Push</button><button class="action-btn" id="testPull">Test Pull</button></div><p style="font-size:10px;color:#ba6a3d">Do not enter real student information until authentication, backups and sync conflict handling are tested.</p></div>`}function settingsPage(){return `<div class="settings-grid"><div class="setting"><h3>ðŸŽ¨ Appearance</h3><p>Switch between colourful light and dark theme.</p><button class="primary-small" id="settingsTheme">Toggle theme</button></div><div class="setting"><h3>ðŸ’¾ Local data</h3><p>Export a JSON backup of this demo's local records.</p><button class="primary-small" id="exportData">Export backup</button></div><div class="setting"><h3>ðŸ“¦ Restore demo</h3><p>Replace local records with sample data. Existing local demo records will be overwritten.</p><button class="action-btn" id="resetData">Restore sample data</button></div><div class="setting"><h3>ðŸ” Security</h3><p>Login is currently a UI demo. Production use requires a secure authentication API, hashed passwords, server-side role checks and audit logs.</p></div></div>`}function wirePage(page){document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>render(b.dataset.quick));if(page==='Overview')return;if(page==='Subscription'){document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=async()=>{const planKey=b.dataset.plan;const names={teacher:'Teacher Plan â€” â‚¹499/month',institution:'Institution Plan â€” â‚¹999/month',coaching:'Coaching Centre Plan â€” â‚¹1,999/month'};const message=$('subscriptionMessage');const api=(localStorage.getItem('gvrm_api_url')||'').trim().replace(/\/$/,'');const user=(()=>{try{return JSON.parse(localStorage.getItem('gvrm_demo_user')||'{}')}catch{return {}}})();if(!api){message.textContent='Payment backend URL is not configured. Deploy cloud-api, then set its HTTPS URL in Cloud Sync settings.';return}if(!user.email||!user.email.includes('@')){message.textContent='Please sign in with the account email that should own this subscription.';return}b.disabled=true;message.textContent='Connecting securely to the payment serviceâ€¦';try{const r=await fetch(api+'/api/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({planKey,email:user.email})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not create subscription');if(!window.Razorpay){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>reject(new Error('Could not load payment checkout. Check internet connection.'));document.head.appendChild(script)})}const checkout=new window.Razorpay({key:data.keyId,subscription_id:data.subscriptionId,name:'G.V.R.M. SOLUTIONS',description:names[planKey],image:'assets/gvrm-solutions-logo.jpg',prefill:{email:data.email},theme:{color:'#2563eb'},handler:async response=>{message.textContent='Payment response received. Verifying signatureâ€¦';try{const vr=await fetch(api+'/api/subscriptions/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(response)});const result=await vr.json();if(!vr.ok||!result.verified)throw new Error(result.error||'Verification failed');localStorage.setItem('gvrm_selected_plan',planKey);message.textContent='Checkout signature verified. Subscription activation will be confirmed by the payment provider webhook.'}catch(err){message.textContent='Could not verify payment: '+err.message+' Contact support before retrying.'}},modal:{ondismiss:()=>{message.textContent='Checkout closed. No activation was granted.'}}});checkout.on('payment.failed',response=>{message.textContent='Payment failed: '+(response.error?.description||'Please try again.')});checkout.open()}catch(err){message.textContent='Payment not started: '+err.message}finally{b.disabled=false}});const upiSubmit=$('submitUpi');if(upiSubmit)upiSubmit.onclick=async()=>{const msg=$('upiMessage');const api=(localStorage.getItem('gvrm_api_url')||'').trim().replace(/\/$/,'');const user=(()=>{try{return JSON.parse(localStorage.getItem('gvrm_demo_user')||'{}')}catch{return {}}})();const utr=$('upiUtr').value.trim();if(!api){msg.textContent='Cloud API URL is not configured. Configure it in Settings before submitting.';return}if(!user.email||!user.email.includes('@')){msg.textContent='Please sign in with your email first.';return}if(utr.length<8){msg.textContent='Enter a valid UTR / transaction reference (at least 8 characters).';return}upiSubmit.disabled=true;msg.textContent='Submitting for administrator reviewâ€¦';try{const r=await fetch(api+'/api/upi-payment-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,planKey:$('upiPlan').value,utr,payerName:$('upiPayerName').value.trim(),notes:$('upiNotes').value.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Submission failed');msg.textContent='Submitted successfully. Request ID: '+d.requestId+'. Subscription stays pending until admin verifies the payment.';$('upiUtr').value=''}catch(e){msg.textContent='Could not submit: '+e.message}finally{upiSubmit.disabled=false}};return;}if(page==='Settings'){$('settingsTheme').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('gvrm-theme',document.body.classList.contains('dark')?'dark':'light')};$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gvrm-lms-local-backup.json';a.click();URL.revokeObjectURL(a.href)};$('resetData').onclick=()=>{if(confirm('Replace local demo records with sample data?')){db=JSON.parse(JSON.stringify(seed));save();render('Settings')}};return}if(page==='Cloud Sync'){
$('saveCloud').onclick=()=>{
const url=$('apiUrl').value.trim().replace(/\/+$/,'');
localStorage.setItem('gvrm_api_url',url);
const token=localStorage.getItem('gvrm_lms_token')||'';
$('apiToken').value=token;
localStorage.setItem('gvrm_api_token',token);
$('syncResult').textContent=token?'Settings saved. Login token found. Click Test connection.':'Settings saved, but no login token found. Please log in again.';
};
$('syncNow').onclick=async()=>{
const url=$('apiUrl').value.trim().replace(/\/+$/,'');
const token=localStorage.getItem('gvrm_lms_token')||$('apiToken').value.trim();
if(!url){$('syncResult').textContent='Enter the backend URL first.';return}
if(!token){$('syncResult').textContent='Login token not found. Please log in again.';return}
$('syncResult').textContent='Testing authenticated backend connection...';
try{
const r=await fetch(url+'/me',{headers:{Authorization:'Bearer '+token}});
const data=await r.json();
if(!r.ok)throw new Error(data.message||data.error||('HTTP '+r.status));
$('syncResult').textContent='Authenticated connection successful. User: '+(data.user?.email||'verified')+'. Cloud data sync has not yet been tested.';
}catch(e){
$('syncResult').textContent='Connection failed: '+(e.message||'Check backend URL, token and CORS.');
}
};
$('testPush').onclick=async()=>{
const url=$('apiUrl').value.trim().replace(/\/+$/,'');
const token=localStorage.getItem('gvrm_lms_token')||$('apiToken').value.trim();
const result=$('syncResult');
if(!url||!token){result.textContent='Enter the API URL and sign in again before testing.';return}
const id='frontend-test-'+Date.now();
$('testPush').disabled=true;
result.textContent='Sending a separate test record to Cloud...';
try{
const r=await fetch(url+'/sync/push',{
method:'POST',
headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
body:JSON.stringify({records:[{recordType:'connection_test',recordId:id,data:{purpose:'frontend_sync_test',message:'Safe test record only'},updatedAt:new Date().toISOString()}]})
});
const d=await r.json();
if(!r.ok||d.ok!==true)throw new Error(d.error||d.message||('HTTP '+r.status));
localStorage.setItem('gvrm_lms_last_test_record',id);
result.textContent='Test Push successful. Cloud saved '+(d.saved??1)+' test record(s). Local LMS records were not changed.';
}catch(e){result.textContent='Test Push failed: '+e.message}
finally{$('testPush').disabled=false}
};
$('testPull').onclick=async()=>{
const url=$('apiUrl').value.trim().replace(/\/+$/,'');
const token=localStorage.getItem('gvrm_lms_token')||$('apiToken').value.trim();
const result=$('syncResult');
if(!url||!token){result.textContent='Enter the API URL and sign in again before testing.';return}
$('testPull').disabled=true;
result.textContent='Reading records from Cloud...';
try{
const r=await fetch(url+'/sync/pull',{headers:{Authorization:'Bearer '+token}});
const d=await r.json();
if(!r.ok||d.ok!==true)throw new Error(d.error||d.message||('HTTP '+r.status));
const rows=Array.isArray(d.records)?d.records:[];
const id=localStorage.getItem('gvrm_lms_last_test_record');
const found=id&&rows.some(x=>x.record_id===id||x.recordId===id);
result.textContent='Test Pull successful. Cloud returned '+rows.length+' record(s). '+(found?'Your test record was found.':'Pull only checked the returned records; local data was not changed.');
}catch(e){result.textContent='Test Pull failed: '+e.message}
finally{$('testPull').disabled=false}
};return}if(!db[page])db[page]=[];
if(page==='Students'){
let changed=false;
db[page].forEach(r=>{
if(!r.id){
r.id=(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():'stu-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
changed=true;
}
});
if(changed)save();
}$('saveRecord').onclick=()=>{const name=$('recordName').value.trim();if(!name){$('recordName').focus();return}db[page].push({name,group:$('recordGroup').value.trim()||'General',status:$('recordStatus').value});save();render(page)};document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.delete);if(confirm('Delete this local demo record?')){db[page].splice(i,1);save();render(page)}})}


// GVRM_STUDENTS_CLOUD_SYNC_V1
async function gvrmStudentsCloudRequest(method, endpoint, body) {
  const base = (localStorage.getItem('gvrm_api_url') || '').trim().replace(/\/+$/, '');
  const token = localStorage.getItem('gvrm_lms_token') || localStorage.getItem('gvrm_api_token') || '';
  if (!base) throw new Error('Save your Cloud Sync API URL in Settings first.');
  if (!token) throw new Error('Please log in with your institution account first.');
  const response = await fetch(base + endpoint, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      ...(body ? {'Content-Type': 'application/json'} : {})
    },
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || result.message || ('API request failed: HTTP ' + response.status));
  }
  return result;
}

function gvrmSetupStudentsCloudSync() {
  const saveButton = document.getElementById('saveRecord');
  if (!saveButton || document.getElementById('gvrmStudentsCloudPanel')) return;

  saveButton.insertAdjacentHTML('beforebegin', `
    <div id="gvrmStudentsCloudPanel" style="margin:12px 0;padding:14px;border:1px solid #d5dbe5;border-radius:12px">
      <strong>Students Cloud Sync</strong>
      <p style="font-size:12px;margin:6px 0 10px">Manually sync student records with your institution cloud.</p>
      <button type="button" id="gvrmStudentsPush">Push Students</button>
      <button type="button" id="gvrmStudentsPull">Pull Students</button>
      <p id="gvrmStudentsSyncStatus" role="status" style="font-size:12px;margin:8px 0 0">Ready. Use test data first.</p>
    </div>
  `);

  const status = document.getElementById('gvrmStudentsSyncStatus');
  const pushButton = document.getElementById('gvrmStudentsPush');
  const pullButton = document.getElementById('gvrmStudentsPull');

  const setStatus = message => { status.textContent = message; };

  pushButton.addEventListener('click', async () => {
    const rows = Array.isArray(db.Students) ? db.Students : [];
    if (!rows.length) {
      setStatus('No student records to push.');
      return;
    }
    if (rows.length > 5000) {
      setStatus('Too many records for this initial sync. Please reduce the batch.');
      return;
    }
    const accepted = confirm(
      'Push ' + rows.length + ' local student records to the institution cloud?\n\n' +
      'Review the list first. Existing demo records will also be uploaded. Use synthetic test data before real student information.'
    );
    if (!accepted) return;

    pushButton.disabled = true;
    pullButton.disabled = true;
    try {
      const now = new Date().toISOString();
      const records = rows.map((row, index) => {
        if (!row.id) {
          row.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'stu-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 9);
        }
        const student = {
          id: String(row.id),
          name: String(row.name || '').trim(),
          group: String(row.group || 'General'),
          status: String(row.status || 'Active')
        };
        if (!student.name) throw new Error('A student has an empty name. Fix it before pushing.');
        return {recordId: student.id, data: student, updatedAt: now};
      });

      save();
      let totalSaved = 0;
      for (let i = 0; i < records.length; i += 100) {
        const result = await gvrmStudentsCloudRequest(
          'POST',
          '/students/sync/push',
          {records: records.slice(i, i + 100)}
        );
        totalSaved += Number(result.saved || 0);
      }
      setStatus('Push successful. Records saved: ' + totalSaved);
      alert('Students Cloud Push successful.\nRecords saved: ' + totalSaved);
    } catch (error) {
      setStatus('Push failed: ' + error.message);
      alert('Students Cloud Push failed:\n' + error.message);
    } finally {
      pushButton.disabled = false;
      pullButton.disabled = false;
    }
  });

  pullButton.addEventListener('click', async () => {
    pushButton.disabled = true;
    pullButton.disabled = true;
    try {
      const result = await gvrmStudentsCloudRequest('GET', '/students/sync/pull');
      const cloudRows = Array.isArray(result.records) ? result.records : [];
      if (!Array.isArray(db.Students)) db.Students = [];

      const localIds = new Set(db.Students.map(row => String(row.id || '')).filter(Boolean));
      let added = 0;

      for (const record of cloudRows) {
        const student = record && record.data;
        if (!student || !student.id || !student.name) continue;
        if (localIds.has(String(student.id))) continue;

        db.Students.push({
          id: String(student.id),
          name: String(student.name),
          group: String(student.group || 'General'),
          status: String(student.status || 'Active')
        });
        localIds.add(String(student.id));
        added++;
      }

      save();
      alert('Students Cloud Pull successful.\nCloud records received: ' +
        cloudRows.length + '\nNew local records added: ' + added +
        '\nExisting local records were preserved.');
      render('Students');
    } catch (error) {
      setStatus('Pull failed: ' + error.message);
      alert('Students Cloud Pull failed:\n' + error.message);
    } finally {
      pushButton.disabled = false;
      pullButton.disabled = false;
    }
  });
}

const gvrmOriginalWirePage = wirePage;
wirePage = function(page) {
  gvrmOriginalWirePage(page);
  if (page === 'Students') gvrmSetupStudentsCloudSync();
};
// END GVRM_STUDENTS_CLOUD_SYNC_V1
const gvrmOriginalWirePage = wirePage;
wirePage = function(page) {
  gvrmOriginalWirePage(page);
  if (page === 'Students') gvrmSetupStudentsCloudSync();
};
