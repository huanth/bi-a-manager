import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import { Order } from './types/order';

const AppContent = () => {
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const [newOrder, setNewOrder] = useState<Order | null>(null);

    // Customer Order feature removed: no cross-tab new order popup/listeners here

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
                {/* Customer Order feature removed */}

                <Routes>
                    {/* Public Customer Order route removed */}

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

