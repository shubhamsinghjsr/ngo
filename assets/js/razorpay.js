'use strict';
window.NGODonationPayment = (() => {
  const form = document.querySelector('#donation-form');
  if (!form) return null;
  const bank = form.querySelector('#bank-proof-fields');
  const note = form.querySelector('#razorpay-note');
  const button = form.querySelector('[type=submit]');
  const method = () => form.elements.payment_method.value;
  const update = () => {
    const online = method() === 'razorpay';
    bank.hidden = online;
    bank.querySelectorAll('input').forEach(input => { input.disabled = online; input.required = !online; });
    note.hidden = !online;
    button.textContent = online ? 'Pay Online with Razorpay' : 'Submit donation proof';
  };
  form.querySelectorAll('[name=payment_method]').forEach(input => input.addEventListener('change', update));
  form.addEventListener('reset', () => setTimeout(update, 0));
  update();
  fetch('api/razorpay.php', {cache:'no-store',credentials:'same-origin'})
    .then(response => response.json()).then(config => {
      note.textContent = config.enabled
        ? (config.mode === 'test' ? 'Test Mode: no real money will be collected.' : 'Online payment is confirmed only after server verification.')
        : 'Online payments are not available yet. Please use QR/bank transfer.';
    }).catch(() => { note.textContent = 'Online payments are temporarily unavailable. Please use QR/bank transfer.'; });
  let loading;
  const loadCheckout = () => {
    if (window.Razorpay) return Promise.resolve();
    if (!loading) loading = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => window.Razorpay ? resolve() : reject(new Error('Checkout could not be loaded.'));
      script.onerror = () => { loading = null; script.remove(); reject(new Error('Razorpay Checkout is unavailable. No payment was started.')); };
      document.head.append(script);
    });
    return loading;
  };
  async function request(data) {
    const response = await fetch('api/razorpay.php', {method:'POST',body:data,credentials:'same-origin'});
    let result;
    try { result = await response.json(); } catch { throw new Error('Payment confirmation could not be read. Contact the Trust before paying again.'); }
    if (!response.ok || !result.ok) throw new Error(result.message || 'Payment could not be confirmed.');
    return result;
  }
  async function pay(data) {
    await loadCheckout();
    data.set('action','create');
    data.set('attempt',Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2,'0')).join(''));
    const order = await request(data);
    const eventRequest = (action,fields={}) => {
      const body=new FormData();
      Object.entries({action,csrf:data.get('csrf'),donation_id:order.donation_id,...fields}).forEach(([key,value])=>body.set(key,value));
      return request(body);
    };
    return new Promise((resolve,reject) => {
      let completed = false;
      let lastFailure = false;
      const checkout = new window.Razorpay({
        key:order.key_id,order_id:order.order_id,amount:order.amount,currency:order.currency,
        name:'Jan Seva Sangh Trust',description:order.mode==='test'?'Test donation (no real funds)':'Animal welfare donation',
        prefill:order.prefill,theme:{color:'#254c39'},
        handler:async payment => {
          if(completed)return;
          completed=true;
          try{
            const result=await eventRequest('verify',payment);
            resolve({ok:true,message:result.message,reset:result.paid===true});
          }catch(error){
            reject(new Error(error.message+' If your account was debited, do not pay again. Contact the Trust with order '+order.order_id+'.'));
          }
        },
        modal:{ondismiss:async()=>{
          if(completed)return;completed=true;
          try{
            const result=await eventRequest('event',{state:lastFailure?'failed':'cancelled'});
            resolve({ok:true,reset:false,message:result.paid?result.message:(lastFailure?'Checkout reported a failed payment. No payment has been confirmed. If debited, contact the Trust before retrying.':'Checkout cancelled. No payment has been confirmed. You can try again or use QR/bank transfer.')});
          }catch{reject(new Error('Checkout closed. Payment status could not be confirmed. If debited, contact the Trust with order '+order.order_id+'.'));}
        }}
      });
      checkout.on('payment.failed',response=>{
        lastFailure=true;
        eventRequest('event',{state:'failed',payment_id:response?.error?.metadata?.payment_id||''}).catch(()=>{});
        const status=form.querySelector('.form-status');
        status.textContent='Payment attempt failed. Retry inside Checkout or close it to choose another option. If debited, contact the Trust.';
        status.classList.add('error');
      });
      try{checkout.open();}catch(error){completed=true;eventRequest('event',{state:'cancelled'}).catch(()=>{});reject(new Error('Checkout could not open. No payment has been confirmed.'));}
    });
  }
  return {method,pay};
})();
