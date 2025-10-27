import { Toast } from '../hooks/useToast';
import ToastComponent from './Toast';

interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex flex-col items-end w-[calc(100%-1rem)] sm:w-auto max-w-[calc(100vw-1rem)] sm:max-w-md">
            {toasts.map((toast) => (
                <ToastComponent
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
};

export default ToastContainer;

