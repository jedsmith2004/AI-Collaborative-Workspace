import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Users, Clock } from 'lucide-react';
import { getInvitations, acceptInvitation, declineInvitation, type Invitation } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationsDropdownProps {
  onAccept?: () => void; // Callback when invitation is accepted
}

const PERMISSION_LABELS: Record<number, string> = {
  1: 'Viewer',
  2: 'Editor',
  3: 'Owner',
};

export default function NotificationsDropdown({ onAccept }: NotificationsDropdownProps) {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch invitations when component mounts or token changes
  useEffect(() => {
    if (token) {
      fetchInvitations();
    }
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInvitations = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const data = await getInvitations(token);
      setInvitations(data);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    if (!token) return;
    
    setProcessingIds(prev => new Set(prev).add(invitation.id));
    try {
      await acceptInvitation(invitation.id, token);
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      onAccept?.();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const handleDecline = async (invitation: Invitation) => {
    if (!token) return;
    
    setProcessingIds(prev => new Set(prev).add(invitation.id));
    try {
      await declineInvitation(invitation.id, token);
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchInvitations();
        }}
        className="relative p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell size={20} className="text-gray-300" />
        {invitations.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {invitations.length > 9 ? '9+' : invitations.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifications</h3>
            {invitations.length > 0 && (
              <span className="text-xs text-gray-400">{invitations.length} pending</span>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No pending invitations</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {invitations.map((invitation) => {
                  const isProcessing = processingIds.has(invitation.id);
                  
                  return (
                    <div 
                      key={invitation.id}
                      className="p-4 hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                          <Users size={18} className="text-indigo-400" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-medium">{invitation.invited_by}</span>
                            {' '}invited you to join
                          </p>
                          <p className="text-sm font-medium text-indigo-400 truncate">
                            {invitation.workspace_name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatTimeAgo(invitation.invited_at)}
                            </span>
                            <span className="px-1.5 py-0.5 bg-gray-700 rounded">
                              {PERMISSION_LABELS[invitation.permission_level] || 'Member'}
                            </span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleAccept(invitation)}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              {isProcessing ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(invitation)}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-600/50 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <X size={14} />
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
