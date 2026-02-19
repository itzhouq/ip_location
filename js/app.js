/**
 * IP查询核心逻辑模块
 */

// ipinfo.io配置
const API_BASE_URL = 'https://ipinfo.io/';

// 页面元素
const elements = {
    ipInput: null,
    loading: null,
    error: null,
    ipInfo: null,
    searchBtn: null
};

// 当前IP信息
let currentIPInfo = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取页面元素
    elements.ipInput = document.getElementById('ipInput');
    elements.loading = document.getElementById('loading');
    elements.error = document.getElementById('error');
    elements.ipInfo = document.getElementById('ipInfo');
    elements.searchBtn = document.getElementById('searchBtn');

    // 初始化UI模块
    UI.initTheme();
    UI.registerServiceWorker();
    UI.initPWAInstall();

    // 渲染查询历史
    const history = Storage.getHistory();
    UI.renderHistory(history);

    // 绑定深色模式切换按钮
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', UI.toggleTheme);
    }

    // 绑定回车键事件
    elements.ipInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            queryIP();
        }
    });

    // 自动查询当前IP
    queryMyIP();
});

// 显示加载状态
function showLoading() {
    elements.loading.style.display = 'block';
    elements.error.style.display = 'none';
    elements.ipInfo.style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    elements.loading.style.display = 'none';
}

// 显示错误信息
function showError(message) {
    elements.error.textContent = message;
    elements.error.style.display = 'block';
    elements.ipInfo.style.display = 'none';
}

// 验证IP地址格式
function validateIP(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        return false;
    }

    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
}

// 查询IP地址
async function queryIP() {
    const ip = elements.ipInput.value.trim();

    if (!ip) {
        showError('⚠️ 请输入IP地址');
        return;
    }

    if (!validateIP(ip)) {
        showError('⚠️ 请输入有效的IP地址格式（如：8.8.8.8）');
        return;
    }

    await fetchIPInfo(ip);
}

// 查询当前用户的IP
async function queryMyIP() {
    await fetchIPInfo('');
}

// 获取IP信息
async function fetchIPInfo(ip) {
    showLoading();

    try {
        const url = ip ? `${API_BASE_URL}${ip}/json` : `${API_BASE_URL}json`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('网络请求失败或IP地址无效');
        }

        const data = await response.json();

        // ipinfo.io 使用 bogon 字段表示无效IP
        if (data.bogon) {
            throw new Error('查询失败，请检查IP地址是否正确');
        }

        // 保存当前IP信息
        currentIPInfo = data;

        // 保存到历史记录
        Storage.saveHistory(data);

        // 更新历史记录显示
        UI.renderHistory(Storage.getHistory());

        displayIPInfo(data);

        // 如果是查询当前IP，自动填入输入框
        if (!ip) {
            elements.ipInput.value = data.ip;
        }

    } catch (error) {
        console.error('查询IP信息失败:', error);
        showError(`❌ 查询失败: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// 显示IP信息
function displayIPInfo(data) {
    // 恢复IP信息容器结构（如果之前显示的是骨架屏）
    ensureIPInfoStructure();

    // 更新IP地址
    const ipAddressEl = document.getElementById('ipAddress');
    if (ipAddressEl) {
        ipAddressEl.textContent = data.ip;
    }

    // 更新IP类型（根据是否为内网IP判断）
    const ipType = isPrivateIP(data.ip) ? '内网IP' : '公网IP';
    const ipTypeEl = document.getElementById('ipType');
    if (ipTypeEl) {
        ipTypeEl.textContent = ipType;
    }

    // 解析经纬度
    let lat = null, lon = null;
    if (data.loc) {
        const [latitude, longitude] = data.loc.split(',');
        lat = parseFloat(latitude);
        lon = parseFloat(longitude);
    }

    // 解析组织和ISP信息
    let ispName = data.org || '-';
    let orgName = data.org || '-';

    if (data.org && data.org.includes(' ')) {
        const parts = data.org.split(' ');
        orgName = parts[0];
        ispName = parts.slice(1).join(' ');
    }

    // 更新各项信息
    const els = {
        country: document.getElementById('country'),
        region: document.getElementById('region'),
        city: document.getElementById('city'),
        zip: document.getElementById('zip'),
        isp: document.getElementById('isp'),
        org: document.getElementById('org'),
        location: document.getElementById('location'),
        timezone: document.getElementById('timezone')
    };

    if (els.country) els.country.textContent = data.country || '-';
    if (els.region) els.region.textContent = data.region || '-';
    if (els.city) els.city.textContent = data.city || '-';
    if (els.zip) els.zip.textContent = data.postal || '-';
    if (els.isp) els.isp.textContent = ispName;
    if (els.org) els.org.textContent = orgName;
    if (els.location) els.location.textContent = lat && lon ? `${lat}, ${lon}` : '-';
    if (els.timezone) els.timezone.textContent = data.timezone || '-';

    // 更新地图链接
    const mapLink = document.getElementById('mapLink');
    if (mapLink) {
        if (lat && lon) {
            mapLink.innerHTML = `
                <p>📌 在地图上查看：</p>
                <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener">
                    Google Maps
                </a>
                &nbsp;|&nbsp;
                <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=12" target="_blank" rel="noopener">
                    OpenStreetMap
                </a>
            `;
        } else {
            mapLink.innerHTML = '<p>暂无地理位置信息</p>';
        }
    }

    // 生成QR码
    const qrContainer = document.getElementById('qrContainer');
    if (qrContainer) {
        UI.generateQRCode(data.ip, qrContainer);
    }

    // 显示结果
    elements.error.style.display = 'none';
    elements.ipInfo.style.display = 'block';
}

// 确保IP信息容器有正确的结构
function ensureIPInfoStructure() {
    const ipInfo = document.getElementById('ipInfo');
    if (!ipInfo) return;

    // 如果容器只有骨架屏，恢复原始结构
    if (ipInfo.querySelector('.skeleton')) {
        ipInfo.innerHTML = `
            <div class="info-header">
                <h2 id="ipAddress"></h2>
                <div class="header-actions">
                    <span id="ipType" class="ip-type"></span>
                    <button class="btn-copy" id="copyIPBtn" title="复制IP地址">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">🌏 国家/地区</span>
                    <span class="info-value" id="country"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">📍 省份/州</span>
                    <span class="info-value" id="region"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">🏙️ 城市</span>
                    <span class="info-value" id="city"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">📮 邮编</span>
                    <span class="info-value" id="zip"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">🌐 运营商</span>
                    <span class="info-value" id="isp"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">🏢 组织</span>
                    <span class="info-value" id="org"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">📡 经纬度</span>
                    <span class="info-value" id="location"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">⏰ 时区</span>
                    <span class="info-value" id="timezone"></span>
                </div>
            </div>

            <div class="map-container">
                <h3>🗺️ 地理位置</h3>
                <div id="mapLink" class="map-link"></div>
            </div>

            <div class="qr-section">
                <h3>📱 分享</h3>
                <div id="qrContainer" class="qr-container"></div>
            </div>
        `;
    }

    // 绑定复制按钮事件
    const copyBtn = document.getElementById('copyIPBtn');
    if (copyBtn && currentIPInfo) {
        copyBtn.onclick = () => UI.copyToClipboard(currentIPInfo.ip, copyBtn);
    }
}

// 判断是否为内网IP
function isPrivateIP(ip) {
    const parts = ip.split('.').map(Number);

    // 10.0.0.0 - 10.255.255.255
    if (parts[0] === 10) return true;

    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 127.0.0.0 - 127.255.255.255 (回环地址)
    if (parts[0] === 127) return true;

    return false;
}

// 清除历史记录
function clearHistory() {
    if (confirm('确定要清除所有查询历史吗？')) {
        Storage.clearHistory();
        UI.renderHistory([]);
        UI.showToast('历史记录已清除', 'success');
    }
}
