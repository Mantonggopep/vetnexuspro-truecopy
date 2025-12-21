// 3-LAYER BACKGROUND DESIGN
// Layer 1: Teal | Layer 2: Rose Gold | Layer 3: Lavender

// Add this to the main content area wrapper in ClientPortal.tsx
// Replace the current main element (around line 296)

{/* Dynamic Content Area with 3-Layer Background */ }
<main className="flex-1 overflow-y-auto pb-24 md:pb-8 p-3 md:p-6 lg:p-10 animate-fade-in relative">
    {/* Layer 1: Teal - Bottom Layer */}
    <div className="fixed inset-0 bg-teal-50/40 -z-10"></div>
    
    {/* Layer 2: Rose Gold - Middle Layer */}
    <div className="fixed inset-0 bg-[#E8C4B8]/20 -z-10"></div>
    
    {/* Layer 3: Lavender - Top Layer */}
    <div className="fixed inset-0 bg-lavender-50/30 -z-10"></div>
    
    {/* Decorative Blur Circles for Depth */}
    <div className="fixed top-20 right-20 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl -z-10"></div>
    <div className="fixed bottom-20 left-20 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl -z-10"></div>
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-100/15 rounded-full blur-3xl -z-10"></div>

    {/* Your existing content goes here */}
    {view === 'dashboard' && (
        // ... dashboard content
    )}
</main>

// ALTERNATIVE: If you want the layers to blend more naturally
// Use this version instead:

<main className="flex-1 overflow-y-auto pb-24 md:pb-8 p-3 md:p-6 lg:p-10 animate-fade-in relative bg-gradient-to-br from-teal-50/30 via-[#E8C4B8]/20 to-purple-50/30">
    {/* Subtle texture overlay */}
    <div className="fixed inset-0 bg-white/40 -z-10"></div>
    
    {/* Decorative elements for depth */}
    <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-teal-100/20 rounded-full blur-3xl -z-10 -mr-40 -mt-40"></div>
    <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-rose-100/20 rounded-full blur-3xl -z-10 -ml-40 -mb-40"></div>
    <div className="fixed top-1/3 right-1/3 w-[400px] h-[400px] bg-purple-100/15 rounded-full blur-3xl -z-10"></div>

    {/* Your existing content */}
</main>

// COLOR DEFINITIONS
// Add these to your tailwind.config.js if needed:

module.exports = {
    theme: {
        extend: {
            colors: {
                'rose-gold': '#E8C4B8',
                lavender: {
                    50: '#F5F3FF',
                    100: '#EDE9FE',
                    // ... etc
                }
            }
        }
    }
}

// OR use direct hex values:
// Teal: #CCFBF1 (teal-50)
// Rose Gold: #E8C4B8 (custom)
// Lavender: #F5F3FF (purple-50/lavender-50)
