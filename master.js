/**
 * Master JavaScript file for ACRP site
 * Handles common functionality across all pages
 */

// Snow script is included directly in pages where needed; no dynamic loader required.

// Global JS error handling: log errors without redirecting
(function(){
  function isBlockedResourceError(ev) {
    // Extension or blocker stopped a resource like a script, img, css, font
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

    // Ignore extension blocked or failed resource loads
    if (isBlockedResourceError(ev)) return;

    // Ignore generic Event-only errors with no message or file
    if (!ev.message && !ev.filename) return;

    // Just log, no redirect
  }, true);

  window.addEventListener('unhandledrejection', function(ev){
    console.error('Unhandled promise rejection:', ev);

    const msg = String(ev.reason || '');

    // Ignore network and blocker related failures
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('ERR_BLOCKED_BY_CLIENT') ||
      msg.includes('Load failed')
    ) {
      console.warn('Ignoring network or client-blocked rejection');
      return;
    }

    // Just log, no redirect
  });
})();

// Load footer on all pages (except 404 pages)
function loadFooter() {
  // Skip footer loading on 404 and rejected pages (supports /404, /rejected, and .html variants)
  const path = window.location.pathname;
  if (/\/?(404|rejected)(\.html)?$/.test(path)) {
    return;
  }
  
  fetch('footer.html')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
      // Remove any existing footer elements first
      const existingFooters = document.querySelectorAll('footer');
      existingFooters.forEach(footer => footer.remove());
      
      // Find the footer placeholder or create one at the end of body
      let footerContainer = document.getElementById('footer-container');
      if (!footerContainer) {
        footerContainer = document.createElement('div');
        footerContainer.id = 'footer-container';
        
        // Insert before script tags if they exist, otherwise at end of body
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
      // Fallback: create a simple footer if loading fails (but not on 404 pages)
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  loadFooter();
});

// Fallback for pages that might not fire DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadFooter();
  });
} else {
  loadFooter();
}
