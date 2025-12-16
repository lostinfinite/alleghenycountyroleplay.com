/**
 * Master JavaScript file for ACRP site
 * Handles common functionality across all pages
 */

// Load snow effect script
function loadSnowEffect() {
  if (!document.querySelector('script[src="snow.js"]')) {
    const script = document.createElement('script');
    script.src = 'snow.js';
    script.defer = true;
    script.onload = () => {
      // Wait for snow effect to initialize
      setTimeout(() => {
        // Snow toggle is now handled by snow.js
      }, 200);
    };
    document.head.appendChild(script);
  }
}

// Load footer on all pages (except 404.html)
function loadFooter() {
  // Skip footer loading on 404.html
  if (window.location.pathname.includes('404.html')) {
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
      // Fallback: create a simple footer if loading fails (but not on 404.html)
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
  loadSnowEffect();
});

// Fallback for pages that might not fire DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadFooter();
    loadSnowEffect();
  });
} else {
  loadFooter();
  loadSnowEffect();
}