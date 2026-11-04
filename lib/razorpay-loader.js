let razorpayScriptPromise = null;
const RAZORPAY_LOAD_TIMEOUT_MS = 15000;

export function ensureRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be loaded in the browser.'));
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    let timeoutId = null;

    const clearPendingTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const failLoad = (message) => {
      clearPendingTimeout();
      razorpayScriptPromise = null;
      reject(new Error(message));
    };

    const existingScript = document.querySelector('script[data-razorpay-checkout="true"]');

    if (existingScript) {
      existingScript.addEventListener(
        'load',
        () => {
          if (window.Razorpay) {
            clearPendingTimeout();
            resolve(window.Razorpay);
          } else {
            failLoad('Razorpay script loaded but SDK is unavailable.');
          }
        },
        { once: true }
      );

      existingScript.addEventListener(
        'error',
        () => {
          failLoad('Failed to load Razorpay checkout script.');
        },
        { once: true }
      );

      timeoutId = setTimeout(() => {
        failLoad('Timed out while loading Razorpay checkout script.');
      }, RAZORPAY_LOAD_TIMEOUT_MS);

      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.setAttribute('data-razorpay-checkout', 'true');

    script.onload = () => {
      if (window.Razorpay) {
        clearPendingTimeout();
        resolve(window.Razorpay);
      } else {
        failLoad('Razorpay script loaded but SDK is unavailable.');
      }
    };

    script.onerror = () => {
      failLoad('Failed to load Razorpay checkout script.');
    };

    timeoutId = setTimeout(() => {
      failLoad('Timed out while loading Razorpay checkout script.');
    }, RAZORPAY_LOAD_TIMEOUT_MS);

    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}
