(function() {
        // DOM 元素
        const usernameInput = document.getElementById('usernameInput');
        const fetchBtn = document.getElementById('fetchBtn');
        const statusDiv = document.getElementById('statusMsg');
        const canvas = document.getElementById('heatmapCanvas');
        const sourceSelect = document.getElementById('sourceSelect');
        const tokenInput = document.getElementById('githubToken');
        const tokenLabel = document.getElementById('tokenLabel');
        const tokenHint = document.getElementById('tokenHint');
        const githubTokenLink = document.getElementById('githubTokenLink');
        const saveTokenBtn = document.getElementById('saveTokenBtn');
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const bigStatsDiv = document.getElementById('bigStats');
        const chartsGrid = document.getElementById('chartsGrid');
        const userInfoDiv = document.getElementById('userInfoDiv');
        const summaryCard = document.getElementById('summaryCard');
        const exportPNGBtn = document.getElementById('exportPNGBtn');
        const exportPDFBtn = document.getElementById('exportPDFBtn');
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');
        const heatmapWrapper = document.getElementById('heatmapWrapper');
        const actionInsights = document.getElementById('actionInsights');
        const yearProgress = document.getElementById('yearProgress');
        const profileSection = document.getElementById('profileSection');
        const profileToggle = document.getElementById('profileToggle');
        const profileExtras = document.getElementById('profileExtras');

        let yearlyChart, monthlyChart, weeklyChart, levelChart, quarterlyChart, cumulativeChart;
        let currentReportData = null;
        let currentColorScheme = 'github';
        let progressTimer = null;
        let visualProgress = 0;
        const sourceConfig = {
            github: {
                name: 'GitHub',
                tokenKey: 'github_token',
                placeholder: 'GitHub 用户名',
                tokenPlaceholder: 'ghp_xxxxxxxxxxxx (无需任何权限)',
                tokenLabel: '🔑 GitHub Personal Access Token (贡献日历需要):',
                tokenHint: '⚠️ GitHub 贡献日历使用 GraphQL，需要 Token（无需额外权限）',
                defaultUsername: 'xiangxiang62'
            },
            gitee: {
                name: 'Gitee',
                tokenKey: 'gitee_token',
                placeholder: 'Gitee 用户名',
                tokenPlaceholder: 'Gitee Access Token (可选)',
                tokenLabel: '🔑 Gitee Access Token (可选):',
                tokenHint: '⚠️ Gitee 数据基于公开动态聚合，Token 可提升访问稳定性',
                defaultUsername: ''
            }
        };
        
        // 存储每个方块对应的日期和贡献数, 用于悬浮
        let cellsMetadata = []; // 每个元素 { x, y, width, height, date, count }
        
        // 创建悬浮tooltip元素
        const tooltip = document.createElement('div');
        tooltip.className = 'heatmap-tooltip';
        document.body.appendChild(tooltip);

        const colorSchemes = {
            github: { 0: '#ebedf0', '1-4': '#9be9a8', '5-9': '#40c463', '10-19': '#30a14e', '20+': '#216e39' },
            orange: { 0: '#f0f0f0', '1-4': '#ffd966', '5-9': '#ffb347', '10-19': '#e67e22', '20+': '#d35400' },
            teal: { 0: '#e8e8e8', '1-4': '#a3e4d7', '5-9': '#48c9b0', '10-19': '#1abc9c', '20+': '#148f77' },
            red: { 0: '#f5f5f5', '1-4': '#f5b7b1', '5-9': '#e74c3c', '10-19': '#c0392b', '20+': '#78281f' },
            blue: { 0: '#e8e8e8', '1-4': '#a9cce3', '5-9': '#5499c7', '10-19': '#2e86c1', '20+': '#1b4f72' }
        };

        function getColorByScheme(count) {
            if (count === 0) return colorSchemes[currentColorScheme][0];
            if (count <= 4) return colorSchemes[currentColorScheme]['1-4'];
            if (count <= 9) return colorSchemes[currentColorScheme]['5-9'];
            if (count <= 19) return colorSchemes[currentColorScheme]['10-19'];
            return colorSchemes[currentColorScheme]['20+'];
        }

        function updateLegendColors() {
            const boxes = document.querySelectorAll('#legendColors .legend-box');
            if (boxes.length >= 5) {
                boxes[0].style.background = colorSchemes[currentColorScheme][0];
                boxes[1].style.background = colorSchemes[currentColorScheme]['1-4'];
                boxes[2].style.background = colorSchemes[currentColorScheme]['5-9'];
                boxes[3].style.background = colorSchemes[currentColorScheme]['10-19'];
                boxes[4].style.background = colorSchemes[currentColorScheme]['20+'];
            }
        }

        function changeColorScheme(scheme) {
            currentColorScheme = scheme;
            updateLegendColors();
            if (currentReportData && currentReportData.contributionMap) {
                drawHeatmapWithData(currentReportData.contributionMap, currentReportData.startDate, currentReportData.endDate);
            }
        }

        function scrollHeatmapToRight() {
            requestAnimationFrame(() => {
                heatmapWrapper.scrollLeft = heatmapWrapper.scrollWidth - heatmapWrapper.clientWidth;
            });
        }

        // 绑定配色点击事件，同时高亮
        document.querySelectorAll('.color-swatch').forEach(el => {
            el.addEventListener('click', function(e) {
                const scheme = this.getAttribute('data-scheme');
                if (scheme) {
                    changeColorScheme(scheme);
                    document.querySelectorAll('.color-swatch').forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
        document.querySelector('.color-swatch[data-scheme="github"]').classList.add('active');

        // 核心绘制 + 记录每个方块的区域信息用于悬浮
        function drawHeatmapWithData(contributionsMap, startDateStr, endDateStr) {
            const ctx = canvas.getContext('2d');
            let startDate = new Date(startDateStr);
            let endDate = new Date(endDateStr);
            if (isNaN(startDate) || isNaN(endDate)) return;

            const diffTime = Math.abs(endDate - startDate);
            const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const firstDayWeek = startDate.getDay();
            const weeksCount = Math.ceil((totalDays + firstDayWeek) / 7);
            const cellSize = 14, gap = 3;
            const colWidth = cellSize + gap, rowHeight = cellSize + gap;
            const topMargin = 20, leftMargin = 38, monthLabelHeight = 18;
            const canvasWidth = leftMargin + weeksCount * colWidth + 20;
            const canvasHeight = topMargin + monthLabelHeight + 7 * rowHeight + 20;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.width = canvasWidth + 'px';
            canvas.style.height = canvasHeight + 'px';
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.font = "11px 'Segoe UI'";
            ctx.fillStyle = "#57606a";
            const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            let lastMonth = -1;
            for (let week = 0; week < weeksCount; week++) {
                let sampleDate = new Date(startDate);
                sampleDate.setDate(startDate.getDate() + week * 7 + 3 - firstDayWeek);
                if (sampleDate > endDate) break;
                const month = sampleDate.getMonth();
                if (month !== lastMonth) {
                    ctx.fillText(monthNames[month], leftMargin + week * colWidth, topMargin - 4);
                    lastMonth = month;
                }
            }
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            for (let i = 0; i < 7; i++) {
                ctx.fillText(weekdays[i], 12, topMargin + monthLabelHeight + i * rowHeight + cellSize/2 + 2);
            }
            
            // 重置元数据
            cellsMetadata = [];
            let current = new Date(startDate);
            let dayIdx = 0;
            while (current <= endDate) {
                const weekOfYear = Math.floor((dayIdx + firstDayWeek) / 7);
                const dayOfWeek = (dayIdx + firstDayWeek) % 7;
                const dateKey = current.toISOString().split('T')[0];
                const count = contributionsMap[dateKey] || 0;
                const x = leftMargin + weekOfYear * colWidth;
                const y = topMargin + monthLabelHeight + dayOfWeek * rowHeight;
                ctx.fillStyle = getColorByScheme(count);
                ctx.fillRect(x, y, cellSize, cellSize);
                ctx.strokeStyle = "#e1e4e8";
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);
                
                // 存储元数据用于悬浮
                cellsMetadata.push({
                    x: x,
                    y: y,
                    width: cellSize,
                    height: cellSize,
                    date: dateKey,
                    count: count
                });
                
                current.setDate(current.getDate() + 1);
                dayIdx++;
            }
            scrollHeatmapToRight();
        }

        // 鼠标悬浮检测 (基于canvas坐标)
        function setupCanvasHover() {
            const wrapper = document.getElementById('heatmapWrapper');
            // 监听 canvas 上的鼠标移动
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;   // canvas 实际像素与CSS缩放比
                const scaleY = canvas.height / rect.height;
                
                // 鼠标相对于 canvas 画布的实际坐标 (px)
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;
                
                let hoveredCell = null;
                for (const cell of cellsMetadata) {
                    if (mouseX >= cell.x && mouseX <= cell.x + cell.width &&
                        mouseY >= cell.y && mouseY <= cell.y + cell.height) {
                        hoveredCell = cell;
                        break;
                    }
                }
                
                if (hoveredCell) {
                    const dateStr = hoveredCell.date;
                    const count = hoveredCell.count;
                    // 格式化日期 yyyy-mm-dd -> 更可读
                    const formattedDate = new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                    tooltip.innerHTML = `<strong>${formattedDate}</strong><br/>📌 贡献: ${count} 次`;
                    tooltip.classList.add('show');
                    // 定位 tooltip 在鼠标附近
                    let left = e.clientX + 15;
                    let top = e.clientY - 30;
                    // 边界检测防止超出视口
                    if (left + 160 > window.innerWidth) left = e.clientX - 170;
                    if (top < 10) top = e.clientY + 20;
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                } else {
                    tooltip.classList.remove('show');
                }
            });
            
            canvas.addEventListener('mouseleave', () => {
                tooltip.classList.remove('show');
            });
        }

        // 手动拖拽滚动
        let isDragging = false;
        let startX, scrollLeftStart;
        heatmapWrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX - heatmapWrapper.offsetLeft;
            scrollLeftStart = heatmapWrapper.scrollLeft;
            heatmapWrapper.style.cursor = 'grabbing';
        });
        window.addEventListener('mouseup', () => {
            isDragging = false;
            heatmapWrapper.style.cursor = 'grab';
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - heatmapWrapper.offsetLeft;
            const walk = (x - startX) * 1.5;
            heatmapWrapper.scrollLeft = scrollLeftStart - walk;
        });

        function scrollLeft() { heatmapWrapper.scrollBy({ left: -300, behavior: 'smooth' }); }
        function scrollRight() { heatmapWrapper.scrollBy({ left: 300, behavior: 'smooth' }); }
        scrollLeftBtn.addEventListener('click', () => scrollLeft());
        scrollRightBtn.addEventListener('click', () => scrollRight());

        function showProfileSection() {
            profileSection.style.display = 'block';
        }

        function setProfileCollapsed(collapsed) {
            profileSection.classList.toggle('collapsed', collapsed);
            profileToggle.setAttribute('aria-expanded', String(!collapsed));
            const hint = profileToggle.querySelector('.collapse-hint');
            if (hint) hint.textContent = collapsed ? '点击展开' : '点击收起';
        }

        function getGitHubApiErrorMessage(status, fallback = 'GitHub API 请求失败') {
            if (status === 401) return 'GitHub Token 无效或已过期，请重新保存 Personal Access Token';
            if (status === 403) return 'GitHub API 访问被拒绝或已限流，请检查 Token 后重试';
            if (status === 404) return 'GitHub 用户不存在或无法公开访问';
            return `${fallback}：HTTP ${status}`;
        }

        function getGitHubGraphQLError(result) {
            const message = result.errors?.[0]?.message || '';
            if (/bad credentials/i.test(message)) return 'GitHub Token 无效，请重新保存 Personal Access Token';
            if (/rate limit/i.test(message)) return 'GitHub API 已限流，请稍后重试或更换 Token';
            if (/requires authentication|authentication/i.test(message)) return 'GitHub 贡献日历需要配置 Personal Access Token（无需额外权限）';
            return message || 'GitHub GraphQL 请求失败';
        }

        async function fetchUserInfoWithAvatar(username, token) {
            const headers = { 'Accept': 'application/vnd.github+json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(getGitHubApiErrorMessage(response.status, 'GitHub 用户信息获取失败'));
            const user = await response.json();
            return {
                name: user.name,
                login: user.login,
                createdAt: user.created_at,
                bio: user.bio,
                location: user.location,
                avatarUrl: user.avatar_url
            };
        }

        async function fetchGiteeUserInfo(username, token) {
            const url = new URL(`https://gitee.com/api/v5/users/${encodeURIComponent(username)}`);
            if (token) url.searchParams.set('access_token', token);
            const response = await fetch(url.toString());
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`Gitee 用户信息获取失败：HTTP ${response.status}`);
            const user = await response.json();
            return {
                name: user.name,
                login: user.login || username,
                createdAt: user.created_at,
                bio: user.bio,
                location: user.address || '',
                avatarUrl: user.avatar_url
            };
        }

        async function fetchUserInfo(source, username, token) {
            if (source === 'gitee') return fetchGiteeUserInfo(username, token);
            return fetchUserInfoWithAvatar(username, token);
        }

        function getRepoKey(repo) {
            return (repo.url || repo.name || '').toLowerCase();
        }

        async function fetchGitHubPinnedRepos(username, token) {
            if (!token) return [];
            const query = `query($username: String!) {
                user(login: $username) {
                    pinnedItems(first: 6, types: REPOSITORY) {
                        nodes {
                            ... on Repository {
                                name
                                description
                                url
                                stargazerCount
                                forkCount
                                primaryLanguage { name }
                                updatedAt
                                isFork
                            }
                        }
                    }
                }
            }`;
            const response = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query, variables: { username } })
            });
            if (!response.ok) throw new Error(`GitHub pinned 仓库获取失败：HTTP ${response.status}`);
            const result = await response.json();
            if (result.errors) throw new Error(result.errors[0].message);
            const nodes = result.data?.user?.pinnedItems?.nodes || [];
            return nodes.map(repo => ({
                name: repo.name,
                description: repo.description || '',
                url: repo.url,
                stars: repo.stargazerCount || 0,
                forks: repo.forkCount || 0,
                language: repo.primaryLanguage?.name || 'Other',
                updatedAt: repo.updatedAt,
                isFork: repo.isFork,
                isPinned: true
            }));
        }

        async function fetchGitHubPublicRepos(username, token) {
            const headers = { 'Accept': 'application/vnd.github+json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const url = new URL(`https://api.github.com/users/${encodeURIComponent(username)}/repos`);
            url.searchParams.set('per_page', '100');
            url.searchParams.set('sort', 'updated');
            const response = await fetch(url.toString(), { headers });
            if (!response.ok) throw new Error(`GitHub 仓库列表获取失败：HTTP ${response.status}`);
            const repos = await response.json();
            const publicRepos = repos.map(repo => ({
                name: repo.name,
                description: repo.description || '',
                url: repo.html_url,
                stars: repo.stargazers_count || 0,
                forks: repo.forks_count || 0,
                language: repo.language || 'Other',
                updatedAt: repo.updated_at,
                isFork: repo.fork,
                isPinned: false
            }));
            let pinnedRepos = [];
            try {
                pinnedRepos = await fetchGitHubPinnedRepos(username, token);
            } catch (err) {
                console.warn(err);
            }
            const pinnedByKey = new Map(pinnedRepos.map(repo => [getRepoKey(repo), repo]));
            const mergedRepos = publicRepos.map(repo => {
                const pinnedRepo = pinnedByKey.get(getRepoKey(repo));
                return pinnedRepo ? { ...repo, isPinned: true } : repo;
            });
            const existingKeys = new Set(mergedRepos.map(getRepoKey));
            pinnedRepos.forEach(repo => {
                const key = getRepoKey(repo);
                if (!existingKeys.has(key)) {
                    mergedRepos.push(repo);
                    existingKeys.add(key);
                }
            });
            return mergedRepos;
        }

        async function fetchGiteePublicRepos(username, token) {
            const url = new URL(`https://gitee.com/api/v5/users/${encodeURIComponent(username)}/repos`);
            url.searchParams.set('page', '1');
            url.searchParams.set('per_page', '100');
            url.searchParams.set('sort', 'updated');
            if (token) url.searchParams.set('access_token', token);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`Gitee 仓库列表获取失败：HTTP ${response.status}`);
            const repos = await response.json();
            return repos.map(repo => ({
                name: repo.name || repo.path,
                description: repo.description || '',
                url: repo.html_url || repo.url,
                stars: repo.stargazers_count || repo.stars_count || 0,
                forks: repo.forks_count || 0,
                language: repo.language || 'Other',
                updatedAt: repo.updated_at || repo.pushed_at,
                isFork: Boolean(repo.fork),
                isPinned: false
            }));
        }

        async function fetchPublicRepos(source, username, token) {
            if (source === 'gitee') return fetchGiteePublicRepos(username, token);
            return fetchGitHubPublicRepos(username, token);
        }

        function summarizeRepos(repos) {
            const sourceRepos = repos.filter(repo => !repo.isFork);
            const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);
            const totalForks = repos.reduce((sum, repo) => sum + repo.forks, 0);
            const languageCounts = {};
            repos.forEach(repo => {
                languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
            });
            const topLanguages = Object.entries(languageCounts)
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 5)
                .map(([language, count]) => ({ language, count }));
            const topRepoLimit = 4;
            const selectedRepoKeys = new Set();
            const pinnedRepos = repos
                .filter(repo => repo.isPinned)
                .filter(repo => {
                    const key = getRepoKey(repo);
                    if (selectedRepoKeys.has(key)) return false;
                    selectedRepoKeys.add(key);
                    return true;
                })
                .slice(0, topRepoLimit);
            const topRepos = pinnedRepos.concat([...repos]
                .filter(repo => !selectedRepoKeys.has(getRepoKey(repo)))
                .sort((a, b) => b.stars - a.stars || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
                .slice(0, topRepoLimit - pinnedRepos.length));
            const latestRepo = [...repos]
                .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
            return { sourceRepos, totalStars, totalForks, topLanguages, topRepos, latestRepo };
        }

        function renderProfileExtras(repos) {
            if (!Array.isArray(repos) || repos.length === 0) {
                showProfileSection();
                profileExtras.style.display = 'grid';
                profileExtras.innerHTML = `
                    <div class="repo-list">
                        <h3>公开仓库</h3>
                        <div class="repo-meta">没有读取到公开仓库，或当前平台未返回仓库列表。</div>
                    </div>
                `;
                return;
            }

            const summary = summarizeRepos(repos);
            const languagePills = summary.topLanguages.length
                ? summary.topLanguages.map(item => `<span>${item.language} · ${item.count}</span>`).join('')
                : '<span>暂无语言数据</span>';
            const latestUpdated = summary.latestRepo?.updatedAt
                ? new Date(summary.latestRepo.updatedAt).toLocaleDateString('zh-CN')
                : '未知';
            const topRepoItems = summary.topRepos.map(repo => `
                <div class="repo-item">
                    <a href="${repo.url}" target="_blank" rel="noopener noreferrer">${repo.name}${repo.isPinned ? ' <span title="Pinned" aria-label="Pinned">📌</span>' : ''}</a>
                    <div class="repo-meta">${repo.description || '暂无描述'}</div>
                    <div class="repo-meta">★ ${repo.stars.toLocaleString()} · Fork ${repo.forks.toLocaleString()} · ${repo.language} · 更新 ${repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString('zh-CN') : '未知'}</div>
                </div>
            `).join('');

            profileExtras.innerHTML = `
                <div class="profile-card">
                    <h3>公开仓库影响力</h3>
                    <div class="impact-grid">
                        <div class="impact-metric"><strong>${repos.length}</strong><span>公开仓库</span></div>
                        <div class="impact-metric"><strong>${summary.sourceRepos.length}</strong><span>原创仓库</span></div>
                        <div class="impact-metric"><strong>${summary.totalStars.toLocaleString()}</strong><span>累计 Star</span></div>
                        <div class="impact-metric"><strong>${summary.totalForks.toLocaleString()}</strong><span>累计 Fork</span></div>
                    </div>
                    <div class="language-pills">${languagePills}</div>
                </div>
                <div class="repo-list">
                    <h3>代表仓库</h3>
                    ${topRepoItems}
                    <div class="repo-meta">最近更新仓库：${summary.latestRepo?.name || '未知'} · ${latestUpdated}</div>
                </div>
            `;
            showProfileSection();
            profileExtras.style.display = 'grid';
        }

        async function loadProfileExtras(source, username, token) {
            try {
                const repos = await fetchPublicRepos(source, username, token);
                renderProfileExtras(repos);
            } catch (err) {
                console.warn(err);
                showProfileSection();
                profileExtras.style.display = 'grid';
                profileExtras.innerHTML = `
                    <div class="repo-list">
                        <h3>公开仓库</h3>
                        <div class="repo-meta">${err.message}。贡献报告仍可继续使用。</div>
                    </div>
                `;
            }
        }

        function showStatus(msg, isError, type = 'error') {
            statusDiv.textContent = msg;
            statusDiv.className = 'status ' + type;
            statusDiv.style.display = 'flex';
            setTimeout(() => {
                if (statusDiv.style.display === 'flex') statusDiv.style.display = 'none';
            }, 5000);
        }

        function startSmoothProgress(text = '正在加载数据...') {
            stopSmoothProgress(false);
            visualProgress = 0;
            progressBar.style.display = 'block';
            progressFill.style.width = '0%';
            progressFill.textContent = text;
            progressTimer = setInterval(() => {
                const remaining = 92 - visualProgress;
                if (remaining <= 0) return;
                const step = Math.max(0.25, remaining * 0.035);
                visualProgress = Math.min(92, visualProgress + step);
                progressFill.style.width = visualProgress.toFixed(2) + '%';
            }, 120);
        }

        function setProgressText(text) {
            if (text) progressFill.textContent = text;
        }

        function stopSmoothProgress(complete = true, text = '完成！') {
            if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = null;
            }
            if (!complete) return;
            progressBar.style.display = 'block';
            progressFill.textContent = text;
            progressTimer = setInterval(() => {
                visualProgress = Math.min(100, visualProgress + 2);
                progressFill.style.width = visualProgress.toFixed(2) + '%';
                if (visualProgress >= 100) {
                    clearInterval(progressTimer);
                    progressTimer = null;
                    setTimeout(() => {
                        if (!progressTimer) progressBar.style.display = 'none';
                    }, 500);
                }
            }, 35);
        }

        function splitDateRangeByAccurateYears(startDateObj, endDateObj) {
            const ranges = [];
            let currentStart = new Date(startDateObj);
            const end = new Date(endDateObj);
            while (currentStart <= end) {
                let year = currentStart.getFullYear();
                let currentEnd = new Date(year, 11, 31);
                if (currentEnd > end) currentEnd = new Date(end);
                ranges.push({
                    start: currentStart.toISOString().split('T')[0],
                    end: currentEnd.toISOString().split('T')[0],
                    year: year
                });
                currentStart = new Date(year + 1, 0, 1);
                if (currentStart > end) break;
            }
            return ranges;
        }

        function createEmptyContributionMap(startDateObj, endDateObj) {
            const map = {};
            const current = new Date(startDateObj);
            const end = new Date(endDateObj);
            while (current <= end) {
                map[current.toISOString().split('T')[0]] = 0;
                current.setDate(current.getDate() + 1);
            }
            return map;
        }

        async function fetchOneYear(username, startDate, endDate, token) {
            const query = `query($username: String!, $from: DateTime!, $to: DateTime!) {
                user(login: $username) {
                    contributionsCollection(from: $from, to: $to) {
                        contributionCalendar {
                            totalContributions
                            weeks { contributionDays { date contributionCount } }
                        }
                    }
                }
            }`;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch('https://api.github.com/graphql', {
                method: 'POST', headers: headers,
                body: JSON.stringify({ query, variables: { username, from: startDate + "T00:00:00Z", to: endDate + "T23:59:59Z" } })
            });
            if (!response.ok) throw new Error(getGitHubApiErrorMessage(response.status, 'GitHub 贡献日历获取失败'));
            const result = await response.json();
            if (result.errors) throw new Error(getGitHubGraphQLError(result));
            const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
            if (!calendar) return { map: {}, total: 0 };
            const contributionMap = {};
            let total = 0;
            for (const week of calendar.weeks) {
                for (const day of week.contributionDays) {
                    contributionMap[day.date] = day.contributionCount;
                    total += day.contributionCount;
                }
            }
            return { map: contributionMap, total: total };
        }

        async function fetchYearBatch(username, ranges, token) {
            const variables = { username };
            const fields = ranges.map((range, index) => {
                variables[`from${index}`] = range.start + "T00:00:00Z";
                variables[`to${index}`] = range.end + "T23:59:59Z";
                return `year${index}: contributionsCollection(from: $from${index}, to: $to${index}) {
                    contributionCalendar {
                        totalContributions
                        weeks { contributionDays { date contributionCount } }
                    }
                }`;
            }).join('\n');
            const variableDefs = ranges.map((_, index) => `$from${index}: DateTime!, $to${index}: DateTime!`).join(', ');
            const query = `query($username: String!, ${variableDefs}) {
                user(login: $username) {
                    ${fields}
                }
            }`;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ query, variables })
            });
            if (!response.ok) throw new Error(getGitHubApiErrorMessage(response.status, 'GitHub 贡献日历获取失败'));
            const result = await response.json();
            if (result.errors) throw new Error(getGitHubGraphQLError(result));

            return ranges.map((_, index) => {
                const calendar = result.data?.user?.[`year${index}`]?.contributionCalendar;
                if (!calendar) return { map: {}, total: 0 };
                const contributionMap = {};
                let total = 0;
                for (const week of calendar.weeks) {
                    for (const day of week.contributionDays) {
                        contributionMap[day.date] = day.contributionCount;
                        total += day.contributionCount;
                    }
                }
                return { map: contributionMap, total };
            });
        }

        async function fetchGiteeEvents(username, token, createdAt, today) {
            const contributionMap = createEmptyContributionMap(new Date(createdAt), today);
            let total = 0;
            const perPage = 100;
            const maxPages = 10;
            for (let page = 1; page <= maxPages; page++) {
                setProgressText(`正在获取 Gitee 公开动态 第 ${page} 页`);
                const url = new URL(`https://gitee.com/api/v5/users/${encodeURIComponent(username)}/events/public`);
                url.searchParams.set('page', page);
                url.searchParams.set('per_page', perPage);
                if (token) url.searchParams.set('access_token', token);
                const response = await fetch(url.toString());
                if (!response.ok) throw new Error(`Gitee 公开动态获取失败：HTTP ${response.status}`);
                const events = await response.json();
                if (!Array.isArray(events) || events.length === 0) break;
                for (const event of events) {
                    const eventDate = event.created_at || event.createdAt;
                    if (!eventDate) continue;
                    const day = new Date(eventDate).toISOString().split('T')[0];
                    if (Object.prototype.hasOwnProperty.call(contributionMap, day)) {
                        contributionMap[day] += 1;
                        total += 1;
                    }
                }
                if (events.length < perPage) break;
            }
            return { map: contributionMap, total };
        }

        function buildStatsFromContributionMap(mergedMap, grandTotal, startDate, today, ranges) {
            const activeDays = Object.values(mergedMap).filter(v => v > 0).length;
            const maxDay = Object.keys(mergedMap).length > 0 ? Math.max(...Object.values(mergedMap)) : 0;
            const totalDaysCount = Object.keys(mergedMap).length;
            const avgDaily = totalDaysCount > 0 ? (grandTotal / totalDaysCount).toFixed(1) : '0';
            
            function calculateLongestStreak(map, sDate, eDate) {
                let currentStreak = 0, maxStreak = 0;
                let current = new Date(sDate);
                const end = new Date(eDate);
                while (current <= end) {
                    const key = current.toISOString().split('T')[0];
                    if ((map[key] || 0) > 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
                    else { currentStreak = 0; }
                    current.setDate(current.getDate() + 1);
                }
                return maxStreak;
            }
            const longestStreak = calculateLongestStreak(mergedMap, startDate.toISOString().split('T')[0], today.toISOString().split('T')[0]);
            
            const monthlyData = new Array(12).fill(0);
            const weeklyData = new Array(7).fill(0);
            const levelCounts = { '0': 0, '1-4': 0, '5-9': 0, '10-19': 0, '20+': 0 };
            const quarterlyData = new Array(4).fill(0);
            let cumulativeData = [];
            let runningTotal = 0;
            const sortedDates = Object.keys(mergedMap).sort();
            for (const date of sortedDates) {
                runningTotal += mergedMap[date];
                cumulativeData.push({ date, total: runningTotal });
            }
            
            for (const [date, count] of Object.entries(mergedMap)) {
                const d = new Date(date);
                const month = d.getMonth();
                const weekDay = d.getDay();
                const quarter = Math.floor(month / 3);
                monthlyData[month] += count;
                weeklyData[weekDay] += count;
                quarterlyData[quarter] += count;
                if (count === 0) levelCounts['0']++;
                else if (count <= 4) levelCounts['1-4']++;
                else if (count <= 9) levelCounts['5-9']++;
                else if (count <= 19) levelCounts['10-19']++;
                else levelCounts['20+']++;
            }
            
            const ninetyDaysAgo = new Date(today);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            let recentTotal = 0, previousTotal = 0;
            for (const [date, count] of Object.entries(mergedMap)) {
                const d = new Date(date);
                if (d >= ninetyDaysAgo) recentTotal += count;
                else if (d >= new Date(ninetyDaysAgo.getTime() - 90*24*60*60*1000)) previousTotal += count;
            }
            const trend = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal * 100).toFixed(1) : 0;
            const yearlyTotals = ranges.map(range => {
                let total = 0;
                for (const [date, count] of Object.entries(mergedMap)) {
                    if (date >= range.start && date <= range.end) total += count;
                }
                return { year: range.year, total };
            });
            
            return { 
                contributionMap: mergedMap, total: grandTotal, activeDays, maxDay, avgDaily, longestStreak,
                startDate: startDate.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0],
                yearlyTotals, monthlyData, weeklyData, levelCounts, quarterlyData, cumulativeData,
                totalYears: ranges.length, recentTotal, previousTotal, trend
            };
        }

        function calculateCurrentStreak(map, endDateStr) {
            let streak = 0;
            const current = new Date(endDateStr);
            const todayKey = current.toISOString().split('T')[0];
            if ((map[todayKey] || 0) <= 0) {
                current.setDate(current.getDate() - 1);
            }
            while (true) {
                const key = current.toISOString().split('T')[0];
                if ((map[key] || 0) <= 0) break;
                streak++;
                current.setDate(current.getDate() - 1);
            }
            return streak;
        }

        function getTopContributionDays(map, limit = 3) {
            return Object.entries(map)
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, limit)
                .map(([date, count]) => ({ date, count }));
        }

        function getRecentActivityRate(map, endDateStr, days = 30) {
            let active = 0;
            let total = 0;
            const current = new Date(endDateStr);
            for (let i = 0; i < days; i++) {
                const key = current.toISOString().split('T')[0];
                if (Object.prototype.hasOwnProperty.call(map, key)) {
                    total++;
                    if ((map[key] || 0) > 0) active++;
                }
                current.setDate(current.getDate() - 1);
            }
            return total > 0 ? Math.round((active / total) * 100) : 0;
        }

        function renderActionInsights(data) {
            const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
            const weekNames = ['周日','周一','周二','周三','周四','周五','周六'];
            const bestMonthIndex = data.monthlyData.indexOf(Math.max(...data.monthlyData));
            const bestWeekIndex = data.weeklyData.indexOf(Math.max(...data.weeklyData));
            const currentStreak = calculateCurrentStreak(data.contributionMap, data.endDate);
            const topDays = getTopContributionDays(data.contributionMap);
            const recentActivityRate = getRecentActivityRate(data.contributionMap, data.endDate);
            const topDaysText = topDays.length
                ? topDays.map(item => `${item.date} (${item.count})`).join('、')
                : '暂无活跃日期';

            actionInsights.innerHTML = `
                <div class="action-item">
                    <div class="label">当前连续贡献</div>
                    <div class="value">${currentStreak} 天</div>
                    <div class="hint">${currentStreak > 0 ? '最近一次连续贡献仍在延续中，今天还来得及继续点亮。' : '连续记录已暂停，下一次提交就是新的开始。'}</div>
                </div>
                <div class="action-item">
                    <div class="label">近 30 天活跃率</div>
                    <div class="value">${recentActivityRate}%</div>
                    <div class="hint">按近 30 天中有贡献的日期占比计算。</div>
                </div>
                <div class="action-item">
                    <div class="label">最高产月份</div>
                    <div class="value">${monthNames[bestMonthIndex]}</div>
                    <div class="hint">累计 ${data.monthlyData[bestMonthIndex].toLocaleString()} 次贡献。</div>
                </div>
                <div class="action-item">
                    <div class="label">最高产星期</div>
                    <div class="value">${weekNames[bestWeekIndex]}</div>
                    <div class="hint">累计 ${data.weeklyData[bestWeekIndex].toLocaleString()} 次贡献。</div>
                </div>
                <div class="action-item">
                    <div class="label">贡献高峰日</div>
                    <div class="value">${data.maxDay} 次</div>
                    <div class="hint">${topDaysText}</div>
                </div>
            `;
            actionInsights.style.display = 'grid';
        }

        function getYearTotal(data, year) {
            const target = data.yearlyTotals.find(item => Number(item.year) === Number(year));
            return target ? target.total : 0;
        }

        function renderYearProgress(data) {
            const now = new Date();
            const currentYear = now.getFullYear();
            const lastYear = currentYear - 1;
            const currentYearTotal = getYearTotal(data, currentYear);
            const lastYearTotal = getYearTotal(data, lastYear);
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31);
            const elapsedDays = Math.max(1, Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1);
            const totalDays = Math.floor((endOfYear - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
            const timeProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
            const projectedTotal = Math.round((currentYearTotal / elapsedDays) * totalDays);
            const comparedToLastYear = lastYearTotal > 0
                ? Math.round((currentYearTotal / lastYearTotal) * 100)
                : 0;
            const gapToLastYear = Math.max(0, lastYearTotal - currentYearTotal);

            yearProgress.innerHTML = `
                <div class="year-progress-header">
                    <div>
                        <h3>${currentYear} 年度进度</h3>
                        <span>按今年已过天数估算全年贡献趋势</span>
                    </div>
                    <span>时间进度 ${timeProgress}%</span>
                </div>
                <div class="year-progress-track" aria-label="${currentYear} 年时间进度">
                    <div class="year-progress-fill" style="width:${timeProgress}%"></div>
                </div>
                <div class="year-progress-grid">
                    <div class="year-progress-metric"><strong>${currentYearTotal.toLocaleString()}</strong><span>今年已贡献</span></div>
                    <div class="year-progress-metric"><strong>${projectedTotal.toLocaleString()}</strong><span>预计全年贡献</span></div>
                    <div class="year-progress-metric"><strong>${lastYearTotal.toLocaleString()}</strong><span>${lastYear} 年贡献</span></div>
                    <div class="year-progress-metric"><strong>${lastYearTotal > 0 ? comparedToLastYear + '%' : '暂无'}</strong><span>相对去年完成度</span></div>
                    <div class="year-progress-metric"><strong>${gapToLastYear.toLocaleString()}</strong><span>追平去年还差</span></div>
                </div>
            `;
            yearProgress.style.display = 'block';
        }

        function clearReportUI() {
            bigStatsDiv.style.display = 'none';
            chartsGrid.style.display = 'none';
            actionInsights.style.display = 'none';
            yearProgress.style.display = 'none';
            profileSection.style.display = 'none';
            setProfileCollapsed(false);
            profileExtras.style.display = 'none';
            userInfoDiv.style.display = 'none';
            summaryCard.style.display = 'none';
        }

        function renderReport(source, username, userInfo, result) {
            currentReportData = result;
            const { contributionMap, total, activeDays, avgDaily, longestStreak, startDate, endDate, totalYears } = result;
            if (Object.keys(contributionMap).length === 0) {
                throw new Error('该用户无任何贡献记录');
            }
            const createdDate = new Date(userInfo.createdAt).toLocaleDateString('zh-CN');
            userInfoDiv.innerHTML = `<img class="user-avatar" src="${userInfo.avatarUrl}" alt="avatar"><div class="user-details"><div class="name">${userInfo.name || userInfo.login}</div><div class="meta">@${userInfo.login} · 注册 ${createdDate} · ${userInfo.location || ''} ${userInfo.bio ? '· ' + userInfo.bio : ''}</div></div>`;
            userInfoDiv.style.display = 'flex';
            drawHeatmapWithData(contributionMap, startDate, endDate);
            setupCanvasHover();
            document.getElementById('statTotal').textContent = total.toLocaleString();
            document.getElementById('statActiveDays').textContent = activeDays;
            document.getElementById('statStreak').textContent = longestStreak;
            document.getElementById('statAvg').textContent = avgDaily;
            document.getElementById('statActiveRate').textContent = calculateActiveRate(activeDays, userInfo.createdAt);
            bigStatsDiv.style.display = 'flex';
            renderActionInsights(result);
            renderYearProgress(result);
            updateRegisterDays(userInfo.createdAt);
            renderCharts(result);
            chartsGrid.style.display = 'grid';
            generateInsights(result, username, userInfo);
            summaryCard.style.display = 'block';
            stopSmoothProgress(true, '完成！');
            const suffix = `（包含${new Date().getFullYear()}年数据）`;
            showStatus(`✅ ${sourceConfig[source].name} 加载成功！共 ${totalYears} 个年度，总计 ${total} 次贡献${suffix}`, false, 'success');
        }

        async function fetchAllYears(username, token, createdAt) {
            const today = new Date();
            const startDate = new Date(createdAt);
            const ranges = splitDateRangeByAccurateYears(startDate, today);
            const allMaps = new Array(ranges.length);
            const batchSize = token ? 5 : 3;
            const concurrency = token ? 3 : 2;
            const batches = [];
            for (let i = 0; i < ranges.length; i += batchSize) {
                batches.push({
                    startIndex: i,
                    ranges: ranges.slice(i, i + batchSize)
                });
            }
            let nextIndex = 0;
            let completed = 0;

            setProgressText(`正在批量获取 ${ranges.length} 个年度贡献数据`);

            async function fetchNextBatch() {
                while (nextIndex < batches.length) {
                    const index = nextIndex++;
                    const batch = batches[index];
                    const batchData = await fetchYearBatch(username, batch.ranges, token);
                    batchData.forEach((yearData, offset) => {
                        allMaps[batch.startIndex + offset] = yearData;
                    });
                    completed += batch.ranges.length;
                    setProgressText(`已获取 ${completed}/${ranges.length} 个年度贡献数据`);
                }
            }

            const workerCount = Math.min(concurrency, batches.length);
            await Promise.all(Array.from({ length: workerCount }, fetchNextBatch));

            const grandTotal = allMaps.reduce((sum, yearData) => sum + yearData.total, 0);
            const mergedMap = {};
            for (const yearData of allMaps) Object.assign(mergedMap, yearData.map);
            return buildStatsFromContributionMap(mergedMap, grandTotal, startDate, today, ranges);
        }

        async function fetchGiteeAllYears(username, token, createdAt) {
            const today = new Date();
            const startDate = new Date(createdAt);
            const ranges = splitDateRangeByAccurateYears(startDate, today);
            const eventsData = await fetchGiteeEvents(username, token, createdAt, today);
            return buildStatsFromContributionMap(eventsData.map, eventsData.total, startDate, today, ranges);
        }

        async function fetchAllSourceData(source, username, token, createdAt) {
            if (source === 'gitee') return fetchGiteeAllYears(username, token, createdAt);
            if (!token) throw new Error(`GitHub 用户 "${username}" 已找到，但贡献日历需要配置 Personal Access Token（无需额外权限）`);
            return fetchAllYears(username, token, createdAt);
        }

        function generateInsights(data, username, userInfo) {
            const { total, activeDays, maxDay, avgDaily, longestStreak, trend, yearlyTotals } = data;
            let summary = `@${username} 自${userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString('zh-CN') : '注册'}以来，`;
            summary += `共完成了 <strong>${total.toLocaleString()}</strong> 次贡献，活跃天数 <strong>${activeDays}</strong> 天，`;
            summary += `最长连续贡献 <strong>${longestStreak}</strong> 天，单日最高 <strong>${maxDay}</strong> 次。`;
            summary += `<br><br>📊 日均贡献 <strong>${avgDaily}</strong> 次，`;
            if (trend > 10) summary += `<span class="trend-up">近期贡献量较前期增长 ${trend}% 📈，势头强劲！</span>`;
            else if (trend < -10) summary += `<span class="trend-down">近期贡献量较前期下降 ${Math.abs(trend)}% 📉，可以加把劲哦~</span>`;
            else summary += `近期贡献量与前期基本持平，稳定输出！`;
            if (yearlyTotals.length >= 1) {
                const lastYearData = yearlyTotals[yearlyTotals.length-1];
                summary += `<br><br>🏆 <strong>${lastYearData.year}年</strong> 贡献 ${lastYearData.total.toLocaleString()} 次，`;
                if (yearlyTotals.length >= 2) {
                    const prevYear = yearlyTotals[yearlyTotals.length-2].total;
                    const yearTrend = prevYear > 0 ? ((lastYearData.total - prevYear) / prevYear * 100).toFixed(1) : 0;
                    summary += `相较于 ${yearlyTotals[yearlyTotals.length-2].year} 年 ${yearTrend > 0 ? '增长' : '下降'} ${Math.abs(yearTrend)}%。`;
                } else {
                    summary += `这是完整的首年记录，继续保持！`;
                }
            }
            document.getElementById('summaryText').innerHTML = summary;
        }

        function updateRegisterDays(createdAt) {
            const registerDaysElement = document.getElementById('registerDays');
            if (createdAt) {
                const createdAtDate = new Date(createdAt);
                const now = new Date();
                const diffDays = Math.floor((now - createdAtDate) / (1000 * 60 * 60 * 24));
                registerDaysElement.textContent = diffDays;
            } else {
                registerDaysElement.textContent = 0;
            }
        }

        function calculateActiveRate(activeDays, createdAt) {
            if (!createdAt) return '0.00';
            const createdAtDate = new Date(createdAt);
            const now = new Date();
            const registerDays = Math.floor((now - createdAtDate) / (1000 * 60 * 60 * 24));
            if (!Number.isFinite(registerDays) || registerDays <= 0) return '0.00';
            return ((activeDays / registerDays) * 100).toFixed(2) + '%';
        }

        function renderCharts(data) {
            const { yearlyTotals, monthlyData, weeklyData, levelCounts, quarterlyData, cumulativeData } = data;
            if (yearlyChart) yearlyChart.destroy();
            yearlyChart = new Chart(document.getElementById('yearlyChart'), {
                type: 'bar',
                data: { labels: yearlyTotals.map(y => y.year), datasets: [{ label: '贡献次数', data: yearlyTotals.map(y => y.total), backgroundColor: '#2da44e', borderRadius: 8 }] },
                options: { responsive: true, maintainAspectRatio: true, plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toLocaleString()} 次贡献` } } } }
            });
            if (monthlyChart) monthlyChart.destroy();
            monthlyChart = new Chart(document.getElementById('monthlyChart'), {
                type: 'line',
                data: { labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'], datasets: [{ label: '贡献次数', data: monthlyData, borderColor: '#2da44e', backgroundColor: 'rgba(45,164,78,0.1)', fill: true, tension: 0.3 }] },
                options: { responsive: true, maintainAspectRatio: true }
            });
            if (weeklyChart) weeklyChart.destroy();
            weeklyChart = new Chart(document.getElementById('weeklyChart'), {
                type: 'radar',
                data: { labels: ['周日','周一','周二','周三','周四','周五','周六'], datasets: [{ label: '总贡献数', data: weeklyData, backgroundColor: 'rgba(45,164,78,0.2)', borderColor: '#2da44e', pointBackgroundColor: '#2da44e' }] },
                options: { responsive: true, maintainAspectRatio: true }
            });
            if (levelChart) levelChart.destroy();
            levelChart = new Chart(document.getElementById('levelChart'), {
                type: 'doughnut',
                data: { labels: ['0次','1-4次','5-9次','10-19次','20+次'], datasets: [{ data: [levelCounts['0'], levelCounts['1-4'], levelCounts['5-9'], levelCounts['10-19'], levelCounts['20+']], backgroundColor: ['#ebedf0','#9be9a8','#40c463','#30a14e','#216e39'] }] },
                options: { responsive: true, maintainAspectRatio: true }
            });
            if (quarterlyChart) quarterlyChart.destroy();
            quarterlyChart = new Chart(document.getElementById('quarterlyChart'), {
                type: 'bar',
                data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [{ label: '贡献次数', data: quarterlyData, backgroundColor: '#40c463', borderRadius: 8 }] },
                options: { responsive: true, maintainAspectRatio: true }
            });
            if (cumulativeChart) cumulativeChart.destroy();
            const step = Math.max(1, Math.floor(cumulativeData.length / 12));
            const cumuLabels = cumulativeData.filter((_, i) => i % step === 0).map(d => d.date);
            const cumuValues = cumulativeData.filter((_, i) => i % step === 0).map(d => d.total);
            cumulativeChart = new Chart(document.getElementById('cumulativeChart'), {
                type: 'line',
                data: { labels: cumuLabels, datasets: [{ label: '累计贡献', data: cumuValues, borderColor: '#2da44e', backgroundColor: 'rgba(45,164,78,0.05)', fill: true, tension: 0.3 }] },
                options: { responsive: true, maintainAspectRatio: true }
            });
        }

        async function exportAsPNG() { if (!currentReportData) { showStatus('请先生成报告再导出', true, 'error'); return; } showStatus('正在生成PNG...', false, 'info'); try { const element = document.getElementById('reportContainer'); const canvasImg = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false }); const link = document.createElement('a'); link.download = `${sourceSelect.value}_${usernameInput.value.trim()}_报告.png`; link.href = canvasImg.toDataURL(); link.click(); showStatus('PNG导出成功！', false, 'success'); } catch (err) { showStatus('导出失败：' + err.message, true, 'error'); } }
        async function exportAsPDF() { if (!currentReportData) { showStatus('请先生成报告再导出', true, 'error'); return; } showStatus('正在生成PDF...', false, 'info'); try { const element = document.getElementById('reportContainer'); const canvasImg = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false }); const { jsPDF } = window.jspdf; const imgData = canvasImg.toDataURL('image/png'); const imgWidth = 210; const pageHeight = 297; const imgHeight = (canvasImg.height * imgWidth) / canvasImg.width; let pdf = new jsPDF('p', 'mm', 'a4'); let position = 0; pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); let heightLeft = imgHeight - pageHeight; while (heightLeft > 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); heightLeft -= pageHeight; } pdf.save(`${sourceSelect.value}_${usernameInput.value.trim()}_报告.pdf`); showStatus('PDF导出成功！', false, 'success'); } catch (err) { showStatus('导出失败：' + err.message, true, 'error'); } }

        function exportAsCSV() {
            if (!currentReportData) {
                showStatus('请先生成报告再导出', true, 'error');
                return;
            }
            const rows = [['date', 'contributions']];
            Object.entries(currentReportData.contributionMap)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .forEach(([date, count]) => rows.push([date, count]));
            const csv = rows.map(row => row.join(',')).join('\n');
            const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${sourceSelect.value}_${usernameInput.value.trim()}_contributions.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            showStatus('CSV导出成功！', false, 'success');
        }

        async function loadAndDraw() {
            const username = usernameInput.value.trim();
            const source = sourceSelect.value;
            const platformName = sourceConfig[source].name;
            if (!username) { showStatus(`请输入${platformName}用户名`, true, 'error'); return; }
            startSmoothProgress(`正在连接 ${platformName}...`);
            clearReportUI();
            try {
                const userInfo = await fetchUserInfo(source, username, currentToken);
                if (!userInfo) throw new Error(`${platformName} 用户 "${username}" 不存在`);
                setProgressText('正在加载公开仓库与贡献日历...');
                loadProfileExtras(source, username, currentToken);
                const result = await fetchAllSourceData(source, username, currentToken, userInfo.createdAt);
                renderReport(source, username, userInfo, result);
            } catch (err) {
                console.error(err);
                stopSmoothProgress(false);
                progressBar.style.display = 'none';
                showStatus(err.message, true, 'error');
                clearReportUI();
                currentReportData = null;
            }
        }

        fetchBtn.addEventListener('click', loadAndDraw);
        exportPNGBtn.addEventListener('click', exportAsPNG);
        exportPDFBtn.addEventListener('click', exportAsPDF);
        exportCSVBtn.addEventListener('click', exportAsCSV);
        profileToggle.addEventListener('click', () => {
            setProfileCollapsed(!profileSection.classList.contains('collapsed'));
        });
        usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadAndDraw(); });
        saveTokenBtn.addEventListener('click', () => { const newToken = tokenInput.value.trim(); const cfg = sourceConfig[sourceSelect.value]; if (newToken) { localStorage.setItem(cfg.tokenKey, newToken); currentToken = newToken; showStatus(`${cfg.name} Token已保存`, false, 'success'); } else { localStorage.removeItem(cfg.tokenKey); currentToken = ''; showStatus(`已清除${cfg.name} Token`, false, 'success'); } });
        
        let currentToken = '';

        function syncSourceUI() {
            const cfg = sourceConfig[sourceSelect.value];
            usernameInput.placeholder = cfg.placeholder;
            if (!usernameInput.value.trim() || usernameInput.value.trim() === sourceConfig.github.defaultUsername || usernameInput.value.trim() === sourceConfig.gitee.defaultUsername) {
                usernameInput.value = cfg.defaultUsername;
            }
            tokenInput.placeholder = cfg.tokenPlaceholder;
            tokenLabel.textContent = cfg.tokenLabel;
            tokenHint.textContent = cfg.tokenHint;
            githubTokenLink.style.display = sourceSelect.value === 'github' ? 'inline' : 'none';
            currentToken = localStorage.getItem(cfg.tokenKey) || '';
            tokenInput.value = currentToken;
        }

        sourceSelect.addEventListener('change', () => {
            currentReportData = null;
            syncSourceUI();
            showStatus(`已切换到 ${sourceConfig[sourceSelect.value].name} 数据源`, false, 'info');
        });
        syncSourceUI();
        
        setTimeout(() => { if (usernameInput.value) loadAndDraw(); }, 200);
    })();

