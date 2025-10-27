/**
 * Utility để khôi phục dữ liệu từ localStorage backup
 */

export const recoverDataFromBackup = () => {
    const backup = localStorage.getItem('bi_a_manager_backup');
    if (backup) {
        try {
            const data = JSON.parse(backup);
            console.log('Found backup data in localStorage');
            return data;
        } catch (e) {
            console.error('Error parsing backup data:', e);
            return null;
        }
    }
    return null;
};

export const checkBackupExists = (): boolean => {
    return !!localStorage.getItem('bi_a_manager_backup');
};

export const clearBackup = () => {
    localStorage.removeItem('bi_a_manager_backup');
};

