(function(){
  // Robust sticky fallback: move nav to <body> when fixed to avoid stacking context issues
  function supportsSticky(){
    try{
      return CSS && (CSS.supports('position','sticky') || CSS.supports('position','-webkit-sticky'));
    }catch(e){
      return false;
    }
  }

  function init() {
    var navs = document.querySelectorAll('.simple-localnav');
    if (!navs.length) return;

    navs.forEach(function(nav){
      var placeholder = document.createElement('div');
      placeholder.className = 'simple-localnav-placeholder';
      placeholder.style.display = 'none';

      var navOffset = 0;
      var navHeight = 0;
      var TOP_OFFSET = 6; // matches CSS top breathing
      var originalParent = nav.parentNode;
      var nextSibling = nav.nextSibling;

      function recalc(){
        // remove fixed state if present to measure natural position
        if (nav.classList.contains('js-fixed')){
          // temporarily restore to measure
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
        // measure current rect before moving
        var rect = nav.getBoundingClientRect();
        navHeight = nav.offsetHeight;

        // set placeholder
        placeholder.style.height = navHeight + 'px';
        placeholder.style.display = 'block';
        if (!placeholder.parentNode && originalParent) {
          originalParent.insertBefore(placeholder, nav);
        }

        // move nav to body so it sits above all stacking contexts
        document.body.appendChild(nav);

        // apply fixed positioning with explicit size/position
        nav.style.position = 'fixed';
        nav.style.top = TOP_OFFSET + 'px';
        nav.style.left = rect.left + 'px';
        nav.style.width = rect.width + 'px';
        nav.style.zIndex = '999999';
        nav.classList.add('js-fixed');
      }

      function restoreNav(){
        if (!nav.classList.contains('js-fixed')) return;
        // remove fixed inline styles
        nav.style.position = '';
        nav.style.top = '';
        nav.style.left = '';
        nav.style.width = '';
        nav.style.zIndex = '';
        nav.classList.remove('js-fixed');
        // move nav back to its original place
        if (originalParent) {
          originalParent.insertBefore(nav, placeholder);
        }
        // remove placeholder
        if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      }

      function onScroll(){
        // When the page is scrolled past the nav's original offset, pin it
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
      // run again on window load to be safe (fonts/images may change height)
      window.addEventListener('load', function(){ recalc(); onScroll(); });
      onScroll();

      window.addEventListener('scroll', onScroll, {passive:true});
      window.addEventListener('resize', function(){
        // restore and recalc to get new positions
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