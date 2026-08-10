import { useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  UserIcon,
  UserPlusIcon,
  ArrowLeftOnRectangleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, logout, user } = useAuth();
  const { totalUnread, toast, clearToast, pendingRequestsCount } = useChat();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navLinks = [
    {
      name: 'Home',
      path: '/',
      icon: <HomeIcon className="w-6 h-6" />,
      authRequired: true
    },
    {
      name: 'Chat',
      path: '/chat',
      icon: <ChatBubbleLeftRightIcon className="w-6 h-6" />,
      authRequired: true
    },
    {
      name: 'Friends',
      path: '/friends',
      icon: <UserPlusIcon className="w-6 h-6" />,
      authRequired: true
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: <UserIcon className="w-6 h-6" />,
      authRequired: true
    },
    {
      name: 'Login',
      path: '/login',
      icon: null,
      authRequired: false
    },
    {
      name: 'Register',
      path: '/register',
      icon: null,
      authRequired: false
    }
  ];

  // Auto dismiss popout notification after 6 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  const filteredNavLinks = navLinks.filter(link => 
    (isAuthenticated && link.authRequired) || (!isAuthenticated && !link.authRequired)
  );

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Realtime Popout Notification */}
      {toast && (
        <div 
          onClick={() => {
            clearToast();
            if (toast.type === 'FRIEND_REQUEST') {
              navigate('/friends');
            } else {
              navigate('/chat', { state: { chatRoomId: toast.chatRoomId } });
            }
          }}
          className={`fixed top-5 right-5 z-50 bg-white/95 backdrop-blur-md border shadow-2xl rounded-2xl p-4 max-w-sm w-84 cursor-pointer transition-all duration-300 transform hover:scale-105 border-l-4 ${
            toast.type === 'FRIEND_REQUEST' ? 'border-purple-600 border-purple-200' : 'border-blue-600 border-blue-300'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="relative">
              <div className={`w-11 h-11 text-white font-bold text-lg rounded-full flex items-center justify-center shadow-md ${
                toast.type === 'FRIEND_REQUEST' ? 'bg-gradient-to-tr from-purple-600 to-pink-600' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
              }`}>
                {toast.senderName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  toast.type === 'FRIEND_REQUEST' 
                    ? 'text-purple-600 bg-purple-50 border-purple-100' 
                    : 'text-blue-600 bg-blue-50 border-blue-100'
                }`}>
                  <BellIcon className="w-3 h-3" /> {toast.type === 'FRIEND_REQUEST' ? 'Friend Request' : 'New Message'}
                </span>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearToast(); }} 
                  className="text-gray-400 hover:text-gray-700 font-bold text-lg leading-none p-1"
                >
                  &times;
                </button>
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-1">{toast.senderName}</h4>
              <p className="text-xs text-gray-600 truncate mt-0.5">{toast.content}</p>
              <div className="mt-2 flex justify-end">
                <span className={`text-xs font-semibold hover:underline flex items-center gap-1 ${
                  toast.type === 'FRIEND_REQUEST' ? 'text-purple-600' : 'text-blue-600'
                }`}>
                  {toast.type === 'FRIEND_REQUEST' ? 'View Requests →' : 'Reply Now →'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">ChatApp</Link>
          {isAuthenticated && user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-2">
                <img 
                  src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-gray-200 object-cover bg-gray-50"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`; }}
                />
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user.username}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-100"
                title="Logout"
              >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>
      
      <div className="flex flex-1">
        {isAuthenticated && (
          <aside className="w-16 md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
            <nav className="py-4">
              <ul>
                {filteredNavLinks.map((link, index) => (
                  <li key={index}>
                    <Link 
                      to={link.path} 
                      className={`
                        flex items-center px-4 py-3 gap-3
                        ${location.pathname === link.path 
                          ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-500'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      {link.icon}
                      <span className="hidden md:block flex-1">{link.name}</span>
                      {link.name === 'Chat' && totalUnread > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {totalUnread}
                        </span>
                      )}
                      {link.name === 'Friends' && pendingRequestsCount > 0 && (
                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
        
        <main className="flex-1 bg-gray-50 p-4">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}; 