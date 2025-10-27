import { useState, useCallback, useContext } from 'react';
import { ModalType } from '../components/Modal';
import { useToastContext, ToastContext } from '../contexts/ToastContext';

interface ModalState {
    isOpen: boolean;
    message: string;
    title?: string;
    type: ModalType;
    onConfirm?: () => void;
}

export const useModal = () => {
    const [modalState, setModalState] = useState<ModalState>({
        isOpen: false,
        message: '',
        type: 'alert',
    });

    // Get toast context - it returns no-op if not available
    const toast = useToastContext();
    const context = useContext(ToastContext);

    const showAlert = useCallback((message: string, type: ModalType = 'alert', title?: string) => {
        setModalState({
            isOpen: true,
            message,
            title,
            type,
        });
    }, []);

    const showConfirm = useCallback((message: string, onConfirm: () => void, title?: string) => {
        setModalState({
            isOpen: true,
            message,
            title,
            type: 'confirm',
            onConfirm,
        });
    }, []);

    const showSuccess = useCallback((message: string, title?: string) => {
        // Always use toast for success messages if context is available
        if (context) {
            context.showSuccess(message);
        } else {
            showAlert(message, 'success', title);
        }
    }, [showAlert, context]);

    const showError = useCallback((message: string, title?: string) => {
        // Always use toast for error messages if context is available
        if (context) {
            context.showError(message);
        } else {
            showAlert(message, 'error', title);
        }
    }, [showAlert, context]);

    const close = useCallback(() => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = useCallback(() => {
        if (modalState.onConfirm) {
            modalState.onConfirm();
        }
        close();
    }, [modalState.onConfirm, close]);

    return {
        ...modalState,
        close,
        handleConfirm,
        showAlert,
        showConfirm,
        showSuccess,
        showError,
    };
};

