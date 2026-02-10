/**
 * Master JavaScript file for ACRP site
 * Handles common functionality across all pages
 */

// Snow script is included directly in pages where needed; no dynamic loader required.

// Global JS error handling: redirect to /rejected.html on uncaught errors or unhandled promise rejections
(function(){
  function redirectToRejected() {
    try {
      // Don't redirect if we're already on the rejected page to avoid loops
      if (/\/?rejected(\.html)?$/.test(window.location.pathname)) return;
      // Prevent rapid repeat redirects during an error storm
      if (sessionStorage.getItem('redirectingToRejected')) return;
      sessionStorage.setItem('redirectingToRejected','1');
      // Use replace so the failing page is not left in history
      window.location.replace('/rejected.html');
    } catch (e) {
      // If redirecting fails, at least log the failure
      console.error('Failed to redirect to /rejected.html', e);
    }
  }

  window.addEventListener('error', function(ev){
    try { console.error('Global error caught:', ev); } catch(e) {}
    redirectToRejected();
  }, true);

  window.addEventListener('unhandledrejection', function(ev){
    try { console.error('Unhandled promise rejection:', ev); } catch(e) {}
    redirectToRejected();
  });
})();

// Load footer on all pages (except 404 pages)
function loadFooter() {
  // Skip footer loading on 404 and rejected pages (supports /404, /rejected, and .html variants)
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
