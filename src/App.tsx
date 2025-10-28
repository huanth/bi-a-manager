import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import CustomerOrder from './components/CustomerOrder';
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
        <Router>
            <ToastProvider toastHook={toastContextValue}>
                <Routes>
                    {/* Public route - không cần đăng nhập */}
                    <Route path="/order/:id" element={<CustomerOrder />} />

                    {/* Protected routes - cần đăng nhập */}
                    <Route
                        path="*"
                        element={isAuthenticated ? <Dashboard /> : <Login />}
                    />
                </Routes>
                <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
            </ToastProvider>
        </Router>
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

