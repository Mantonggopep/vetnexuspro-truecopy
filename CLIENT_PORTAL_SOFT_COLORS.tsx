// UPDATED CLIENT PORTAL DASHBOARD - SOFT COLORS, NO GRADIENTS
// 3-Layer Background: Teal → Rose Gold → Lavender

// Add this to ClientPortal.tsx after the welcome header (around line 313)

{/* Navigation Cards Grid - Soft Colorful Design */ }
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
    {/* Pets Card - Soft Blue */}
    <button
        onClick={() => setView('records')}
        className="group relative bg-blue-100 rounded-3xl p-6 text-blue-700 shadow-lg hover:shadow-blue-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-blue-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-blue-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <PawPrint className="w-8 h-8 text-blue-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">My Pets</span>
            <span className="text-xs opacity-80 font-medium">{myPatients.length} Registered</span>
        </div>
    </button>

    {/* Chat Card - Soft Teal */}
    <button
        onClick={() => setView('chat')}
        className="group relative bg-teal-100 rounded-3xl p-6 text-teal-700 shadow-lg hover:shadow-teal-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-teal-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-teal-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <MessageSquare className="w-8 h-8 text-teal-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Clinic Chat</span>
            <span className="text-xs opacity-80 font-medium">Medical Team</span>
        </div>
    </button>

    {/* Schedule Card - Soft Purple */}
    <button
        onClick={() => setShowRequestForm(true)}
        className="group relative bg-purple-100 rounded-3xl p-6 text-purple-700 shadow-lg hover:shadow-purple-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-purple-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-purple-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <Calendar className="w-8 h-8 text-purple-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Schedule</span>
            <span className="text-xs opacity-80 font-medium">Book Visit</span>
        </div>
    </button>

    {/* Shop Card - Soft Orange */}
    <button
        onClick={() => setView('shop')}
        className="group relative bg-orange-100 rounded-3xl p-6 text-orange-700 shadow-lg hover:shadow-orange-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-orange-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-orange-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 relative">
                <ShoppingBag className="w-8 h-8 text-orange-600" />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-xs font-black flex items-center justify-center rounded-full border-2 border-white">{cart.length}</span>}
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Pet Shop</span>
            <span className="text-xs opacity-80 font-medium">Premium Supplies</span>
        </div>
    </button>

    {/* Billing Card - Soft Emerald */}
    <button
        onClick={() => setView('finance')}
        className="group relative bg-emerald-100 rounded-3xl p-6 text-emerald-700 shadow-lg hover:shadow-emerald-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-emerald-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-emerald-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <CreditCard className="w-8 h-8 text-emerald-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Billing</span>
            <span className="text-xs opacity-80 font-medium">Invoices & Payments</span>
        </div>
    </button>

    {/* Records Card - Soft Indigo */}
    <button
        onClick={() => setView('records')}
        className="group relative bg-indigo-100 rounded-3xl p-6 text-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-indigo-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-indigo-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <FileText className="w-8 h-8 text-indigo-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Records</span>
            <span className="text-xs opacity-80 font-medium">Medical History</span>
        </div>
    </button>

    {/* Settings Card - Soft Slate */}
    <button
        onClick={() => setView('settings')}
        className="group relative bg-slate-100 rounded-3xl p-6 text-slate-700 shadow-lg hover:shadow-slate-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-slate-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <Settings className="w-8 h-8 text-slate-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Settings</span>
            <span className="text-xs opacity-80 font-medium">Profile & Security</span>
        </div>
    </button>

    {/* Services Card - Soft Rose */}
    <button
        onClick={() => setView('services')}
        className="group relative bg-rose-100 rounded-3xl p-6 text-rose-700 shadow-lg hover:shadow-rose-200 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden border-2 border-rose-200"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-rose-200 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <Stethoscope className="w-8 h-8 text-rose-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider">Services</span>
            <span className="text-xs opacity-80 font-medium">Available Treatments</span>
        </div>
    </button>
</div>
