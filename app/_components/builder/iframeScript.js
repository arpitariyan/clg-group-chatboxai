// Script injected into iframe for element selection and editing
export const iframeScript = `
        <style id="ai-preview-style">
        .ai-selected-element {
            outline: 2px solid #6366f1 !important;
        }
        </style>
        <script id="ai-preview-script">
        (function () {
            // If this HTML is opened directly (not in an iframe), do nothing.
            if (window === window.parent) {
            return;
            }

            let selectedElement = null;

            function clearSelected() {
            if (selectedElement) {
                selectedElement.classList.remove('ai-selected-element');
                selectedElement.removeAttribute('data-ai-selected');
                selectedElement.style.outline = '';
                selectedElement = null;
            }
            }

            document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();

            clearSelected();

            const target = e.target;

            // Don't select body or html
            if (!target || target.tagName === 'BODY' || target.tagName === 'HTML') {
                window.parent.postMessage({ type: 'CLEAR_SELECTION' }, '*');
                return;
            }

            selectedElement = target;
            selectedElement.classList.add('ai-selected-element');
            selectedElement.setAttribute('data-ai-selected', 'true');

            const computedStyle = window.getComputedStyle(selectedElement);

            window.parent.postMessage({
                type: 'ELEMENT_SELECTED',
                payload: {
                tagName: selectedElement.tagName,
                className: selectedElement.className,
                text: selectedElement.innerText,
                styles: {
                    padding: computedStyle.padding,
                    margin: computedStyle.margin,
                    paddingTop: computedStyle.paddingTop,
                    paddingRight: computedStyle.paddingRight,
                    paddingBottom: computedStyle.paddingBottom,
                    paddingLeft: computedStyle.paddingLeft,
                    marginTop: computedStyle.marginTop,
                    marginRight: computedStyle.marginRight,
                    marginBottom: computedStyle.marginBottom,
                    marginLeft: computedStyle.marginLeft,
                    backgroundColor: computedStyle.backgroundColor,
                    color: computedStyle.color,
                    fontSize: computedStyle.fontSize,
                    fontFamily: computedStyle.fontFamily,
                    fontWeight: computedStyle.fontWeight,
                    lineHeight: computedStyle.lineHeight,
                    textAlign: computedStyle.textAlign,
                    width: computedStyle.width,
                    height: computedStyle.height,
                    display: computedStyle.display,
                    position: computedStyle.position,
                    borderWidth: computedStyle.borderWidth,
                    borderStyle: computedStyle.borderStyle,
                    borderColor: computedStyle.borderColor,
                    borderRadius: computedStyle.borderRadius,
                    opacity: computedStyle.opacity,
                    boxShadow: computedStyle.boxShadow,
                    textShadow: computedStyle.textShadow,
                    zIndex: computedStyle.zIndex,
                    overflow: computedStyle.overflow
                }
                }
            }, '*');
            });

            window.addEventListener('message', function (event) {
            if (event.data.type === 'UPDATE_ELEMENT' && selectedElement) {
                const updates = event.data.payload;

                if (updates.className !== undefined) {
                selectedElement.className = updates.className;
                }

                if (updates.text !== undefined) {
                selectedElement.innerText = updates.text;
                }

                if (updates.styles) {
                Object.assign(selectedElement.style, updates.styles);
                }
            } else if (event.data.type === 'CLEAR_SELECTION_REQUEST') {
                clearSelected();

                // extra safety: remove our class + outline from any stray elements
                document.querySelectorAll('.ai-selected-element,[data-ai-selected]').forEach(function (el) {
                el.classList.remove('ai-selected-element');
                el.removeAttribute('data-ai-selected');
                el.style.outline = '';
                });
            } else if (event.data.type === 'LOAD_GOOGLE_FONT') {
                // Load Google Font dynamically
                const fontFamily = event.data.payload.fontFamily;
                if (!fontFamily) return;
                
                // Encode font family for URL (replace spaces with +)
                const encodedFont = fontFamily.trim().replace(/\s+/g, '+');
                const fontUrl = 'https://fonts.googleapis.com/css2?family=' + 
                    encodedFont + ':wght@100;200;300;400;500;600;700;800;900&display=swap';
                
                // Check if font link already exists
                const linkId = 'google-font-' + encodedFont;
                if (!document.getElementById(linkId)) {
                    const link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    link.href = fontUrl;
                    document.head.appendChild(link);
                    
                    // Also preconnect to Google Fonts for better performance
                    if (!document.querySelector('link[rel="preconnect"][href*="fonts.googleapis.com"]')) {
                        const preconnect1 = document.createElement('link');
                        preconnect1.rel = 'preconnect';
                        preconnect1.href = 'https://fonts.googleapis.com';
                        document.head.appendChild(preconnect1);
                        
                        const preconnect2 = document.createElement('link');
                        preconnect2.rel = 'preconnect';
                        preconnect2.href = 'https://fonts.gstatic.com';
                        preconnect2.crossOrigin = 'anonymous';
                        document.head.appendChild(preconnect2);
                    }
                }
            }
            });
            
            // Preload Google Fonts that are already in use
            function preloadExistingFonts() {
                const elements = document.querySelectorAll('*');
                const fontsInUse = new Set();
                
                elements.forEach(function(el) {
                    const computedStyle = window.getComputedStyle(el);
                    const fontFamily = computedStyle.fontFamily;
                    
                    if (fontFamily && fontFamily !== 'inherit') {
                        // Extract font names from font-family (can be comma-separated)
                        const fonts = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
                        fonts.forEach(font => {
                            // Check if it's a Google Font (not generic like serif, sans-serif, etc.)
                            if (font && !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(font.toLowerCase())) {
                                fontsInUse.add(font);
                            }
                        });
                    }
                });
                
                // Load each unique font
                fontsInUse.forEach(function(font) {
                    window.postMessage({
                        type: 'LOAD_GOOGLE_FONT',
                        payload: { fontFamily: font }
                    }, '*');
                });
            }
            
            // Run preload after a short delay to ensure DOM is ready
            setTimeout(preloadExistingFonts, 100);
        })();
        <\/script>
`
