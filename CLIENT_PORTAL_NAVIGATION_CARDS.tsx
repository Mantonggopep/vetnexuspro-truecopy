// CLIENT PORTAL DASHBOARD - CARD-BASED NAVIGATION
// Replace the sidebar navigation with this card grid on the dashboard

// Add this after the welcome header (around line 313 in ClientPortal.tsx)

{/* Navigation Cards Grid - Inspired by Reference Image */ }
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
    {/* Pets Card */}
    <button
        onClick={() => setView('records')}
        className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <PawPrint className="w-8 h-8" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">My Pets</span>
            <span className="text-xs opacity-80 font-medium">{myPatients.length} Registered</span>
        </div>
    </button>

    {/* Chat Card */}
    <button
        onClick={() => setView('chat')}
        className="group relative bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-teal-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <MessageSquare className="w-8 h-8" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Clinic Chat</span>
            <span className="text-xs opacity-80 font-medium">Medical Team</span>
        </div>
    </button>

    {/* Schedule Card */}
    <button
        onClick={() => setShowRequestForm(true)}
        className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <Calendar className="w-8 h-8" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Schedule</span>
            <span className="text-xs opacity-80 font-medium">Book Visit</span>
        </div>
    </button>

    {/* Shop Card */}
    <button
        onClick={() => setView('shop')}
        className="group relative bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 relative">
                <ShoppingBag className="w-8 h-8" />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-xs font-black flex items-center justify-center rounded-full border-2 border-white">{cart.length}</span>}
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Pet Shop</span>
            <span className="text-xs opacity-80 font-medium">Premium Supplies</span>
        </div>
    </button>

    {/* Billing Card */}
    <button
        onClick={() => setView('finance')}
        className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <CreditCard className="w-8 h-8" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Billing</span>
            <span className="text-xs opacity-80 font-medium">Invoices & Payments</span>
        </div>
    </button>

    {/* Records Card */}
    <button
        onClick={() => setView('records')}
        className="group relative bg-gradient-to-br from-slate-600 to-slate-800 rounded-3xl p-6 text-white shadow-2xl hover:shadow-slate-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <FileText className="w-8 h-8" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Records</span>
            <span className="text-xs opacity-80 font-medium">Medical History</span>
        </div>
    </button>

    {/* Settings Card */}
    <button
        onClick={() => setView('settings')}
        className="group relative bg-gradient-to-br from-gray-500 to-slate-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-gray-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <Settings className="w-8 h-8" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Settings</span>
            <span className="text-xs opacity-80 font-medium">Profile & Security</span>
        </div>
    </button>

    {/* Services Card (Optional 8th card) */}
    <button
        onClick={() => setView('services')}
        className="group relative bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-2xl hover:shadow-rose-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <Stethoscope className="w-8 h-8" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Services</span>
            <span className="text-xs opacity-80 font-medium">Available Treatments</span>
        </div>
    </button>
</div>

// IMPORTANT: Remove the sidebar navigation (lines 268-293)
// Replace with this card grid on the dashboard view only
// Keep the bottom mobile nav for non-dashboard views
