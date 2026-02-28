'use client'

import { X, ChevronDown, ChevronUp, Search, Upload, Wand2, Crop, Edit2, Scissors, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import ImageCropModal from './ImageCropModal'
import ImageEditModal from './ImageEditModal'
import BackgroundRemovalModal from './BackgroundRemovalModal'

// Debounce hook
function useDebounce(callback, delay) {
    const timeoutRef = useRef(null)
    
    return useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args)
        }, delay)
    }, [callback, delay])
}

// Popular Google Fonts list
const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway', 'Poppins',
    'Nunito', 'Ubuntu', 'Playfair Display', 'Merriweather', 'PT Sans', 'Noto Sans', 
    'Roboto Condensed', 'Mukta', 'Rubik', 'Work Sans', 'Karla', 'Source Sans Pro',
    'Bebas Neue', 'Lobster', 'Pacifico', 'Dancing Script', 'Satisfy', 'Permanent Marker',
    'Righteous', 'Archivo', 'Cabin', 'Quicksand', 'Oxygen', 'Titillium Web', 'Barlow',
    'Fira Sans', 'DM Sans', 'Plus Jakarta Sans', 'Manrope', 'Space Grotesk', 'Crimson Text',
    'Libre Baskerville', 'Cormorant Garamond', 'EB Garamond', 'Lora', 'Bitter', 'Arvo',
    'Josefin Sans', 'Abel', 'Comfortaa', 'Indie Flower', 'Shadows Into Light', 'Caveat'
].sort()

// Input Field Component - Moved outside to prevent recreation
const InputField = ({ label, value, onChange, type = 'text', ...props }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            {...props}
        />
    </div>
)

// Color Picker Component - Moved outside to prevent recreation
const ColorPicker = ({ label, value, onChange }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <div className="flex items-center gap-2 border border-gray-300 rounded-md p-1 bg-white">
            <input
                type="color"
                value={value === 'rgba(0, 0, 0, 0)' || value === 'transparent' ? '#ffffff' : value}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 cursor-pointer rounded border-0"
            />
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 text-xs text-gray-600 outline-none bg-transparent"
            />
        </div>
    </div>
)

// Select Field Component - Moved outside to prevent recreation
const SelectField = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
        >
            {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
)

// ClassNameTagInput Component - Moved outside to prevent recreation
const ClassNameTagInput = ({ label, value, onChange }) => {
    const [inputValue, setInputValue] = useState('')
    const classes = value ? value.split(' ').filter(c => c.trim()) : []

    const handleAddClass = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            const newClass = inputValue.trim()
            if (newClass && !classes.includes(newClass)) {
                const newClasses = [...classes, newClass]
                onChange(newClasses.join(' '))
                setInputValue('')
            }
        }
    }

    const handleRemoveClass = (classToRemove) => {
        const newClasses = classes.filter(c => c !== classToRemove)
        onChange(newClasses.join(' '))
    }

    const handleBlur = () => {
        const newClass = inputValue.trim()
        if (newClass && !classes.includes(newClass)) {
            const newClasses = [...classes, newClass]
            onChange(newClasses.join(' '))
            setInputValue('')
        }
    }

    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <div className="w-full min-h-10.5 p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                <div className="flex flex-wrap gap-1.5 items-center">
                    {classes.map((className, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                        >
                            <span>{className}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveClass(className)}
                                className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleAddClass}
                        onBlur={handleBlur}
                        placeholder={classes.length === 0 ? 'Add class name...' : ''}
                        className="flex-1 min-w-25 text-sm outline-none bg-transparent"
                    />
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Press Enter or Space to add a class</p>
        </div>
    )
}

export default function EditorPanel({ selectedElement, onUpdate, onClose }) {
    const [values, setValues] = useState(selectedElement)
    const [fontSearch, setFontSearch] = useState('')
    const [showFontDropdown, setShowFontDropdown] = useState(false)
    const [expandedSections, setExpandedSections] = useState({
        content: true,
        layout: false,
        spacing: false,
        typography: false,
        colors: false,
        background: false,
        border: false,
        transform: false,
        effects: false,
        advanced: false
    })
    const elementIdRef = useRef(selectedElement?.id)
    
    // Image management state
    const [backgroundTab, setBackgroundTab] = useState('color') // 'color', 'upload', 'generate'
    const [uploadedImage, setUploadedImage] = useState(null)
    const [generatedImage, setGeneratedImage] = useState(null)
    const [imagePrompt, setImagePrompt] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showCropModal, setShowCropModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showBgRemovalModal, setShowBgRemovalModal] = useState(false)
    const [currentImageForEdit, setCurrentImageForEdit] = useState(null)
    const fileInputRef = useRef(null)
    
    // Debounced update to prevent rapid updates while typing
    const debouncedUpdate = useDebounce(onUpdate, 150)

    // Only reset values when a different element is selected, not on every update
    useEffect(() => {
        const currentId = selectedElement?.id || `${selectedElement?.tagName}-${selectedElement?.className}`
        if (currentId !== elementIdRef.current) {
            elementIdRef.current = currentId
            setValues(selectedElement)
        }
    }, [selectedElement])

    if (!selectedElement || !values) return null

    const handleChange = (field, value) => {
        const newValues = { ...values, [field]: value }
        if (field in values.styles) {
            newValues.styles = { ...values.styles, [field]: value }
        }
        setValues(newValues)
        debouncedUpdate({ [field]: value })
    }

    const handleStyleChange = (styleName, value) => {
        let processedValue = value
        
        // If changing font family, load the Google Font and format properly
        if (styleName === 'fontFamily' && value) {
            const cleanFont = value.replace(/['"]/g, '')
            loadGoogleFont(cleanFont)
            // Format with quotes and fallback fonts
            processedValue = `'${cleanFont}', sans-serif`
        }
        
        const newStyles = { ...values.styles, [styleName]: processedValue }
        setValues({ ...values, styles: newStyles })
        debouncedUpdate({ styles: { [styleName]: processedValue } })
    }

    const loadGoogleFont = (fontFamily) => {
        // Send message to parent (BuilderPreview) to load the font in iframe
        window.postMessage({
            type: 'LOAD_GOOGLE_FONT',
            payload: { fontFamily }
        }, '*')
    }

    // Image Upload Handler
    const handleImageUpload = async (file) => {
        try {
            setIsUploading(true)
            
            const formData = new FormData()
            formData.append('file', file)
            formData.append('projectId', 'temp') // You can pass actual projectId if available
            
            const response = await fetch('/api/website-builder/upload-image', {
                method: 'POST',
                body: formData
            })
            
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }
            
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed')
            }
            
            setUploadedImage(data.url)
            handleStyleChange('backgroundImage', `url('${data.url}')`)
            handleStyleChange('backgroundSize', 'cover')
            handleStyleChange('backgroundPosition', 'center')
            handleStyleChange('backgroundRepeat', 'no-repeat')
            
        } catch (error) {
            console.error('Upload error:', error)
            alert('Failed to upload image: ' + error.message)
        } finally {
            setIsUploading(false)
        }
    }

    // Image Generation Handler
    const handleImageGenerate = async () => {
        if (!imagePrompt.trim()) {
            alert('Please enter a prompt')
            return
        }
        
        try {
            setIsGenerating(true)
            
            const response = await fetch('/api/website-builder/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: imagePrompt,
                    projectId: 'temp' // You can pass actual projectId if available
                })
            })
            
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Invalid response type: ${contentType || 'unknown'}`)
            }
            
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.error || 'Generation failed')
            }
            
            setGeneratedImage(data.url)
            handleStyleChange('backgroundImage', `url('${data.url}')`)
            handleStyleChange('backgroundSize', 'cover')
            handleStyleChange('backgroundPosition', 'center')
            handleStyleChange('backgroundRepeat', 'no-repeat')
            setImagePrompt('')
            
        } catch (error) {
            console.error('Generation error:', error)
            alert('Failed to generate image: ' + error.message)
        } finally {
            setIsGenerating(false)
        }
    }

    // Handle file input change
    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            handleImageUpload(file)
        }
    }

    // Open crop modal
    const handleCropImage = (imageUrl) => {
        setCurrentImageForEdit(imageUrl)
        setShowCropModal(true)
    }

    // Open edit modal
    const handleEditImage = (imageUrl) => {
        setCurrentImageForEdit(imageUrl)
        setShowEditModal(true)
    }

    // Open background removal modal
    const handleRemoveBackground = (imageUrl) => {
        setCurrentImageForEdit(imageUrl)
        setShowBgRemovalModal(true)
    }

    // Save edited image
    const handleSaveEditedImage = async (file) => {
        await handleImageUpload(file)
        setShowCropModal(false)
        setShowEditModal(false)
        setShowBgRemovalModal(false)
        setCurrentImageForEdit(null)
    }

    // Delete uploaded image
    const handleDeleteImage = () => {
        setUploadedImage(null)
        setGeneratedImage(null)
        handleStyleChange('backgroundImage', '')
    }

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const filteredFonts = GOOGLE_FONTS.filter(font =>
        font.toLowerCase().includes(fontSearch.toLowerCase())
    )

    const Section = ({ title, name, children }) => (
        <div className="border-b border-gray-200">
            <button
                onClick={() => toggleSection(name)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
                <span className="font-medium text-sm text-gray-700">{title}</span>
                {expandedSections[name] ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
            </button>
            {expandedSections[name] && (
                <div className="p-3 space-y-3 bg-gray-50">
                    {children}
                </div>
            )}
        </div>
    )

    // FontSelector wrapper that passes state from EditorPanel
    const FontSelectorWrapper = ({ label, value, onChange }) => {
        // Extract the actual font name from the value (remove quotes and fallback fonts)
        const displayValue = value ? value.split(',')[0].replace(/['"]/g, '').trim() : 'Select font...'
        
        return (
            <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <div className="relative">
                    <div 
                        className="w-full text-sm p-2 border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between"
                        onClick={() => setShowFontDropdown(!showFontDropdown)}
                    >
                        <span className="truncate" style={{ fontFamily: value || 'inherit' }}>{displayValue}</span>
                        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    </div>
                
                {showFontDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search fonts..."
                                    value={fontSearch}
                                    onChange={(e) => setFontSearch(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                            {filteredFonts.length > 0 ? (
                                filteredFonts.map(font => (
                                    <div
                                        key={font}
                                        className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                        style={{ fontFamily: `'${font}', sans-serif` }}
                                        onClick={() => {
                                            onChange(font)
                                            setShowFontDropdown(false)
                                            setFontSearch('')
                                        }}
                                    >
                                        {font}
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                    No fonts found
                                </div>
                            )}
                        </div>
                    </div>
                )}
                </div>
            </div>
        )
    }

    // Helper to check if element uses flexbox
    const isFlexContainer = values.styles.display === 'flex'
    const isGridContainer = values.styles.display === 'grid'
    const isPositioned = values.styles.position && values.styles.position !== 'static'

    return (
        <div className='absolute top-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col' style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <div className='flex justify-between items-center p-4 border-b border-gray-200 bg-linear-to-r from-indigo-50 to-purple-50 shrink-0'>
                <div>
                    <h3 className='font-semibold text-gray-800'>Edit Element</h3>
                    {/* <p className='text-xs text-gray-500 mt-0.5'>{values.tagName?.toLowerCase()}</p> */}
                </div>
                <button 
                    onClick={onClose} 
                    className='p-1.5 hover:bg-white/50 rounded-full transition-colors'
                >
                    <X className='w-5 h-5 text-gray-500' />
                </button>
            </div>

            <div className='overflow-y-auto flex-1 text-black min-h-0'>
                {/* Content Section */}
                <Section title="Content & Class" name="content">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Text Content</label>
                        <textarea
                            value={values.text}
                            onChange={(e) => handleChange('text', e.target.value)}
                            className='w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-20'
                        />
                    </div>
                    <ClassNameTagInput
                        label="Class Names"
                        value={values.className}
                        onChange={(val) => handleChange('className', val)}
                    />
                </Section>

                {/* Layout Section */}
                <Section title="Layout & Dimensions" name="layout">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Width"
                            value={values.styles.width}
                            onChange={(val) => handleStyleChange('width', val)}
                        />
                        <InputField
                            label="Height"
                            value={values.styles.height}
                            onChange={(val) => handleStyleChange('height', val)}
                        />
                    </div>
                    <SelectField
                        label="Display"
                        value={values.styles.display}
                        onChange={(val) => handleStyleChange('display', val)}
                        options={['block', 'inline', 'inline-block', 'flex', 'grid', 'none']}
                    />
                    <SelectField
                        label="Position"
                        value={values.styles.position}
                        onChange={(val) => handleStyleChange('position', val)}
                        options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
                    />

                    {/* Positioning offsets - shown when position is not static */}
                    {isPositioned && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                            <label className="block text-xs font-medium text-gray-600 mb-2">Position Offsets</label>
                            <div className="grid grid-cols-4 gap-2">
                                <InputField
                                    label="Top"
                                    value={values.styles.top}
                                    onChange={(val) => handleStyleChange('top', val)}
                                    placeholder="auto"
                                />
                                <InputField
                                    label="Right"
                                    value={values.styles.right}
                                    onChange={(val) => handleStyleChange('right', val)}
                                    placeholder="auto"
                                />
                                <InputField
                                    label="Bottom"
                                    value={values.styles.bottom}
                                    onChange={(val) => handleStyleChange('bottom', val)}
                                    placeholder="auto"
                                />
                                <InputField
                                    label="Left"
                                    value={values.styles.left}
                                    onChange={(val) => handleStyleChange('left', val)}
                                    placeholder="auto"
                                />
                            </div>
                        </div>
                    )}

                    {/* Flexbox properties - shown when display is flex */}
                    {isFlexContainer && (
                        <div className="mt-2 pt-2 border-t border-gray-300 space-y-3">
                            <label className="block text-xs font-medium text-gray-600">Flexbox Properties</label>
                            <SelectField
                                label="Flex Direction"
                                value={values.styles.flexDirection}
                                onChange={(val) => handleStyleChange('flexDirection', val)}
                                options={['row', 'row-reverse', 'column', 'column-reverse']}
                            />
                            <SelectField
                                label="Justify Content"
                                value={values.styles.justifyContent}
                                onChange={(val) => handleStyleChange('justifyContent', val)}
                                options={['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']}
                            />
                            <SelectField
                                label="Align Items"
                                value={values.styles.alignItems}
                                onChange={(val) => handleStyleChange('alignItems', val)}
                                options={['flex-start', 'center', 'flex-end', 'stretch', 'baseline']}
                            />
                            <SelectField
                                label="Flex Wrap"
                                value={values.styles.flexWrap}
                                onChange={(val) => handleStyleChange('flexWrap', val)}
                                options={['nowrap', 'wrap', 'wrap-reverse']}
                            />
                            <InputField
                                label="Gap"
                                value={values.styles.gap}
                                onChange={(val) => handleStyleChange('gap', val)}
                                placeholder="e.g., 1rem"
                            />
                        </div>
                    )}

                    {/* Grid properties - shown when display is grid */}
                    {isGridContainer && (
                        <div className="mt-2 pt-2 border-t border-gray-300 space-y-3">
                            <label className="block text-xs font-medium text-gray-600">Grid Properties</label>
                            <InputField
                                label="Grid Template Columns"
                                value={values.styles.gridTemplateColumns}
                                onChange={(val) => handleStyleChange('gridTemplateColumns', val)}
                                placeholder="e.g., repeat(3, 1fr)"
                            />
                            <InputField
                                label="Grid Template Rows"
                                value={values.styles.gridTemplateRows}
                                onChange={(val) => handleStyleChange('gridTemplateRows', val)}
                                placeholder="e.g., auto"
                            />
                            <InputField
                                label="Gap"
                                value={values.styles.gap}
                                onChange={(val) => handleStyleChange('gap', val)}
                                placeholder="e.g., 1rem"
                            />
                            <SelectField
                                label="Justify Items"
                                value={values.styles.justifyItems}
                                onChange={(val) => handleStyleChange('justifyItems', val)}
                                options={['start', 'center', 'end', 'stretch']}
                            />
                            <SelectField
                                label="Align Items"
                                value={values.styles.alignItems}
                                onChange={(val) => handleStyleChange('alignItems', val)}
                                options={['start', 'center', 'end', 'stretch']}
                            />
                        </div>
                    )}
                </Section>

                {/* Spacing Section */}
                <Section title="Spacing" name="spacing">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Padding</label>
                        <div className="grid grid-cols-4 gap-2">
                            <InputField
                                label="Top"
                                value={values.styles.paddingTop}
                                onChange={(val) => handleStyleChange('paddingTop', val)}
                            />
                            <InputField
                                label="Right"
                                value={values.styles.paddingRight}
                                onChange={(val) => handleStyleChange('paddingRight', val)}
                            />
                            <InputField
                                label="Bottom"
                                value={values.styles.paddingBottom}
                                onChange={(val) => handleStyleChange('paddingBottom', val)}
                            />
                            <InputField
                                label="Left"
                                value={values.styles.paddingLeft}
                                onChange={(val) => handleStyleChange('paddingLeft', val)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Margin</label>
                        <div className="grid grid-cols-4 gap-2">
                            <InputField
                                label="Top"
                                value={values.styles.marginTop}
                                onChange={(val) => handleStyleChange('marginTop', val)}
                            />
                            <InputField
                                label="Right"
                                value={values.styles.marginRight}
                                onChange={(val) => handleStyleChange('marginRight', val)}
                            />
                            <InputField
                                label="Bottom"
                                value={values.styles.marginBottom}
                                onChange={(val) => handleStyleChange('marginBottom', val)}
                            />
                            <InputField
                                label="Left"
                                value={values.styles.marginLeft}
                                onChange={(val) => handleStyleChange('marginLeft', val)}
                            />
                        </div>
                    </div>
                </Section>

                {/* Typography Section */}
                <Section title="Typography" name="typography">
                    <FontSelectorWrapper
                        label="Font Family"
                        value={values.styles.fontFamily}
                        onChange={(val) => handleStyleChange('fontFamily', val)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Font Size"
                            value={values.styles.fontSize}
                            onChange={(val) => handleStyleChange('fontSize', val)}
                        />
                        <SelectField
                            label="Font Weight"
                            value={values.styles.fontWeight}
                            onChange={(val) => handleStyleChange('fontWeight', val)}
                            options={['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold', 'lighter', 'bolder']}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Line Height"
                            value={values.styles.lineHeight}
                            onChange={(val) => handleStyleChange('lineHeight', val)}
                        />
                        <SelectField
                            label="Text Align"
                            value={values.styles.textAlign}
                            onChange={(val) => handleStyleChange('textAlign', val)}
                            options={['left', 'center', 'right', 'justify']}
                        />
                    </div>
                    <SelectField
                        label="Text Decoration"
                        value={values.styles.textDecoration}
                        onChange={(val) => handleStyleChange('textDecoration', val)}
                        options={['none', 'underline', 'overline', 'line-through']}
                    />
                    <SelectField
                        label="Text Transform"
                        value={values.styles.textTransform}
                        onChange={(val) => handleStyleChange('textTransform', val)}
                        options={['none', 'capitalize', 'uppercase', 'lowercase']}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Letter Spacing"
                            value={values.styles.letterSpacing}
                            onChange={(val) => handleStyleChange('letterSpacing', val)}
                            placeholder="e.g., 0.5px"
                        />
                        <InputField
                            label="Word Spacing"
                            value={values.styles.wordSpacing}
                            onChange={(val) => handleStyleChange('wordSpacing', val)}
                            placeholder="e.g., 2px"
                        />
                    </div>
                    <SelectField
                        label="White Space"
                        value={values.styles.whiteSpace}
                        onChange={(val) => handleStyleChange('whiteSpace', val)}
                        options={['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line']}
                    />
                </Section>

                {/* Colors Section */}
                <Section title="Colors" name="colors">
                    <ColorPicker
                        label="Text Color"
                        value={values.styles.color}
                        onChange={(val) => handleStyleChange('color', val)}
                    />
                </Section>

                {/* Background Section */}
                <Section title="Background" name="background">
                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-4 border-b border-gray-200">
                        <button
                            onClick={() => setBackgroundTab('color')}
                            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                                backgroundTab === 'color'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Color
                        </button>
                        <div className="relative group">
                            <button
                                disabled
                                className="px-3 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-1 border-transparent text-gray-400 cursor-not-allowed"
                            >
                                <Upload className="w-4 h-4" />
                                Upload
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Coming Soon
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                        <div className="relative group">
                            <button
                                disabled
                                className="px-3 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-1 border-transparent text-gray-400 cursor-not-allowed"
                            >
                                <Wand2 className="w-4 h-4" />
                                Generate
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Coming Soon
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                    </div>

                    {/* Color Tab */}
                    {backgroundTab === 'color' && (
                        <>
                            <ColorPicker
                                label="Background Color"
                                value={values.styles.backgroundColor}
                                onChange={(val) => handleStyleChange('backgroundColor', val)}
                            />
                            <InputField
                                label="Background Image URL"
                                value={values.styles.backgroundImage}
                                onChange={(val) => handleStyleChange('backgroundImage', val)}
                                placeholder="url('...') or gradient"
                            />
                        </>
                    )}

                    {/* Upload Tab */}
                    {backgroundTab === 'upload' && (
                        <div className="space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            
                            {!uploadedImage ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                            <span className="text-sm text-gray-600">Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-700">Click to upload image</span>
                                            <span className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative rounded-lg overflow-hidden border border-gray-300">
                                        <img
                                            src={uploadedImage}
                                            alt="Uploaded"
                                            className="w-full h-40 object-cover"
                                        />
                                        <button
                                            onClick={handleDeleteImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => handleCropImage(uploadedImage)}
                                            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Crop className="w-3.5 h-3.5" />
                                            Crop
                                        </button>
                                        <button
                                            onClick={() => handleEditImage(uploadedImage)}
                                            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleRemoveBackground(uploadedImage)}
                                            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Scissors className="w-3.5 h-3.5" />
                                            Remove BG
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generate Tab */}
                    {backgroundTab === 'generate' && (
                        <div className="space-y-3">
                            {!generatedImage ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Describe the image you want
                                        </label>
                                        <textarea
                                            value={imagePrompt}
                                            onChange={(e) => setImagePrompt(e.target.value)}
                                            placeholder="e.g., A beautiful sunset over mountains with vibrant colors"
                                            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-20"
                                            disabled={isGenerating}
                                        />
                                    </div>
                                    <button
                                        onClick={handleImageGenerate}
                                        disabled={isGenerating || !imagePrompt.trim()}
                                        className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-4 h-4" />
                                                Generate Image
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative rounded-lg overflow-hidden border border-gray-300">
                                        <img
                                            src={generatedImage}
                                            alt="Generated"
                                            className="w-full h-40 object-cover"
                                        />
                                        <button
                                            onClick={handleDeleteImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => handleCropImage(generatedImage)}
                                            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Crop className="w-3.5 h-3.5" />
                                            Crop
                                        </button>
                                        <button
                                            onClick={() => handleEditImage(generatedImage)}
                                            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleRemoveBackground(generatedImage)}
                                            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Scissors className="w-3.5 h-3.5" />
                                            Remove BG
                                        </button>
                                    </div>
                                    
                                    <button
                                        onClick={() => {
                                            setGeneratedImage(null)
                                            setBackgroundTab('generate')
                                        }}
                                        className="w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Wand2 className="w-4 h-4" />
                                        Generate Another
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Common Background Settings */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 mt-3">
                        <SelectField
                            label="Background Size"
                            value={values.styles.backgroundSize}
                            onChange={(val) => handleStyleChange('backgroundSize', val)}
                            options={['auto', 'cover', 'contain', '100%', '100% 100%']}
                        />
                        <SelectField
                            label="Background Repeat"
                            value={values.styles.backgroundRepeat}
                            onChange={(val) => handleStyleChange('backgroundRepeat', val)}
                            options={['repeat', 'no-repeat', 'repeat-x', 'repeat-y']}
                        />
                    </div>
                    <SelectField
                        label="Background Position"
                        value={values.styles.backgroundPosition}
                        onChange={(val) => handleStyleChange('backgroundPosition', val)}
                        options={['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right']}
                    />
                </Section>

                {/* Border Section */}
                <Section title="Border" name="border">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Border Width"
                            value={values.styles.borderWidth}
                            onChange={(val) => handleStyleChange('borderWidth', val)}
                        />
                        <SelectField
                            label="Border Style"
                            value={values.styles.borderStyle}
                            onChange={(val) => handleStyleChange('borderStyle', val)}
                            options={['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset']}
                        />
                    </div>
                    <ColorPicker
                        label="Border Color"
                        value={values.styles.borderColor}
                        onChange={(val) => handleStyleChange('borderColor', val)}
                    />
                    <InputField
                        label="Border Radius"
                        value={values.styles.borderRadius}
                        onChange={(val) => handleStyleChange('borderRadius', val)}
                    />
                </Section>

                {/* Transform Section */}
                <Section title="Transform" name="transform">
                    <InputField
                        label="Transform (CSS)"
                        value={values.styles.transform}
                        onChange={(val) => handleStyleChange('transform', val)}
                        placeholder="e.g., rotate(45deg) scale(1.1)"
                    />
                    <div className="mt-2 pt-2 border-t border-gray-300">
                        <label className="block text-xs font-medium text-gray-600 mb-2">Quick Transforms</label>
                        <div className="grid grid-cols-3 gap-2">
                            <InputField
                                label="Rotate (deg)"
                                type="number"
                                placeholder="0"
                                onChange={(val) => handleStyleChange('transform', `rotate(${val}deg)`)}
                            />
                            <InputField
                                label="Scale"
                                type="number"
                                step="0.1"
                                placeholder="1"
                                onChange={(val) => handleStyleChange('transform', `scale(${val})`)}
                            />
                            <InputField
                                label="Translate X"
                                placeholder="0px"
                                onChange={(val) => handleStyleChange('transform', `translateX(${val})`)}
                            />
                        </div>
                    </div>
                </Section>

                {/* Effects Section */}
                <Section title="Visual Effects" name="effects">
                    <InputField
                        label="Opacity"
                        value={values.styles.opacity}
                        onChange={(val) => handleStyleChange('opacity', val)}
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                    />
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Box Shadow</label>
                        <textarea
                            value={values.styles.boxShadow || ''}
                            onChange={(e) => handleStyleChange('boxShadow', e.target.value)}
                            className='w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                            rows={2}
                            placeholder="e.g., 0 4px 6px rgba(0,0,0,0.1)"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Text Shadow</label>
                        <textarea
                            value={values.styles.textShadow || ''}
                            onChange={(e) => handleStyleChange('textShadow', e.target.value)}
                            className='w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                            rows={2}
                            placeholder="e.g., 2px 2px 4px rgba(0,0,0,0.3)"
                        />
                    </div>
                    <InputField
                        label="Filter"
                        value={values.styles.filter}
                        onChange={(val) => handleStyleChange('filter', val)}
                        placeholder="e.g., blur(5px) brightness(1.2)"
                    />
                </Section>

                {/* Advanced Section */}
                <Section title="Advanced" name="advanced">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Z-Index"
                            value={values.styles.zIndex}
                            onChange={(val) => handleStyleChange('zIndex', val)}
                            type="number"
                        />
                        <SelectField
                            label="Overflow"
                            value={values.styles.overflow}
                            onChange={(val) => handleStyleChange('overflow', val)}
                            options={['visible', 'hidden', 'scroll', 'auto']}
                        />
                    </div>
                    <SelectField
                        label="Cursor"
                        value={values.styles.cursor}
                        onChange={(val) => handleStyleChange('cursor', val)}
                        options={['default', 'pointer', 'text', 'move', 'help', 'wait', 'not-allowed', 'grab', 'grabbing', 'crosshair']}
                    />
                    <SelectField
                        label="User Select"
                        value={values.styles.userSelect}
                        onChange={(val) => handleStyleChange('userSelect', val)}
                        options={['auto', 'none', 'text', 'all']}
                    />
                    <SelectField
                        label="Pointer Events"
                        value={values.styles.pointerEvents}
                        onChange={(val) => handleStyleChange('pointerEvents', val)}
                        options={['auto', 'none']}
                    />
                    <InputField
                        label="Transition"
                        value={values.styles.transition}
                        onChange={(val) => handleStyleChange('transition', val)}
                        placeholder="e.g., all 0.3s ease"
                    />
                    <SelectField
                        label="List Style Type"
                        value={values.styles.listStyleType}
                        onChange={(val) => handleStyleChange('listStyleType', val)}
                        options={['none', 'disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman']}
                    />
                </Section>
            </div>

            {/* Image Editing Modals */}
            {showCropModal && currentImageForEdit && (
                <ImageCropModal
                    imageUrl={currentImageForEdit}
                    onSave={handleSaveEditedImage}
                    onClose={() => {
                        setShowCropModal(false)
                        setCurrentImageForEdit(null)
                    }}
                />
            )}

            {showEditModal && currentImageForEdit && (
                <ImageEditModal
                    imageUrl={currentImageForEdit}
                    onSave={handleSaveEditedImage}
                    onClose={() => {
                        setShowEditModal(false)
                        setCurrentImageForEdit(null)
                    }}
                />
            )}

            {showBgRemovalModal && currentImageForEdit && (
                <BackgroundRemovalModal
                    imageUrl={currentImageForEdit}
                    onSave={handleSaveEditedImage}
                    onClose={() => {
                        setShowBgRemovalModal(false)
                        setCurrentImageForEdit(null)
                    }}
                />
            )}
        </div>
    )
}
