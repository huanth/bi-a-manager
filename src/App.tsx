import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import CustomerOrder from './components/CustomerOrder';
import ToastContainer from './components/ToastContainer';
import NewOrderPopup from './components/NewOrderPopup';
import { useToast } from './hooks/useToast';
import { Order } from './types/order';

const AppContent = () => {
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const [newOrder, setNewOrder] = useState<Order | null>(null);

    useEffect(() => {
        console.log('AppContent mounted, setting up listeners...');

        // Lắng nghe event khi có order mới
        const handleNewOrder = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { order: newOrderData } = customEvent.detail;

            console.log('AppContent: Received newOrder event:', newOrderData);

            if (newOrderData) {
                setNewOrder(newOrderData);
            }
        };

        // Polling localStorage mỗi giây
        const storagePollInterval = setInterval(() => {
            const newOrderDataStr = localStorage.getItem('newOrderData');
            if (newOrderDataStr) {
                try {
                    const newOrderData = JSON.parse(newOrderDataStr);
                    console.log('AppContent: Polling - Found newOrder in localStorage:', newOrderData);
                    setNewOrder(newOrderData);
                    localStorage.removeItem('newOrderData');
                } catch (error) {
                    console.error('Error parsing newOrderData from storage:', error);
                }
            }
        }, 1000);

        window.addEventListener('newOrder', handleNewOrder);

        return () => {
            clearInterval(storagePollInterval);
            window.removeEventListener('newOrder', handleNewOrder);
        };
    }, []);

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
                {/* Global New Order Popup */}
                {newOrder && (
                    <NewOrderPopup
                        order={newOrder}
                        onClose={() => {
                            console.log('Closing popup in App');
                            setNewOrder(null);
                        }}
                    />
                )}

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

