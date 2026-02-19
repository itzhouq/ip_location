/**
 * 本地存储模块
 * 管理查询历史和用户偏好设置
 */

const Storage = (function() {
    const STORAGE_KEYS = {
        HISTORY: 'ip_query_history',
        THEME: 'theme_preference'
    };

    const MAX_HISTORY = 5;

    /**
     * 保存查询历史
     * @param {Object} ipInfo - IP信息对象
     */
    function saveHistory(ipInfo) {
        try {
            const history = getHistory();
            const newEntry = {
                ip: ipInfo.ip,
                country: ipInfo.country || '-',
                region: ipInfo.region || '-',
                city: ipInfo.city || '-',
                timestamp: Date.now()
            };

            // 检查是否已存在相同IP，存在则移除旧的
            const filtered = history.filter(item => item.ip !== newEntry.ip);

            // 添加新记录到开头
            filtered.unshift(newEntry);

            // 保留最近5条记录
            const trimmed = filtered.slice(0, MAX_HISTORY);

            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
            return trimmed;
        } catch (e) {
            console.error('保存历史记录失败:', e);
            return [];
        }
    }

    /**
     * 获取查询历史
     * @returns {Array} 历史记录数组
     */
    function getHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('读取历史记录失败:', e);
            return [];
        }
    }

    /**
     * 清除查询历史
     */
    function clearHistory() {
        try {
            localStorage.removeItem(STORAGE_KEYS.HISTORY);
            return true;
        } catch (e) {
            console.error('清除历史记录失败:', e);
            return false;
        }
    }

    /**
     * 保存主题偏好
     * @param {string} theme - 'light' 或 'dark'
     */
    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, theme);
            return true;
        } catch (e) {
            console.error('保存主题偏好失败:', e);
            return false;
        }
    }

    /**
     * 获取主题偏好
     * @returns {string|null} 主题值
     */
    function getTheme() {
        try {
            return localStorage.getItem(STORAGE_KEYS.THEME);
        } catch (e) {
            console.error('读取主题偏好失败:', e);
            return null;
        }
    }

    /**
     * 清除主题偏好
     */
    function clearTheme() {
        try {
            localStorage.removeItem(STORAGE_KEYS.THEME);
            return true;
        } catch (e) {
            console.error('清除主题偏好失败:', e);
            return false;
        }
    }

    // 公开 API
    return {
        saveHistory,
        getHistory,
        clearHistory,
        saveTheme,
        getTheme,
        clearTheme,
        MAX_HISTORY
    };
})();

// 如果在模块环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
