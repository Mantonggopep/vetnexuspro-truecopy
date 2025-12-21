import React, { useState, useEffect, useRef } from 'react';
import { User, AppState, ChatMessage as ChatMsg, UserRole, StaffChatMessage } from '../types';
import { X, Send, Users, MessageCircle, AlertCircle, User as UserIcon, Radio, Mic, ChevronLeft } from 'lucide-react';

// Local interface removed to use global one from types.ts

interface Props {
    currentUser: User;
    state: AppState;
    onClose: () => void;
    onSendMessage: (message: StaffChatMessage) => void;
}

export const StaffChat: React.FC<Props> = ({ currentUser, state, onClose, onSendMessage }) => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isBroadcastMode, setIsBroadcastMode] = useState(false);
    const [showUserList, setShowUserList] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get all staff members from the same tenant (exclude pet owners and current user)
    const staffMembers = state.users.filter(
        u => u.tenantId === currentUser.tenantId &&
            u.role !== UserRole.PET_OWNER &&
            u.id !== currentUser.id &&
            u.active
    );

    // Use global messages from state instead of local state
    const messages = state.staffMessages || [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (!messageText.trim()) return;

        const newMessage: StaffChatMessage = {
            id: `staff_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromUserId: currentUser.id,
            toUserId: isBroadcastMode ? undefined : selectedUser?.id,
            tenantId: currentUser.tenantId!,
            content: messageText.trim(),
            timestamp: new Date().toISOString(),
            isRead: false,
            isBroadcast: isBroadcastMode
        };

        onSendMessage(newMessage);
        setMessageText('');
    };

    const groupByDate = (messages: StaffChatMessage[]) => {
        const groups: Record<string, StaffChatMessage[]> = {};
        messages.forEach(msg => {
            const date = new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const getFilteredMessages = () => {
        if (isBroadcastMode) {
            return messages.filter(m => m.isBroadcast);
        }
        if (!selectedUser) return [];
        return messages.filter(
            m => !m.isBroadcast && (
                (m.fromUserId === currentUser.id && m.toUserId === selectedUser.id) ||
                (m.fromUserId === selectedUser.id && m.toUserId === currentUser.id)
            )
        );
    };

    const filteredMessages = getFilteredMessages();
    const groupedMessages = groupByDate(filteredMessages);

    const isAdmin = ['SUPER_ADMIN', 'PARENT_ADMIN', 'ADMIN'].includes(currentUser.role);

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
            case 'PARENT_ADMIN':
                return 'text-purple-600';
            case 'ADMIN':
                return 'text-blue-600';
            case 'VET':
                return 'text-teal-600';
            case 'NURSE':
                return 'text-pink-600';
            case 'RECEPTION':
                return 'text-amber-600';
            default:
                return 'text-slate-600';
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
            case 'PARENT_ADMIN':
                return 'bg-purple-100 text-purple-700';
            case 'ADMIN':
                return 'bg-blue-100 text-blue-700';
            case 'VET':
                return 'bg-teal-100 text-teal-700';
            case 'NURSE':
                return 'bg-pink-100 text-pink-700';
            case 'RECEPTION':
                return 'bg-amber-100 text-amber-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            <div className="bg-white sm:rounded-3xl shadow-2xl w-full max-w-6xl h-full sm:h-[85vh] flex overflow-hidden relative">
                {/* Left Sidebar - Staff List */}
                <div className={`${showUserList ? 'w-full sm:w-80 absolute sm:relative z-20 inset-0' : 'w-0 hidden'} transition-all duration-300 border-r border-slate-100 flex flex-col overflow-hidden bg-slate-50`}>
                    <div className="p-4 bg-[#00a884] text-white flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold tracking-tight">Staff Chat</h3>
                        </div>
                        <button onClick={() => setShowUserList(false)} className="sm:hidden p-2 text-white/80 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Broadcast Option for Admins */}
                    {isAdmin && (
                        <div className="p-2 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                            <button
                                onClick={() => {
                                    setIsBroadcastMode(true);
                                    setSelectedUser(null);
                                    if (window.innerWidth < 640) setShowUserList(false);
                                }}
                                className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${isBroadcastMode
                                    ? 'bg-rose-50 border-rose-200'
                                    : 'bg-white border-transparent hover:bg-slate-50'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                    <Radio className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Broadcast</p>
                                    <p className="text-xs text-slate-500">To everyone</p>
                                </div>
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {staffMembers.map((staff) => (
                            <button
                                key={staff.id}
                                onClick={() => {
                                    setSelectedUser(staff);
                                    setIsBroadcastMode(false);
                                    if (window.innerWidth < 640) setShowUserList(false);
                                }}
                                className={`w-full p-3 border-b border-slate-100 transition-all text-left flex items-center gap-3 hover:bg-slate-50 ${selectedUser?.id === staff.id && !isBroadcastMode ? 'bg-slate-100' : 'bg-white'}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                                    {staff.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-sm font-bold text-slate-900 truncate">{staff.name}</p>
                                        <span className="text-[10px] text-slate-400">12:30</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{staff.title}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Side - Chat Area */}
                <div className="flex-1 flex flex-col bg-[#efeae2] relative">
                    {/* Chat Header */}
                    <div className="h-16 px-4 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowUserList(!showUserList)}
                                className="sm:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-full"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            {selectedUser || isBroadcastMode ? (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-white font-bold">
                                        {isBroadcastMode ? <Radio className="w-5 h-5" /> : selectedUser?.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">
                                            {isBroadcastMode ? 'Broadcast' : selectedUser?.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">{isBroadcastMode ? 'All Staff' : 'Online'}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm font-medium text-slate-500">Select a chat</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-all"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-95">
                        {!selectedUser && !isBroadcastMode ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <span className="bg-[#e1f3fb] text-slate-600 px-4 py-2 rounded-lg shadow-sm text-xs mt-4">
                                    Select a contact to start chatting
                                </span>
                            </div>
                        ) : (
                            <>
                                {Object.entries(groupedMessages).map(([date, msgs]) => (
                                    <div key={date} className="space-y-2">
                                        <div className="flex justify-center my-4">
                                            <span className="px-4 py-1.5 bg-slate-200/50 backdrop-blur-md rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm border border-slate-200/50">{date}</span>
                                        </div>
                                        {msgs.map((msg) => {
                                            const isOwn = msg.fromUserId === currentUser.id;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] sm:max-w-[65%] p-2 px-3 rounded-lg shadow-sm relative text-sm ${isOwn
                                                            ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                                                            : 'bg-white text-slate-900 rounded-tl-none'
                                                            }`}
                                                    >
                                                        {msg.isBroadcast && (
                                                            <p className="text-[10px] font-bold text-rose-500 mb-1 uppercase">Broadcast</p>
                                                        )}
                                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                        <div className="flex justify-end items-center gap-1 mt-1">
                                                            <span className="text-[10px] text-slate-500 min-w-[40px] text-right">
                                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>

                                                        {/* Tail Pseudo-element simulation */}
                                                        <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent ${isOwn
                                                            ? '-right-[6px] border-t-[#d9fdd3] border-l-[#d9fdd3]'
                                                            : '-left-[6px] border-t-white border-r-white'
                                                            }`}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    {(selectedUser || isBroadcastMode) && (
                        <div className="p-2 sm:p-3 bg-[#f0f2f5] flex items-end gap-2">
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message"
                                className="flex-1 py-3 px-4 bg-white border border-transparent focus:border-white rounded-lg focus:outline-none focus:ring-0 text-sm shadow-sm"
                            />
                            {messageText.trim() ? (
                                <button
                                    onClick={handleSendMessage}
                                    className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] shadow-md transition-all active:scale-95 flex-shrink-0"
                                >
                                    <Send className="w-5 h-5 fill-current" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => alert("Voice notes coming soon!")}
                                    className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] shadow-md transition-all active:scale-95 flex-shrink-0"
                                >
                                    <Mic className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
