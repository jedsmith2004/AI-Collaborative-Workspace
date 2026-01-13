import { useState } from 'react';
import { X, UserPlus, Mail, Shield } from 'lucide-react';
import { inviteCollaborator } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

// Permission levels matching backend
const PERMISSION_VIEWER = 1;
const PERMISSION_EDITOR = 2;

interface InviteCollaboratorModalProps {
  workspaceId: string;
  workspaceName: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

export default function InviteCollaboratorModal({
  workspaceId,
  workspaceName,
  isOpen,
  onClose,
  onInviteSent,
}: InviteCollaboratorModalProps) {
  const { token } = useAuth();
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState(PERMISSION_EDITOR);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await inviteCollaborator(workspaceId, email.trim(), permissionLevel, token);
      setSuccess(`Invitation sent to ${email}`);
      setEmail('');
      onInviteSent();
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to send invitation';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <UserPlus size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Invite Collaborator</h2>
              <p className="text-sm text-gray-400">to {workspaceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                disabled={isLoading}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              The user must have an account to be invited
            </p>
          </div>

          {/* Permission Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Shield size={16} />
                Permission Level
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPermissionLevel(PERMISSION_VIEWER)}
                className={`p-3 rounded-lg border transition-all ${
                  permissionLevel === PERMISSION_VIEWER
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-medium">Viewer</div>
                <div className="text-xs mt-1 opacity-70">Can view notes only</div>
              </button>
              <button
                type="button"
                onClick={() => setPermissionLevel(PERMISSION_EDITOR)}
                className={`p-3 rounded-lg border transition-all ${
                  permissionLevel === PERMISSION_EDITOR
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-medium">Editor</div>
                <div className="text-xs mt-1 opacity-70">Can view and edit notes</div>
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Send Invitation
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
