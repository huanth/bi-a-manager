import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';

const AppContent = () => {
    const { isAuthenticated } = useAuth();
    const toast = useToast();

    const toastContextValue = {
        showToast: toast.showToast,
        showSuccess: toast.showSuccess,
        showError: toast.showError,
        showWarning: toast.showWarning,
        showInfo: toast.showInfo,
    };

    return (
        <ToastProvider toastHook={toastContextValue}>
            {isAuthenticated ? <Dashboard /> : <Login />}
            <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        </ToastProvider>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;

