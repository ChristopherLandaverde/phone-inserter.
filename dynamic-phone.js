<script>
(function() {
  'use strict';
  
  // ===== CONFIGURATION =====
  // Edit these settings for your needs
  
  var config = {
    // UTM Parameter to use for matching
    // Options: 'source', 'medium', 'campaign', 'term', 'content'
    utmParameter: 'source', // Change this to 'medium', 'campaign', etc.
    
    // CSS Selector-based phone mappings
    // Format: 'css-selector': { 'utm-value': 'phone-number' }
    selectorMappings: {
      // Header phone numbers
      '.header-phone': {
        'google': '+1 (555) 100-1111',
        'facebook': '+1 (555) 100-2222',
        'linkedin': '+1 (555) 100-3333'
      },
      
      // Footer phone numbers  
      '.footer-phone': {
        'google': '+1 (555) 200-1111',
        'facebook': '+1 (555) 200-2222',
        'linkedin': '+1 (555) 200-3333'
      },
      
      // Contact page phone
      '#contact-phone': {
        'google': '+1 (555) 300-1111',
        'facebook': '+1 (555) 300-2222',
        'linkedin': '+1 (555) 300-3333'
      },
      
      // CTA button phone links
      '.cta-phone-link': {
        'google': '+1 (555) 400-1111',
        'facebook': '+1 (555) 400-2222',
        'linkedin': '+1 (555) 400-3333'
      },
      
      // Generic phone class (fallback)
      '.phone': {
        'google': '+1 (555) 500-1111',
        'facebook': '+1 (555) 500-2222',
        'linkedin': '+1 (555) 500-3333'
      }
    },
    
    // Default phone numbers for each selector when no UTM match
    selectorDefaults: {
      '.header-phone': '+1 (555) 100-0000',
      '.footer-phone': '+1 (555) 200-0000', 
      '#contact-phone': '+1 (555) 300-0000',
      '.cta-phone-link': '+1 (555) 400-0000',
      '.phone': '+1 (555) 500-0000'
    },
    
    // Global fallback (used if selector not found in selectorDefaults)
    globalFallback: '+1 (555) 000-0000',
    
    // Settings
    utmPersistDays: 30,        // How long to remember UTM
    updateLinks: true,         // Update href attributes  
    watchDynamicContent: true, // Monitor for new content
    debugMode: false           // Enable console logging
  };
  
  // ===== CORE FUNCTIONALITY =====
  
  var processed = new Map(); // Track processed elements by selector
  var debounceTimer = null;
  
  // Get UTM value based on configured parameter
  function getUtmValue() {
    var utmValue = getQueryParam('utm_' + config.utmParameter);
    var stored = getStoredUtm();
    
    if (utmValue) {
      // Store new UTM with timestamp
      localStorage.setItem('phoneSwapper_utm_' + config.utmParameter, utmValue);
      localStorage.setItem('phoneSwapper_time', Date.now().toString());
      return utmValue;
    } else if (stored.utm && !stored.expired) {
      // Use stored UTM if not expired
      return stored.utm;
    }
    
    return null;
  }
  
  // Get stored UTM with expiration check
  function getStoredUtm() {
    try {
      var utm = localStorage.getItem('phoneSwapper_utm_' + config.utmParameter);
      var time = localStorage.getItem('phoneSwapper_time');
      
      if (!utm || !time) return { utm: null, expired: true };
      
      var daysSince = (Date.now() - parseInt(time)) / (1000 * 60 * 60 * 24);
      var expired = daysSince > config.utmPersistDays;
      
      return { utm: utm, expired: expired };
    } catch (e) {
      return { utm: null, expired: true };
    }
  }
  
  // Get query parameter
  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
  
  // Clean phone number for tel: links
  function cleanPhone(phone) {
    return phone.replace(/\D/g, '');
  }
  
  // Get phone number for specific selector
  function getPhoneForSelector(selector) {
    var utmValue = getUtmValue();
    var selectorMapping = config.selectorMappings[selector];
    
    // Try UTM-specific mapping first
    if (utmValue && selectorMapping && selectorMapping[utmValue]) {
      return {
        number: selectorMapping[utmValue],
        source: utmValue,
        type: 'utm-match'
      };
    }
    
    // Try selector-specific default
    if (config.selectorDefaults[selector]) {
      return {
        number: config.selectorDefaults[selector],
        source: 'selector-default',
        type: 'selector-default'
      };
    }
    
    // Global fallback
    return {
      number: config.globalFallback,
      source: 'global-fallback',
      type: 'global-fallback'
    };
  }
  
  // Update phone elements
  function updatePhoneElements() {
    try {
      var totalUpdated = 0;
      var utmValue = getUtmValue();
      
      // Process each selector mapping
      Object.keys(config.selectorMappings).forEach(function(selector) {
        var elements = document.querySelectorAll(selector);
        var phoneData = getPhoneForSelector(selector);
        var selectorUpdated = 0;
        
        // Get or create processed set for this selector
        if (!processed.has(selector)) {
          processed.set(selector, new Set());
        }
        var selectorProcessed = processed.get(selector);
        
        // Update each element with this selector
        for (var i = 0; i < elements.length; i++) {
          var element = elements[i];
          
          if (selectorProcessed.has(element)) continue;
          
          // Update text content
          if (element.textContent.trim()) {
            element.textContent = phoneData.number;
          }
          
          // Update href for links
          if (config.updateLinks && element.tagName === 'A') {
            element.href = 'tel:' + cleanPhone(phoneData.number);
          }
          
          // Update other href attributes
          if (config.updateLinks && element.href && element.href.startsWith('tel:')) {
            element.href = 'tel:' + cleanPhone(phoneData.number);
          }
          
          selectorProcessed.add(element);
          selectorUpdated++;
          totalUpdated++;
        }
        
        if (config.debugMode && selectorUpdated > 0) {
          console.log('Selector "' + selector + '": Updated ' + selectorUpdated + ' elements');
          console.log('  Phone: ' + phoneData.number + ' (Type: ' + phoneData.type + ')');
        }
      });
      
      if (config.debugMode) {
        console.log('=== Phone Swapper Summary ===');
        console.log('UTM Parameter: utm_' + config.utmParameter);
        console.log('UTM Value: ' + (utmValue || 'none'));
        console.log('Total Updated: ' + totalUpdated + ' elements');
      }
      
      return totalUpdated;
      
    } catch (error) {
      console.error('Phone Swapper Error:', error);
      return 0;
    }
  }
  
  // Debounced update for dynamic content
  function debounceUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePhoneElements, 100);
  }
  
  // Initialize
  function init() {
    // Initial update
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updatePhoneElements);
    } else {
      updatePhoneElements();
    }
    
    // Watch for dynamic content
    if (config.watchDynamicContent && window.MutationObserver) {
      var observer = new MutationObserver(function(mutations) {
        var shouldUpdate = false;
        
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (var i = 0; i < mutation.addedNodes.length; i++) {
              if (mutation.addedNodes[i].nodeType === 1) { // Element node
                shouldUpdate = true;
                break;
              }
            }
          }
        });
        
        if (shouldUpdate) {
          debounceUpdate();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    
    // Expose manual update function
    window.phoneSwapperUpdate = updatePhoneElements;
  }
  
  // Start the phone switcher
  init();
  
})();
</script>