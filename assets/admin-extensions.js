(function() {
  'use strict';

  const BASE = '/dsf-web1.0/';
  const STORAGE_PREFIX = 'mc_activity_';
  const CURRENT_USER_KEY = 'mc_current_user';
  const USERS_KEY = 'mc_users';
  const MEMBERS_KEY = 'custom_members';

  function getStore(fullKey) {
    try {
      const data = localStorage.getItem(fullKey);
      return data ? JSON.parse(data) : null;
    } catch(e) {
      return null;
    }
  }

  function setStore(fullKey, value) {
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch(e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  function getUsers() {
    return getStore(USERS_KEY) || [];
  }

  function getMembers() {
    return getStore(STORAGE_PREFIX + MEMBERS_KEY) || [];
  }

  function setMembers(members) {
    setStore(STORAGE_PREFIX + MEMBERS_KEY, members);
  }

  function getScoreRecords() {
    return getStore(STORAGE_PREFIX + 'score_records') || [];
  }

  function setScoreRecords(records) {
    setStore(STORAGE_PREFIX + 'score_records', records);
  }

  function getSpecialRecords() {
    return getStore(STORAGE_PREFIX + 'special_records') || [];
  }

  function getCurrentUser() {
    try {
      const userData = localStorage.getItem(CURRENT_USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch(e) {
      return null;
    }
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
  }

  function generateAvatar(name) {
    const colors = ["#5CB85C","#5BC0DE","#F0AD4E","#D9534F","#9B59B6","#3498DB","#1ABC9C","#E67E22"];
    const idx = name.charCodeAt(0) % colors.length;
    const color = colors[idx];
    const initial = name.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="100" fill="url(#grad)"/>
      <text x="100" y="100" text-anchor="middle" dominant-baseline="central" fill="white" font-size="80" font-weight="bold" font-family="Arial, sans-serif">
        ${initial}
      </text>
    </svg>`;
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg.trim())));
  }

  function syncMembersFromUsers() {
    const users = getUsers();
    const members = getMembers();
    
    const userIds = new Set(users.map(u => u.id));
    
    let changed = false;
    const newMembers = [];
    
    for (const user of users) {
      const existingMember = members.find(m => m.id === user.id);
      if (existingMember) {
        let memberChanged = false;
        const updatedMember = { ...existingMember };
        if (updatedMember.nickname !== user.nickname) { updatedMember.nickname = user.nickname; memberChanged = true; }
        if (updatedMember.qq_number !== user.qq_number) { updatedMember.qq_number = user.qq_number; memberChanged = true; }
        if (user.avatar_url && updatedMember.avatar_url !== user.avatar_url) { updatedMember.avatar_url = user.avatar_url; memberChanged = true; }
        if (memberChanged) {
          changed = true;
          console.log(`[同步] 更新成员: ${user.nickname}`);
        }
        newMembers.push(updatedMember);
      } else {
        newMembers.push({
          id: user.id,
          nickname: user.nickname,
          qq_number: user.qq_number,
          avatar_url: user.avatar_url || generateAvatar(user.nickname),
          notes: user.role === 'admin' ? '管理员' : '社区成员',
          tags: user.role === 'admin' ? ['管理员'] : ['成员'],
          created_at: user.created_at || new Date().toISOString()
        });
        changed = true;
        console.log(`[同步] 新增成员: ${user.nickname}`);
      }
    }
    
    const removedCount = members.length - newMembers.length;
    if (removedCount > 0) {
      changed = true;
      console.log(`[同步] 删除了 ${removedCount} 个不在用户列表中的成员`);
    }
    
    if (changed) {
      setMembers(newMembers);
      triggerStorageEvent();
      console.log(`[同步] 用户→成员库同步完成，共 ${newMembers.length} 名成员`);
    }
    
    return changed;
  }

  function calculateMemberPoints(memberId) {
    const records = getScoreRecords().filter(r => r.member_id === memberId);
    return records.reduce((sum, r) => sum + (r.points || 0), 0);
  }

  function addScoreRecord(record) {
    const records = getScoreRecords();
    records.unshift(record);
    setScoreRecords(records);
    triggerStorageEvent();
  }

  function updateScoreRecord(id, updates) {
    const records = getScoreRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx] = { ...records[idx], ...updates };
      setScoreRecords(records);
      triggerStorageEvent();
      return true;
    }
    return false;
  }

  function deleteScoreRecord(id) {
    const records = getScoreRecords();
    const filtered = records.filter(r => r.id !== id);
    setScoreRecords(filtered);
    triggerStorageEvent();
    return filtered.length !== records.length;
  }

  function adjustMemberPoints(memberId, points, reason) {
    const record = {
      id: 'sr_' + Date.now(),
      member_id: memberId,
      points: parseInt(points) || 0,
      reason: reason || '管理员调整',
      record_type: 'adjustment',
      created_at: new Date().toISOString()
    };
    addScoreRecord(record);
    return record;
  }

  function triggerStorageEvent() {
    try {
      window.dispatchEvent(new Event('storage'));
    } catch(e) {}
  }

  function showModal(contentHtml, onMount) {
    const existing = document.getElementById('admin-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'admin-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;backdrop-filter:blur(4px);';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1d23;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
    modal.innerHTML = contentHtml;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    if (onMount) onMount(modal, overlay);

    return { overlay, modal };
  }

  function closeModal() {
    const overlay = document.getElementById('admin-modal-overlay');
    if (overlay) overlay.remove();
  }

  function injectGlobalStyles() {
    if (document.getElementById('admin-ext-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-ext-styles';
    style.textContent = `
      .admin-input { width:100%;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;transition:all 0.2s;box-sizing:border-box; }
      .admin-input:focus { outline:none;border-color:rgba(74,222,128,0.5);box-shadow:0 0 0 3px rgba(74,222,128,0.1); }
      .admin-label { display:block;font-size:13px;font-weight:500;color:rgba(255,255,255,0.7);margin-bottom:6px; }
      .admin-modal-title { font-size:18px;font-weight:700;color:#fff;margin:0 0 20px 0;display:flex;align-items:center;gap:8px; }
      .admin-modal-footer { display:flex;gap:10px;justify-content:flex-end;margin-top:20px; }
      .admin-btn-primary { padding:10px 20px;font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:10px;cursor:pointer;transition:all 0.2s; }
      .admin-btn-primary:hover { transform:translateY(-1px);box-shadow:0 4px 12px rgba(34,197,94,0.4); }
      .admin-btn-secondary { padding:10px 20px;font-size:14px;font-weight:500;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;transition:all 0.2s; }
      .admin-btn-secondary:hover { background:rgba(255,255,255,0.1); }
      .admin-score-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;text-align:center;margin-bottom:16px; }
      .admin-score-card-label { font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:4px; }
      .admin-score-card-value { font-size:36px;font-weight:700;color:#fbbf24; }
      .admin-adjust-panel { margin-top:16px; }
      .admin-adjust-row { display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end; }
      .admin-adjust-row > div { flex:1;min-width:140px; }
      .admin-adjust-info { font-size:12px;color:rgba(255,255,255,0.5);text-align:center;margin-top:8px; }
      .admin-score-row { display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:6px; }
      .admin-score-row-info { flex:1;min-width:0; }
      .admin-score-row-name { font-size:13px;font-weight:500;color:#fff;margin-bottom:2px; }
      .admin-score-row-reason { font-size:11px;color:rgba(255,255,255,0.5); }
      .admin-score-row-points { font-size:14px;font-weight:700;margin-right:10px;min-width:50px;text-align:right;flex-shrink:0; }
      .admin-score-row-points.positive { color:#4ade80; }
      .admin-score-row-points.negative { color:#f87171; }
      .admin-score-row-actions { display:flex;gap:4px;flex-shrink:0; }
      .admin-empty { text-align:center;padding:20px;color:rgba(255,255,255,0.4);font-size:13px; }
      .admin-ban-btn { display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;font-weight:500;color:#f87171;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:8px;cursor:pointer;transition:all 0.2s;text-decoration:none;flex-shrink:0; }
      .admin-ban-btn:hover { background:rgba(248,113,113,0.2);border-color:rgba(248,113,113,0.5); }
      .admin-score-cell { font-weight:600; }
      .admin-score-cell.positive { color:#16a34a; }
      .admin-score-cell.negative { color:#dc2626; }
      .admin-score-cell.zero { color:#9ca3af; }
      .admin-adjust-btn { padding:4px 10px;font-size:12px;font-weight:500;color:#fff;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;border-radius:6px;cursor:pointer;transition:all 0.2s;white-space:nowrap; }
      .admin-adjust-btn:hover { transform:translateY(-1px);box-shadow:0 2px 8px rgba(245,158,11,0.4); }
      .admin-sync-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 8px;font-size:11px;font-weight:500;color:#10b981;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:999px; }
      @keyframes admin-fade-in { from { opacity:0;transform:translateY(-6px);} to { opacity:1;transform:translateY(0);} }
      .admin-animate-in { animation:admin-fade-in 0.2s ease; }
    `;
    document.head.appendChild(style);
  }

  function getCurrentPath() {
    let path = window.location.pathname;
    if (path.startsWith(BASE)) {
      path = path.slice(BASE.length - 1);
    }
    return path;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function openScoreAdjustModal(member, onClose) {
    const currentPoints = calculateMemberPoints(member.id);
    const records = getScoreRecords().filter(r => r.member_id === member.id);

    let recordsHtml = '';
    if (records.length === 0) {
      recordsHtml = '<div class="admin-empty">暂无积分记录</div>';
    } else {
      recordsHtml = records.slice(0, 10).map(r => `
        <div class="admin-score-row" data-id="${r.id}">
          <div class="admin-score-row-info">
            <div class="admin-score-row-name">${escapeHtml(r.reason || '未命名记录')}</div>
            <div class="admin-score-row-reason">${escapeHtml(r.record_type || '')} · ${new Date(r.created_at).toLocaleDateString('zh-CN')}</div>
          </div>
          <span class="admin-score-row-points ${r.points >= 0 ? 'positive' : 'negative'}">${r.points >= 0 ? '+' : ''}${r.points}</span>
          <div class="admin-score-row-actions">
            <button class="admin-delete-record-btn" data-id="${r.id}" style="padding:3px 8px;font-size:10px;background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.3);border-radius:4px;cursor:pointer;">删除</button>
          </div>
        </div>
      `).join('');
    }

    const html = `
      <h2 class="admin-modal-title">🎯 积分调整 - ${escapeHtml(member.nickname)}</h2>
      <div class="admin-score-card">
        <div class="admin-score-card-label">当前积分</div>
        <div class="admin-score-card-value" id="current-points-display">${currentPoints}</div>
      </div>
      <div class="admin-adjust-panel">
        <div class="admin-adjust-row">
          <div>
            <label class="admin-label">调整到积分</label>
            <input type="number" id="target-points" class="admin-input" placeholder="输入目标积分" min="0" value="${currentPoints}" />
          </div>
          <div>
            <label class="admin-label">调整原因</label>
            <input type="text" id="adjust-reason" class="admin-input" placeholder="调整原因（可选）" />
          </div>
        </div>
        <div class="admin-adjust-info" id="adjust-preview">差值 = 目标积分 - 当前积分</div>
      </div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);margin-bottom:10px;">📋 最近积分记录</div>
        <div style="max-height:180px;overflow-y:auto;" id="records-container">
          ${recordsHtml}
        </div>
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="close-modal-btn">关闭</button>
        <button class="admin-btn-primary" id="confirm-adjust-btn">确认调整</button>
      </div>
    `;

    const refreshModal = function() {
      const newPoints = calculateMemberPoints(member.id);
      const newRecords = getScoreRecords().filter(r => r.member_id === member.id);
      const display = document.getElementById('current-points-display');
      const targetInput = document.getElementById('target-points');
      if (display) display.textContent = newPoints;
      if (targetInput) targetInput.value = newPoints;
      
      const recordsContainer = document.getElementById('records-container');
      if (recordsContainer) {
        if (newRecords.length === 0) {
          recordsContainer.innerHTML = '<div class="admin-empty">暂无积分记录</div>';
        } else {
          recordsContainer.innerHTML = newRecords.slice(0, 10).map(r => `
            <div class="admin-score-row" data-id="${r.id}">
              <div class="admin-score-row-info">
                <div class="admin-score-row-name">${escapeHtml(r.reason || '未命名记录')}</div>
                <div class="admin-score-row-reason">${escapeHtml(r.record_type || '')} · ${new Date(r.created_at).toLocaleDateString('zh-CN')}</div>
              </div>
              <span class="admin-score-row-points ${r.points >= 0 ? 'positive' : 'negative'}">${r.points >= 0 ? '+' : ''}${r.points}</span>
              <div class="admin-score-row-actions">
                <button class="admin-delete-record-btn" data-id="${r.id}" style="padding:3px 8px;font-size:10px;background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.3);border-radius:4px;cursor:pointer;">删除</button>
              </div>
            </div>
          `).join('');
          recordsContainer.querySelectorAll('.admin-delete-record-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              const recordId = this.dataset.id;
              if (confirm('确定要删除这条积分记录吗？')) {
                deleteScoreRecord(recordId);
                refreshModal();
              }
            });
          });
        }
      }
    };

    showModal(html, function(modal) {
      modal.querySelector('#close-modal-btn').addEventListener('click', function() {
        closeModal();
        if (onClose) onClose();
      });

      const targetInput = modal.querySelector('#target-points');
      const preview = modal.querySelector('#adjust-preview');
      targetInput.addEventListener('input', function() {
        const target = parseInt(this.value);
        const current = calculateMemberPoints(member.id);
        if (!isNaN(target)) {
          const diff = target - current;
          preview.textContent = `差值：${diff >= 0 ? '+' : ''}${diff} 分`;
          preview.style.color = diff >= 0 ? '#4ade80' : '#f87171';
        } else {
          preview.textContent = '差值 = 目标积分 - 当前积分';
          preview.style.color = '';
        }
      });

      modal.querySelector('#confirm-adjust-btn').addEventListener('click', function() {
        const targetPoints = parseInt(modal.querySelector('#target-points').value);
        const reason = modal.querySelector('#adjust-reason').value || '管理员调整积分';
        
        if (isNaN(targetPoints) || targetPoints < 0) {
          alert('请输入有效的目标积分（大于等于0）');
          return;
        }

        const currentPoints = calculateMemberPoints(member.id);
        const diff = targetPoints - currentPoints;

        if (diff === 0) {
          alert('目标积分与当前积分相同，无需调整');
          return;
        }

        if (confirm(`确定要将 ${escapeHtml(member.nickname)} 的积分从 ${currentPoints} 调整到 ${targetPoints} 吗？\n差值：${diff >= 0 ? '+' : ''}${diff}`)) {
          adjustMemberPoints(member.id, diff, reason);
          alert(`调整成功！\n${escapeHtml(member.nickname)} 的积分已从 ${currentPoints} 调整到 ${targetPoints}`);
          closeModal();
          if (onClose) onClose();
        }
      });

      modal.querySelectorAll('.admin-delete-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const recordId = this.dataset.id;
          if (confirm('确定要删除这条积分记录吗？')) {
            deleteScoreRecord(recordId);
            refreshModal();
          }
        });
      });
    });
  }

  function findUserById(userId) {
    return getUsers().find(u => u.id === userId);
  }

  function findUserByQQ(qq) {
    return getUsers().find(u => u.qq_number === qq);
  }

  function findUserByNickname(nickname) {
    return getUsers().find(u => u.nickname === nickname);
  }

  function setupSpecialRecordsAutoRefresh() {
    const path = getCurrentPath();
    if (!path.includes('/special-records')) return;
    if (document.body.dataset.specialRefreshSetup === 'true') return;
    document.body.dataset.specialRefreshSetup = 'true';

    let lastSpecialRecords = JSON.stringify(getSpecialRecords());
    let isReloading = false;

    function checkAndRefresh() {
      if (isReloading) return;
      const currentRecords = JSON.stringify(getSpecialRecords());
      if (currentRecords !== lastSpecialRecords) {
        lastSpecialRecords = currentRecords;
        isReloading = true;
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }
    }

    window.addEventListener('storage', checkAndRefresh);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (key === STORAGE_PREFIX + 'special_records') {
        checkAndRefresh();
      }
    };

    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (key === STORAGE_PREFIX + 'special_records') {
        checkAndRefresh();
      }
    };

    setInterval(checkAndRefresh, 1000);

    const observer = new MutationObserver(function() {
      checkAndRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function enhanceSpecialRecordsPage() {
    const path = getCurrentPath();
    if (!path.includes('/special-records')) return;
    if (document.querySelector('.admin-ban-btn')) return;

    const tryAddBanButton = function() {
      if (document.querySelector('.admin-ban-btn')) return true;

      const selectors = [
        'h1', 'h2', '.page-title', '[class*="title"]',
        'button[class*="primary"]', 'button[class*="add"]',
        '.mc-card', '[class*="card"]',
        'input[placeholder*="搜索"]',
        '[class*="flex"][class*="justify-between"]',
        '[class*="flex"][class*="gap"]'
      ];

      let insertTarget = null;
      let insertMethod = 'after';

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent || '';
          const isSpecial = text.includes('特殊榜单') || 
                           text.includes('特殊记录') ||
                           text.includes('Special') ||
                           el.closest('[class*="special"]');

          if (isSpecial || selector.includes('flex') || selector.includes('gap')) {
            const parent = el.parentElement;
            if (parent && parent.querySelector('[class*="card"]')) {
              continue;
            }
            if (el.querySelector('input, button') && el.children.length >= 2) {
              insertTarget = el;
              insertMethod = 'append';
              break;
            }
            if (isSpecial && parent) {
              insertTarget = parent;
              insertMethod = 'after';
              break;
            }
          }
        }
        if (insertTarget) break;
      }

      if (!insertTarget) {
        const cards = document.querySelectorAll('.mc-card, [class*="card"]');
        if (cards.length > 0) {
          for (const card of cards) {
            if (card.querySelector('h1, h2, h3')) {
              insertTarget = card;
              insertMethod = 'prepend';
              break;
            }
          }
        }
      }

      if (!insertTarget) {
        const mainContent = document.querySelector('.max-w-6xl, [class*="container"], main, #app > div');
        if (mainContent) {
          insertTarget = mainContent.firstElementChild || mainContent;
          insertMethod = 'after';
        }
      }

      if (!insertTarget) return false;

      const banLink = document.createElement('a');
      banLink.className = 'admin-ban-btn admin-animate-in';
      banLink.href = 'https://bans.geukchisseokda.top';
      banLink.target = '_blank';
      banLink.rel = 'noopener noreferrer';
      banLink.innerHTML = '🚫 查看被ban名单';

      if (insertMethod === 'append') {
        insertTarget.appendChild(banLink);
      } else if (insertMethod === 'prepend') {
        insertTarget.insertBefore(banLink, insertTarget.firstChild);
        banLink.style.marginBottom = '16px';
      } else {
        insertTarget.parentNode.insertBefore(banLink, insertTarget.nextSibling);
        banLink.style.marginTop = '16px';
        banLink.style.display = 'inline-flex';
      }

      return true;
    };

    let attempts = 0;
    const maxAttempts = 10;
    
    function tryWithDelay() {
      if (attempts >= maxAttempts) return;
      if (tryAddBanButton()) return;
      attempts++;
      setTimeout(tryWithDelay, 300 * attempts);
    }

    tryWithDelay();

    const observer = new MutationObserver(function() {
      clearTimeout(window._banBtnObserverTimer);
      window._banBtnObserverTimer = setTimeout(function() {
        tryAddBanButton();
      }, 200);
    });
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function enhanceUserManagementPage() {
    const path = getCurrentPath();
    if (!path.includes('/admin/users')) return;

    syncMembersFromUsers();

    if (document.querySelector('.admin-score-column')) return;

    const tryAddScoreColumn = function() {
      if (document.querySelector('.admin-score-column')) return true;

      const table = document.querySelector('table');
      if (!table) return false;

      const thead = table.querySelector('thead tr');
      const tbody = table.querySelector('tbody');
      if (!thead || !tbody) return false;

      const th = document.createElement('th');
      th.className = 'admin-score-column text-left px-6 py-3 text-sm font-semibold text-gray-600';
      th.textContent = '积分';
      
      const operationTh = thead.querySelector('th:last-child');
      if (operationTh) {
        thead.insertBefore(th, operationTh);
      }

      function updateRows() {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
          if (row.querySelector('.admin-score-cell')) return;

          const nameEl = row.querySelector('.font-medium');
          const qqEl = row.querySelector('.font-mono');
          const idEl = row.querySelector('.text-xs.text-gray-400');
          
          let user = null;
          let userId = null;
          let points = 0;

          if (idEl) {
            const idText = idEl.textContent || '';
            const idMatch = idText.match(/ID:\s*(user_[^\s]+)/);
            if (idMatch) {
              const fullId = idMatch[1];
              user = findUserById(fullId);
            }
          }

          if (!user && qqEl) {
            const qq = qqEl.textContent.trim();
            user = findUserByQQ(qq);
          }
          
          if (!user && nameEl) {
            const name = nameEl.textContent.trim().replace(/\s+我\s*$/, '').trim();
            user = findUserByNickname(name);
          }

          if (user) {
            userId = user.id;
            points = calculateMemberPoints(userId);
          }

          const pointsClass = points > 0 ? 'positive' : points < 0 ? 'negative' : 'zero';

          const td = document.createElement('td');
          td.className = 'admin-score-cell-wrap px-6 py-4';
          td.innerHTML = `
            <span class="admin-score-cell ${pointsClass}" data-user-id="${userId || ''}">
              ${points}
            </span>
          `;

          const operationTd = row.querySelector('td:last-child');
          if (operationTd) {
            row.insertBefore(td, operationTd);
            
            const adjustBtn = document.createElement('button');
            adjustBtn.className = 'admin-adjust-btn';
            adjustBtn.textContent = '调整积分';
            adjustBtn.style.marginLeft = '8px';
            adjustBtn.style.display = 'inline-flex';
            adjustBtn.style.alignItems = 'center';
            
            adjustBtn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              
              let targetUser = user;
              
              if (!targetUser && idEl) {
                const idText = idEl.textContent || '';
                const idMatch = idText.match(/ID:\s*(user_[^\s]+)/);
                if (idMatch) {
                  targetUser = findUserById(idMatch[1]);
                }
              }
              
              if (!targetUser && qqEl) {
                const qq = qqEl.textContent.trim();
                targetUser = findUserByQQ(qq);
              }
              if (!targetUser && nameEl) {
                const name = nameEl.textContent.trim().replace(/\s+我\s*$/, '').trim();
                targetUser = findUserByNickname(name);
              }

              if (targetUser) {
                syncMembersFromUsers();
                openScoreAdjustModal(targetUser, function() {
                  const newPoints = calculateMemberPoints(targetUser.id);
                  const cell = row.querySelector('.admin-score-cell');
                  if (cell) {
                    cell.textContent = newPoints;
                    const newClass = newPoints > 0 ? 'positive' : newPoints < 0 ? 'negative' : 'zero';
                    cell.className = `admin-score-cell ${newClass}`;
                  }
                });
              } else {
                alert('无法找到该用户信息');
              }
            });

            const actionContainer = operationTd.querySelector('.flex, [class*="flex"]');
            if (actionContainer) {
              actionContainer.appendChild(adjustBtn);
            } else {
              operationTd.appendChild(adjustBtn);
            }
          }
        });
      }

      updateRows();

      const observer = new MutationObserver(function() {
        clearTimeout(window._userTableObserverTimer);
        window._userTableObserverTimer = setTimeout(function() {
          syncMembersFromUsers();
          updateRows();
        }, 100);
      });
      observer.observe(tbody, { childList: true, subtree: true });

      return true;
    };

    let attempts = 0;
    const maxAttempts = 10;
    
    function tryWithDelay() {
      if (attempts >= maxAttempts) return;
      if (tryAddScoreColumn()) return;
      attempts++;
      setTimeout(tryWithDelay, 300 * attempts);
    }

    tryWithDelay();

    const observer = new MutationObserver(function() {
      clearTimeout(window._userMgmtObserverTimer);
      window._userMgmtObserverTimer = setTimeout(function() {
        tryAddScoreColumn();
      }, 200);
    });
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function setupAutoSync() {
    if (document.body.dataset.autoSyncSetup === 'true') return;
    document.body.dataset.autoSyncSetup = 'true';

    syncMembersFromUsers();

    setInterval(syncMembersFromUsers, 3000);

    window.addEventListener('storage', function(e) {
      if (e.key === USERS_KEY) {
        syncMembersFromUsers();
      }
    });

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (key === USERS_KEY) {
        setTimeout(syncMembersFromUsers, 100);
      }
    };

    console.log('%c🔄 用户→成员库 自动同步已启动', 'color: #4ade80; font-weight: bold;');
  }

  function enhanceMembersPage() {
    const path = getCurrentPath();
    if (!path.includes('/members') || path.includes('/members/')) return;
    if (document.body.dataset.membersEnhanced === 'true') return;
    document.body.dataset.membersEnhanced = 'true';

    const userIds = new Set(getUsers().map(u => u.id));
    const userQQs = new Set(getUsers().map(u => u.qq_number));

    function filterMembers() {
      const memberCards = document.querySelectorAll('[class*="grid"] > a[href*="/members/"], [class*="grid"] > div[class*="group"]');
      if (memberCards.length === 0) return;

      memberCards.forEach(card => {
        const qqEl = card.querySelector('.font-mono');
        const href = card.getAttribute('href') || '';
        const idMatch = href.match(/\/members\/(.+)/);
        const memberId = idMatch ? idMatch[1] : null;

        let shouldShow = false;
        if (memberId && userIds.has(memberId)) {
          shouldShow = true;
        }
        if (!shouldShow && qqEl) {
          const qq = qqEl.textContent.replace(/QQ:\s*/, '').trim();
          if (userQQs.has(qq)) {
            shouldShow = true;
          }
        }

        if (!shouldShow) {
          card.style.display = 'none';
        } else {
          card.style.display = '';
        }
      });

      const countEl = document.querySelector('p[class*="text-2xl"], p[class*="font-bold"]');
      if (countEl) {
        const visibleCount = Array.from(memberCards).filter(c => c.style.display !== 'none').length;
        if (visibleCount > 0) {
          countEl.textContent = visibleCount;
        }
      }
    }

    let filterTimer = null;
    const observer = new MutationObserver(function() {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(filterMembers, 100);
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    setTimeout(filterMembers, 500);
    setTimeout(filterMembers, 1500);

    console.log('%c👥 成员库页面同步过滤已启动', 'color: #10b981; font-weight: bold;');
  }

  function setupScoreboardAutoRefresh() {
    const path = getCurrentPath();
    if (!path.includes('/scoreboard') && !path.includes('/ranking') && !path.includes('/积分榜')) return;
    if (document.body.dataset.scoreboardRefreshSetup === 'true') return;
    document.body.dataset.scoreboardRefreshSetup = 'true';

    let lastScoreRecords = JSON.stringify(getScoreRecords());
    let isReloading = false;

    function checkAndRefresh() {
      if (isReloading) return;
      const currentRecords = JSON.stringify(getScoreRecords());
      if (currentRecords !== lastScoreRecords) {
        lastScoreRecords = currentRecords;
        isReloading = true;
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }
    }

    window.addEventListener('storage', checkAndRefresh);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (key === STORAGE_PREFIX + 'score_records') {
        checkAndRefresh();
      }
    };

    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (key === STORAGE_PREFIX + 'score_records') {
        checkAndRefresh();
      }
    };

    setInterval(checkAndRefresh, 1000);

    const observer = new MutationObserver(function() {
      checkAndRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    console.log('%c📊 积分榜自动刷新已启动', 'color: #fbbf24; font-weight: bold;');
  }

  function initPageEnhancements() {
    if (isAdmin()) {
      setupAutoSync();
      setupSpecialRecordsAutoRefresh();
      setupScoreboardAutoRefresh();
      enhanceSpecialRecordsPage();
      enhanceUserManagementPage();
      enhanceMembersPage();
    }
  }

  function init() {
    injectGlobalStyles();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPageEnhancements);
    } else {
      initPageEnhancements();
    }

    let lastPath = getCurrentPath();
    setInterval(function() {
      const currentPath = getCurrentPath();
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        initPageEnhancements();
      }
    }, 500);

    console.log('%c⚡ 管理员扩展已加载', 'color: #4ade80; font-weight: bold; font-size: 14px;');
    console.log('%c当前用户: ' + (getCurrentUser()?.nickname || '未登录') + ' | 角色: ' + (isAdmin() ? '管理员' : '普通用户'), 'color: ' + (isAdmin() ? '#4ade80' : '#fbbf24') + '; font-weight: 500;');
    if (isAdmin()) {
      console.log('%c功能说明：', 'color: rgba(255,255,255,0.6); font-size: 12px;');
      console.log('%c1. 用户管理表格有积分列和调整按钮', 'color: rgba(255,255,255,0.6); font-size: 12px;');
      console.log('%c2. 特殊榜单有查看被ban名单按钮', 'color: rgba(255,255,255,0.6); font-size: 12px;');
      console.log('%c3. 特殊榜单添加后自动刷新', 'color: rgba(255,255,255,0.6); font-size: 12px;');
      console.log('%c4. 用户→成员库自动同步（每3秒）', 'color: rgba(255,255,255,0.6); font-size: 12px;');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AdminExtensions = {
    isAdmin,
    getUsers,
    getMembers,
    getScoreRecords,
    getSpecialRecords,
    getCurrentUser,
    calculateMemberPoints,
    addScoreRecord,
    updateScoreRecord,
    deleteScoreRecord,
    adjustMemberPoints,
    openScoreAdjustModal,
    syncMembersFromUsers,
    refreshPage: () => window.location.reload()
  };

})();
