import { createContext, useContext, ReactNode } from 'react';
import { ToastType } from '../components/Toast';

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
    showWarning: (message: string, duration?: number) => void;
    showInfo: (message: string, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

const noOpToast = {
    showToast: () => {},
    showSuccess: () => {},
    showError: () => {},
    showWarning: () => {},
    showInfo: () => {},
};

export const useToastContext = () => {
    const context = useContext(ToastContext);
    if (!context) {
        // Return a no-op implementation if context is not available
        return noOpToast;
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
    toastHook: ToastContextType;
}

export const ToastProvider = ({ children, toastHook }: ToastProviderProps) => {
    return (
        <ToastContext.Provider value={toastHook}>
            {children}
        </ToastContext.Provider>
    );
};

