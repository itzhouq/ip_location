/**
 * UI交互模块
 * 处理深色模式切换、复制功能、QR码生成、历史记录渲染等
 */

const UI = (function() {

    /**
     * 初始化主题
     */
    function initTheme() {
        const savedTheme = Storage.getTheme();
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(theme);

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!Storage.getTheme()) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * 设置主题
     * @param {string} theme - 'light' 或 'dark'
     */
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Storage.saveTheme(theme);
        updateThemeToggle(theme);
    }

    /**
     * 切换主题
     */
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }

    /**
     * 更新主题切换按钮图标
     * @param {string} theme
     */
    function updateThemeToggle(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到深色模式');
        }
    }

    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @param {HTMLElement} button - 触发按钮（可选）
     */
    async function copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);

            // 显示复制成功提示
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 1500);
            }
            return true;
        } catch (err) {
            console.error('复制失败:', err);
            // 降级方案：使用传统方法
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                if (button) {
                    const originalText = button.textContent;
                    button.textContent = '✓';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1500);
                }
                return true;
            } catch (e) {
                console.error('降级复制方案也失败:', e);
                return false;
            }
        }
    }

    /**
     * 生成QR码
     * @param {string} text - 要编码的文本
     * @param {HTMLElement} container - QR码容器
     */
    function generateQRCode(text, container) {
        if (!container) return;

        // 清空容器
        container.innerHTML = '';

        // 动态加载 qrcodejs 库
        if (typeof QRCode === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
            script.onload = () => {
                createQR(text, container);
            };
            script.onerror = () => {
                container.innerHTML = '<p style="color: #c41c00; font-size: 0.9em;">QR码加载失败</p>';
            };
            document.head.appendChild(script);
        } else {
            createQR(text, container);
        }
    }

    /**
     * 创建QR码
     * @param {string} text
     * @param {HTMLElement} container
     */
    function createQR(text, container) {
        try {
            // 创建一个包含IP信息的文本
            const qrText = `IP: ${text}\n查询时间: ${new Date().toLocaleString('zh-CN')}`;

            new QRCode(container, {
                text: qrText,
                width: 150,
                height: 150,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (e) {
            console.error('生成QR码失败:', e);
            container.innerHTML = '<p style="color: #c41c00; font-size: 0.9em;">QR码生成失败</p>';
        }
    }

    /**
     * 渲染查询历史
     * @param {Array} history - 历史记录数组
     */
    function renderHistory(history) {
        const container = document.getElementById('historyList');
        if (!container) return;

        if (!history || history.length === 0) {
            container.innerHTML = '<p class="history-empty">暂无查询历史</p>';
            return;
        }

        const html = history.map((item, index) => {
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="history-item" data-ip="${item.ip}">
                    <div class="history-ip">${item.ip}</div>
                    <div class="history-location">${item.country} ${item.region} ${item.city}</div>
                    <div class="history-time">${timeStr}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // 添加点击事件
        container.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', function() {
                const ip = this.getAttribute('data-ip');
                const input = document.getElementById('ipInput');
                if (input) {
                    input.value = ip;
                    // 触发查询
                    if (typeof queryIP === 'function') {
                        queryIP();
                    }
                }
            });
        });
    }

    /**
     * 显示骨架屏
     */
    function showSkeleton() {
        const skeletonHtml = `
            <div class="skeleton">
                <div class="skeleton-header">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-grid">
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                </div>
                <div class="skeleton-map"></div>
            </div>
        `;

        const ipInfo = document.getElementById('ipInfo');
        if (ipInfo) {
            ipInfo.innerHTML = skeletonHtml;
            ipInfo.style.display = 'block';
        }
    }

    /**
     * 隐藏骨架屏
     */
    function hideSkeleton() {
        const skeleton = document.querySelector('.skeleton');
        if (skeleton) {
            skeleton.remove();
        }
    }

    /**
     * 显示 Toast 消息
     * @param {string} message - 消息内容
     * @param {string} type - 类型: 'success', 'error', 'info'
     */
    function showToast(message, type = 'info') {
        // 移除已存在的 toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // 触发动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 自动移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 初始化 PWA 安装提示
     */
    function initPWAInstall() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            // 阻止默认安装横幅
            e.preventDefault();
            deferredPrompt = e;

            // 显示安装按钮
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.style.display = 'flex';
                installBtn.addEventListener('click', () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((result) => {
                            if (result.outcome === 'accepted') {
                                console.log('用户接受安装');
                            } else {
                                console.log('用户拒绝安装');
                            }
                            deferredPrompt = null;
                            installBtn.style.display = 'none';
                        });
                    }
                });
            }
        });

        // 检测是否已安装
        window.addEventListener('appinstalled', () => {
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.style.display = 'none';
            }
            showToast('应用已安装！', 'success');
        });
    }

    /**
     * 检查并注册 Service Worker
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('Service Worker 注册成功:', registration.scope);

                        // 检查更新
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // 有新版本可用
                                    showToast('有新版本可用，刷新页面获取更新', 'info');
                                }
                            });
                        });
                    })
                    .catch((error) => {
                        console.log('Service Worker 注册失败:', error);
                    });
            });
        }
    }

    // 公开 API
    return {
        initTheme,
        toggleTheme,
        setTheme,
        copyToClipboard,
        generateQRCode,
        renderHistory,
        showSkeleton,
        hideSkeleton,
        showToast,
        initPWAInstall,
        registerServiceWorker
    };
})();

// 如果在模块环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
