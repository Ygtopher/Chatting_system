import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  // Profile Picture state
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.profilePicture || '/default-avatar.png'
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA state
  const [has2FA, setHas2FA] = useState<boolean>(false);
  const [loading2FA, setLoading2FA] = useState(false);
  const [twoFaMsg, setTwoFaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch 2FA status & profile info
  useEffect(() => {
    fetchProfileInfo();
  }, []);

  const fetchProfileInfo = async () => {
    try {
      const res = await usersApi.getProfile();
      if (res.data.profilePictureUrl) {
        setAvatarUrl(res.data.profilePictureUrl);
      }
      setHas2FA(!!res.data.has2FA);
    } catch (err) {
      console.error('Failed to load profile details:', err);
    }
  };

  // Handle Avatar Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setAvatarSuccess(null);
    setAvatarError(null);

    try {
      const response = await usersApi.uploadAvatar(file);
      const newUrl = response.data.profilePictureUrl;
      setAvatarUrl(newUrl);
      setAvatarSuccess('Profile picture updated successfully!');
    } catch (err: any) {
      setAvatarError(
        err.response?.data?.error || 'Failed to upload profile picture. Please try again.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Password Change Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      await usersApi.updatePassword(newPassword);
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.error || 'Failed to update password. Please try again.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Toggle / Disable 2FA
  const handleDisable2FA = async () => {
    setLoading2FA(true);
    setTwoFaMsg(null);
    try {
      await usersApi.disable2FA();
      setHas2FA(false);
      setTwoFaMsg({ type: 'success', text: 'Two-Factor Authentication (2FA) is now DISABLED. Standard email & password login enabled.' });
      await fetchProfileInfo();
    } catch (err: any) {
      setTwoFaMsg({
        type: 'error',
        text: err.response?.data?.error || err.response?.data?.message || 'Failed to disable 2FA.',
      });
    } finally {
      setLoading2FA(false);
    }
  };

  const handleEnable2FA = async () => {
    setLoading2FA(true);
    setTwoFaMsg(null);
    try {
      await usersApi.enable2FA('enabled_user_2fa_secret');
      setHas2FA(true);
      setTwoFaMsg({ type: 'success', text: 'Two-Factor Authentication (2FA) is now ENABLED! A 6-digit verification code will be required when logging in.' });
      await fetchProfileInfo();
    } catch (err: any) {
      setTwoFaMsg({
        type: 'error',
        text: err.response?.data?.error || err.response?.data?.message || 'Failed to enable 2FA.',
      });
    } finally {
      setLoading2FA(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>

        {/* Profile Card Header */}
        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 mb-6 space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar Container */}
            <div className="relative group">
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-md bg-gray-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.username || 'User');
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition flex items-center justify-center cursor-pointer"
                title="Upload Profile Picture"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{user?.username || 'User Profile'}</h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="btn btn-secondary text-sm flex items-center space-x-2"
            >
              <span>{uploadingAvatar ? 'Uploading...' : 'Change Picture'}</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {avatarSuccess && (
            <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
              {avatarSuccess}
            </div>
          )}
          {avatarError && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {avatarError}
            </div>
          )}

          {/* Settings Section */}
          <div className="space-y-6 border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Security & Account Settings</h2>

            {/* Password Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
              <div>
                <h3 className="font-medium text-gray-800">Password</h3>
                <p className="text-xs text-gray-500">Update your account password regularly to stay secure.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPasswordSuccess(null);
                  setPasswordError(null);
                  setShowPasswordModal(true);
                }}
                className="btn btn-primary text-sm px-4 py-2"
              >
                Change Password
              </button>
            </div>

            {/* Two-Factor Authentication Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-800">Two-Factor Authentication (2FA)</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${has2FA
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-200 text-gray-700'
                      }`}
                  >
                    {has2FA ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Adds an extra layer of security to your account during login.
                </p>
              </div>

              {has2FA ? (
                <button
                  type="button"
                  onClick={handleDisable2FA}
                  disabled={loading2FA}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
                >
                  {loading2FA ? 'Processing...' : 'Disable 2FA'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnable2FA}
                  disabled={loading2FA}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
                >
                  {loading2FA ? 'Processing...' : 'Enable 2FA'}
                </button>
              )}
            </div>

            {/* 2FA Message Banner */}
            {twoFaMsg && (
              <div
                className={`p-3 rounded-lg text-sm border ${twoFaMsg.type === 'success'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                  }`}
              >
                {twoFaMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fadeIn">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              &times;
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-4">Change Password</h3>

            {passwordSuccess && (
              <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-md text-sm">
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full"
                  placeholder="Enter new password (min. 6 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input w-full"
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn btn-primary text-sm"
                >
                  {passwordLoading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;