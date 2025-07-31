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
  
  // ES5-compatible Map replacement
  var processed = {};
  
  // ES5-compatible Set replacement
  function createSet() {
    var items = [];
    return {
      has: function(item) {
        for (var i = 0; i < items.length; i++) {
          if (items[i] === item) return true;
        }
        return false;
      },
      add: function(item) {
        if (!this.has(item)) {
          items.push(item);
        }
      }
    };
  }
  
  var debounceTimer = null;
  
  // Safe localStorage operations
  function safeLocalStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      if (config.debugMode) {
        console.warn('Phone Swapper: localStorage access denied:', e);
      }
      return null;
    }
  }
  
  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (config.debugMode) {
        console.warn('Phone Swapper: localStorage write failed:', e);
      }
      return false;
    }
  }
  
  // Get UTM value based on configured parameter
  function getUtmValue() {
    var utmValue = getQueryParam('utm_' + config.utmParameter);
    var stored = getStoredUtm();
    
    if (utmValue) {
      // Store new UTM with timestamp
      safeLocalStorageSet('phoneSwapper_utm_' + config.utmParameter, utmValue);
      safeLocalStorageSet('phoneSwapper_time', Date.now().toString());
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
      var utm = safeLocalStorageGet('phoneSwapper_utm_' + config.utmParameter);
      var time = safeLocalStorageGet('phoneSwapper_time');
      
      if (!utm || !time) return { utm: null, expired: true };
      
      var daysSince = (Date.now() - parseInt(time)) / (1000 * 60 * 60 * 24);
      var expired = daysSince > config.utmPersistDays;
      
      return { utm: utm, expired: expired };
    } catch (e) {
      return { utm: null, expired: true };
    }
  }
  
  // Get query parameter - ES5 compatible
  function getQueryParam(param) {
    try {
      // Use regex fallback for older browsers
      var regex = new RegExp('[?&]' + param + '=([^&#]*)');
      var results = regex.exec(window.location.search);
      return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
    } catch (e) {
      return null;
    }
  }
  
  // Clean phone number for tel: links
  function cleanPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
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
      var selectorKeys = Object.keys(config.selectorMappings);
      for (var s = 0; s < selectorKeys.length; s++) {
        var selector = selectorKeys[s];
        var elements = document.querySelectorAll(selector);
        var phoneData = getPhoneForSelector(selector);
        var selectorUpdated = 0;
        
        // Get or create processed set for this selector
        if (!processed[selector]) {
          processed[selector] = createSet();
        }
        var selectorProcessed = processed[selector];
        
        // Update each element with this selector
        for (var i = 0; i < elements.length; i++) {
          var element = elements[i];
          
          if (selectorProcessed.has(element)) continue;
          
          // Update text content
          if (element.textContent && element.textContent.trim()) {
            element.textContent = phoneData.number;
          }
          
          // Update href for links
          if (config.updateLinks && element.tagName === 'A') {
            element.href = 'tel:' + cleanPhone(phoneData.number);
          }
          
          // Update other href attributes
          if (config.updateLinks && element.href && element.href.indexOf('tel:') === 0) {
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
      }
      
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
  
  // Cleanup function
  function cleanup() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    processed = {};
  }
  
  // Initialize
  function init() {
    // Cleanup any existing instances
    cleanup();
    
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
        
        for (var i = 0; i < mutations.length; i++) {
          var mutation = mutations[i];
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (var j = 0; j < mutation.addedNodes.length; j++) {
              var node = mutation.addedNodes[j];
              if (node && node.nodeType === 1) { // Element node
                // Check if the added node or its children match our selectors
                try {
                  if (node.querySelectorAll) {
                    var selectorKeys = Object.keys(config.selectorMappings);
                    for (var k = 0; k < selectorKeys.length; k++) {
                      var selector = selectorKeys[k];
                      var matches = node.querySelectorAll(selector);
                      if (matches.length > 0) {
                        shouldUpdate = true;
                        break;
                      }
                    }
                  }
                } catch (e) {
                  // Continue if selector fails
                }
              }
            }
          }
        }
        
        if (shouldUpdate) {
          debounceUpdate();
        }
      });
      
      try {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      } catch (e) {
        if (config.debugMode) {
          console.warn('Phone Swapper: MutationObserver failed:', e);
        }
      }
    }
    
    // Expose manual update function
    window.phoneSwapperUpdate = updatePhoneElements;
    window.phoneSwapperCleanup = cleanup;
  }
  
  // Start the phone switcher
  init();
  
})();
</script>