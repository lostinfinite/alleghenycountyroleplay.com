(function(){
  
  function supportsSticky(){
    try{
      return CSS && (CSS.supports('position','sticky') || CSS.supports('position','-webkit-sticky'));
    }catch(e){
      return false;
    }
  }

  function init() {
    // Prefer native CSS `position: sticky` when available — avoid interfering with it.
    if (supportsSticky()) return;

    var navs = document.querySelectorAll('.simple-localnav');
    if (!navs.length) return;

    navs.forEach(function(nav){
      var placeholder = document.createElement('div');
      placeholder.className = 'simple-localnav-placeholder';
      placeholder.style.display = 'none';

      var navOffset = 0;
      var navHeight = 0;
      var TOP_OFFSET = 6; 
      var originalParent = nav.parentNode;
      var nextSibling = nav.nextSibling;

      function recalc(){
        
        if (nav.classList.contains('js-fixed')){
          
          restoreNav();
        }
        // small timeout to allow layout (fonts/images) to settle
        setTimeout(function(){
          var rect = nav.getBoundingClientRect();
          navOffset = rect.top + window.pageYOffset;
          navHeight = nav.offsetHeight;
        }, 50);
      }

      function fixNav(){
        if (nav.classList.contains('js-fixed')) return;
        
        var rect = nav.getBoundingClientRect();
        navHeight = nav.offsetHeight;

        
        placeholder.style.height = navHeight + 'px';
        placeholder.style.display = 'block';
        if (!placeholder.parentNode && originalParent) {
          originalParent.insertBefore(placeholder, nav);
        }

        // move nav to body so it sits above all stacking contexts
        document.body.appendChild(nav);

        
        nav.style.position = 'fixed';
        nav.style.top = TOP_OFFSET + 'px';
        nav.style.left = rect.left + 'px';
        nav.style.width = rect.width + 'px';
        nav.style.zIndex = '999999';
        nav.classList.add('js-fixed');
      }

      function restoreNav(){
        if (!nav.classList.contains('js-fixed')) return;
        
        nav.style.position = '';
        nav.style.top = '';
        nav.style.left = '';
        nav.style.width = '';
        nav.style.zIndex = '';
        nav.classList.remove('js-fixed');
        
        if (originalParent) {
          originalParent.insertBefore(nav, placeholder);
        }
        // remove placeholder
        if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      }

      function onScroll(){
        // If there's a secondary nav visible, primary nav should yield (stay un-fixed)
        try{
          var secondary = document.getElementById('secondary-localnav');
          if (nav.id === 'primary-localnav' && secondary) {
            var sRect = secondary.getBoundingClientRect();
            var sVisible = secondary.classList.contains('scrolled-past') || (sRect.height > 0 && sRect.top < window.innerHeight && sRect.bottom > 0);
            if (sVisible) {
              if (nav.classList.contains('js-fixed')) restoreNav();
              return; // do not fix primary while secondary is visible
            }
          }
        }catch(e){}

        if (window.pageYOffset + TOP_OFFSET >= navOffset){
          if(!nav.classList.contains('js-fixed')){
            fixNav();
          }
        } else {
          if(nav.classList.contains('js-fixed')){
            restoreNav();
          }
        }
      }

      // initial calc and bind
      recalc();
      
      window.addEventListener('load', function(){ recalc(); onScroll(); });
      onScroll();

      window.addEventListener('scroll', onScroll, {passive:true});
      window.addEventListener('resize', function(){
        
        if (nav.classList.contains('js-fixed')){
          restoreNav();
        }
        recalc();
        onScroll();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
