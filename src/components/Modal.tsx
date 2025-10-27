import { ReactNode } from 'react';

export type ModalType = 'alert' | 'confirm' | 'success' | 'error' | 'info';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title?: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    children?: ReactNode;
    handleConfirm?: () => void;
}

const Modal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'alert',
    confirmText = 'OK',
    cancelText = 'Hủy',
    children,
    handleConfirm,
}: ModalProps) => {
    if (!isOpen) return null;

    const isConfirm = type === 'confirm';
    const hasConfirm = onConfirm !== undefined || handleConfirm !== undefined;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            case 'error':
                return (
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                );
            case 'info':
                return (
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            default:
                return null;
        }
    };

    const getConfirmButtonColor = () => {
        switch (type) {
            case 'success':
                return 'bg-green-600 hover:bg-green-700';
            case 'error':
                return 'bg-red-600 hover:bg-red-700';
            case 'info':
                return 'bg-blue-600 hover:bg-blue-700';
            default:
                return 'bg-indigo-600 hover:bg-indigo-700';
        }
    };

    const handleConfirmClick = () => {
        if (handleConfirm) {
            handleConfirm();
        } else if (onConfirm) {
            onConfirm();
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    {/* Icon */}
                    {getIcon()}

                    {/* Title */}
                    {title && (
                        <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">
                            {title}
                        </h3>
                    )}

                    {/* Message */}
                    <div className="mt-4">
                        {children || (
                            <p className="text-sm text-gray-500 text-center whitespace-pre-line">
                                {message}
                            </p>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className={`mt-6 flex gap-3 ${isConfirm || hasConfirm ? 'justify-end' : 'justify-center'}`}>
                        {(isConfirm || hasConfirm) && (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={handleConfirmClick}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${getConfirmButtonColor()}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;

