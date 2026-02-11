




(function(){
  function isBlockedResourceError(ev) {

    if (!ev) return false;

    const t = ev.target;
    if (!t) return false;

    const tag = (t.tagName || '').toLowerCase();
    if (tag === 'script' || tag === 'img' || tag === 'link' || tag === 'iframe') {
      console.warn('Ignoring blocked resource:', t.src || t.href);
      return true;
    }

    return false;
  }

  window.addEventListener('error', function(ev){
    console.error('Global error caught:', ev);


    if (isBlockedResourceError(ev)) return;


    if (!ev.message && !ev.filename) return;


  }, true);

  window.addEventListener('unhandledrejection', function(ev){
    console.error('Unhandled promise rejection:', ev);

    const msg = String(ev.reason || '');


    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('ERR_BLOCKED_BY_CLIENT') ||
      msg.includes('Load failed')
    ) {

      return;
    }

    // Just log, no redirect
  });
})();


function loadFooter() {

  const path = window.location.pathname;
  if (/\/?(404|rejected)(\.html)?$/.test(path)) {
    return;
  }
  
  fetch('/footer.html')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {

      const existingFooters = document.querySelectorAll('footer');
      existingFooters.forEach(footer => footer.remove());
      

      let footerContainer = document.getElementById('footer-container');
      if (!footerContainer) {
        footerContainer = document.createElement('div');
        footerContainer.id = 'footer-container';
        

        const scripts = document.querySelectorAll('script[src]');
        if (scripts.length > 0) {
          document.body.insertBefore(footerContainer, scripts[0]);
        } else {
          document.body.appendChild(footerContainer);
        }
      }
      footerContainer.innerHTML = data;
    })
    .catch(error => {
      console.error('Error loading footer:', error);

      const footerContainer = document.getElementById('footer-container') || 
        document.createElement('div');
      if (!document.getElementById('footer-container')) {
        footerContainer.id = 'footer-container';
        document.body.appendChild(footerContainer);
      }
      footerContainer.innerHTML = `
        <footer style="background: #0d0d0d; color: #f0f0f0; padding: 2rem 1rem; text-align: center;">
          <p>&copy; 2025 Allegheny County Roleplay. All rights reserved.</p>
        </footer>
      `;
    });
}


document.addEventListener('DOMContentLoaded', function() {
  loadFooter();
});


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadFooter();
  });
} else {
  loadFooter();
}