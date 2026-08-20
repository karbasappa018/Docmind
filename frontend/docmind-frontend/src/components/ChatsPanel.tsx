import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageSquare, Plus, Trash2, Clock, MessageSquarePlus, Search, Edit2, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '../store/conversationStore';
import { useDocumentStore } from '../store/documentStore';
import type { Conversation } from '../types';
import { clsx } from 'clsx';

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getGroupLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const startOfLast7Days = new Date(startOfToday.getTime() - 7 * 86400000);

    if (date >= startOfToday) return 'Today';
    if (date >= startOfYesterday) return 'Yesterday';
    if (date >= startOfLast7Days) return 'Previous 7 Days';
    return 'Older';
  } catch {
    return 'Older';
  }
}

const SkeletonChat: React.FC = () => (
  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center gap-3 animate-pulse">
    <div className="w-7 h-7 rounded-lg bg-slate-800 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-slate-800 rounded w-4/5" />
      <div className="h-2 bg-slate-800/60 rounded w-1/3" />
    </div>
  </div>
);

const ChatItem: React.FC<{
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}> = ({ conversation, isActive, onSelect, onDelete, onRename }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conversation.title);
    setIsEditing(true);
  };

  const handleSaveEdit = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim() && editTitle.trim() !== conversation.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit(e as unknown as React.MouseEvent);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onClick={isEditing ? undefined : onSelect}
      className={clsx(
        'group relative flex items-center justify-between gap-2.5 p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        isActive
          ? 'border-indigo-500/60 bg-indigo-500/10 shadow-sm shadow-indigo-500/10 text-white'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850 text-slate-300 hover:text-white'
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div
          className={clsx(
            'p-1.5 rounded-lg flex-shrink-0 mt-0.5 transition-colors',
            isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-950 text-slate-400 group-hover:text-slate-300'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-950 border border-indigo-500 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                aria-label="Edit chat title"
              />
              <button
                onClick={handleSaveEdit}
                aria-label="Save chat title"
                className="p-1 hover:bg-indigo-500/20 text-indigo-400 rounded transition focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelEdit}
                aria-label="Cancel editing"
                className="p-1 hover:bg-slate-800 text-slate-400 rounded transition focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium truncate leading-tight">
                {conversation.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                <span className="text-[10px] text-slate-500">
                  {formatRelativeTime(conversation.updatedAt)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleStartEdit}
            aria-label="Rename conversation"
            className="p-1 rounded-lg transition-all text-xs opacity-0 group-hover:opacity-100 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Rename chat"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            aria-label={confirmDelete ? 'Confirm delete conversation' : 'Delete conversation'}
            className={clsx(
              'p-1 rounded-lg transition-all text-xs cursor-pointer focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-500',
              confirmDelete
                ? 'bg-red-500/20 text-red-400 px-2 font-medium opacity-100'
                : 'opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-slate-400'
            )}
            title="Delete chat"
          >
            {confirmDelete ? 'Sure?' : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export const ChatsPanel: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    isLoadingChats,
    newChat,
    selectChat,
    deleteChat,
    renameChat,
  } = useConversationStore();
  const { setActiveTab } = useDocumentStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewChat = () => {
    newChat();
    setActiveTab('chat');
  };

  const handleSelectChat = (id: string) => {
    selectChat(id);
    setActiveTab('chat');
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Group by date
  const groupedConversations = useMemo(() => {
    const groups: Record<string, Conversation[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filteredConversations.forEach((chat) => {
      const label = getGroupLabel(chat.updatedAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(chat);
    });

    return groups;
  }, [filteredConversations]);

  const groupKeys = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'] as const;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* New chat prominent CTA */}
      <div className="p-3 border-b border-slate-800/80 flex-shrink-0 space-y-2">
        <button
          onClick={handleNewChat}
          aria-label="Start a new chat"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Search filter input if we have chats */}
        {conversations.length > 3 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 text-xs rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoadingChats ? (
          <div className="space-y-2">
            <SkeletonChat />
            <SkeletonChat />
            <SkeletonChat />
          </div>
        ) : conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center h-56 text-center px-4"
          >
            <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
              <MessageSquarePlus className="w-6 h-6 text-indigo-400/80" />
            </div>
            <p className="text-xs text-slate-300 font-semibold">No chat history yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              Start a new conversation to ask questions about your documents
            </p>
            <button
              onClick={handleNewChat}
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              Start first chat &rarr;
            </button>
          </motion.div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No conversations match "{searchQuery}"
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {groupKeys.map((key) => {
              const items = groupedConversations[key];
              if (!items || items.length === 0) return null;

              return (
                <div key={key} className="space-y-1.5">
                  <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {key}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        conversation={chat}
                        isActive={activeConversationId === chat.id}
                        onSelect={() => handleSelectChat(chat.id)}
                        onDelete={() => deleteChat(chat.id)}
                        onRename={(newTitle) => renameChat(chat.id, newTitle)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ChatsPanel;
