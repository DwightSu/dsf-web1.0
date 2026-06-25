(function() {
  'use strict';

  const BASE = '/dsf-web1.0/';
  const STORAGE_PREFIX = 'mc_activity_';
  const CURRENT_USER_KEY = 'mc_current_user';

  function getStore(key) {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + key);
      return data ? JSON.parse(data) : null;
    } catch(e) {
      return null;
    }
  }

  function setStore(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch(e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  function getMembers() {
    return getStore('custom_members') || [];
  }

  function getScoreRecords() {
    return getStore('score_records') || [];
  }

  function getSpecialRecords() {
    return getStore('special_records') || [];
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

  function calculateMemberPoints(memberId) {
    const records = getScoreRecords().filter(r => r.member_id === memberId);
    return records.reduce((sum, r) => sum + (r.points || 0), 0);
  }

  function addScoreRecord(record) {
    const records = getScoreRecords();
    records.unshift(record);
    setStore('score_records', records);
    triggerStorageEvent();
  }

  function updateScoreRecord(id, updates) {
    const records = getScoreRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx] = { ...records[idx], ...updates };
      setStore('score_records', records);
      triggerStorageEvent();
      return true;
    }
    return false;
  }

  function deleteScoreRecord(id) {
    const records = getScoreRecords();
    const filtered = records.filter(r => r.id !== id);
    setStore('score_records', filtered);
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
    modal.style.cssText = 'background:#1a1d23;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
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
      .admin-btn-danger { padding:10px 20px;font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,#ef4444,#dc2626);border:none;border-radius:10px;cursor:pointer;transition:all 0.2s; }
      .admin-btn-danger:hover { transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,0.4); }
      .admin-score-row { display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:8px; }
      .admin-score-row-info { flex:1;min-width:0; }
      .admin-score-row-name { font-size:14px;font-weight:500;color:#fff;margin-bottom:2px; }
      .admin-score-row-reason { font-size:12px;color:rgba(255,255,255,0.5); }
      .admin-score-row-points { font-size:16px;font-weight:700;margin-right:12px;min-width:60px;text-align:right;flex-shrink:0; }
      .admin-score-row-points.positive { color:#4ade80; }
      .admin-score-row-points.negative { color:#f87171; }
      .admin-score-row-actions { display:flex;gap:6px;flex-shrink:0; }
      .admin-empty { text-align:center;padding:30px;color:rgba(255,255,255,0.4);font-size:14px; }
      .admin-score-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;font-size:12px;font-weight:600;color:#fbbf24;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:9999px; }
      .admin-member-item { padding:12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all 0.15s; }
      .admin-member-item:hover { background:rgba(255,255,255,0.05); }
      .admin-member-avatar { width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;flex-shrink:0; }
      .admin-member-info { flex:1;min-width:0; }
      .admin-member-name { color:#fff;font-weight:500;font-size:14px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
      .admin-member-score { font-size:12px;color:rgba(255,255,255,0.5); }
      .admin-member-action { flex-shrink:0; }
      .admin-score-total-card { background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:14px;text-align:center;margin-bottom:16px; }
      .admin-score-total-label { font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px; }
      .admin-score-total-value { font-size:28px;font-weight:700;color:#fbbf24; }
      .admin-ban-btn { display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;font-weight:500;color:#f87171;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:8px;cursor:pointer;transition:all 0.2s;text-decoration:none;flex-shrink:0; }
      .admin-ban-btn:hover { background:rgba(248,113,113,0.2);border-color:rgba(248,113,113,0.5); }
      .admin-section { margin-bottom:24px; }
      .admin-section-title { font-size:16px;font-weight:600;color:#fff;margin-bottom:12px;display:flex;align-items:center;gap:8px; }
      .admin-points-adjust-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px; }
      .admin-quick-adjust-row { display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end; }
      .admin-quick-adjust-row .admin-input-group { flex:1;min-width:120px; }
      .admin-score-manage-section { margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1); }
      .admin-score-manage-btn { width:100%;padding:10px;font-size:13px;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.3);border-radius:8px;cursor:pointer;transition:all 0.2s; }
      .admin-score-manage-btn:hover { background:rgba(74,222,128,0.2); }
      .admin-user-score-info { display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;margin-bottom:12px; }
      .admin-user-score-avatar { width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;flex-shrink:0;font-size:14px; }
      .admin-user-score-detail { flex:1;min-width:0; }
      .admin-user-score-name { color:#fff;font-weight:500;font-size:14px; }
      .admin-user-score-value { color:#fbbf24;font-size:12px;font-weight:600; }
      @keyframes admin-fade-in { from { opacity:0;transform:translateY(-10px);} to { opacity:1;transform:translateY(0);} }
      .admin-animate-in { animation:admin-fade-in 0.3s ease; }
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

  function findMemberById(memberId) {
    return getMembers().find(m => m.id === memberId);
  }

  function openScoreEditModal(member, onClose) {
    const records = getScoreRecords().filter(r => r.member_id === member.id);
    
    let recordsHtml = '';
    if (records.length === 0) {
      recordsHtml = '<div class="admin-empty">暂无积分记录</div>';
    } else {
      recordsHtml = records.map(r => `
        <div class="admin-score-row" data-id="${r.id}">
          <div class="admin-score-row-info">
            <div class="admin-score-row-name">${escapeHtml(r.reason || '未命名记录')}</div>
            <div class="admin-score-row-reason">${escapeHtml(r.record_type || '')} · ${new Date(r.created_at).toLocaleDateString('zh-CN')}</div>
          </div>
          <span class="admin-score-row-points ${r.points >= 0 ? 'positive' : 'negative'}">${r.points >= 0 ? '+' : ''}${r.points}</span>
          <div class="admin-score-row-actions">
            <button class="admin-edit-record-btn" data-id="${r.id}" style="padding:5px 10px;font-size:11px;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.3);border-radius:6px;cursor:pointer;">编辑</button>
            <button class="admin-delete-record-btn" data-id="${r.id}" style="padding:5px 10px;font-size:11px;background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.3);border-radius:6px;cursor:pointer;">删除</button>
          </div>
        </div>
      `).join('');
    }

    const totalPoints = calculateMemberPoints(member.id);

    const html = `
      <h2 class="admin-modal-title">✏️ 积分管理 - ${escapeHtml(member.nickname)}</h2>
      <div class="admin-score-total-card">
        <div class="admin-score-total-label">当前总积分</div>
        <div class="admin-score-total-value">${totalPoints}</div>
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">快速调整积分</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <input type="number" id="quick-points" class="admin-input" placeholder="积分数值（正加负扣）" style="flex:1;min-width:120px;" />
          <input type="text" id="quick-reason" class="admin-input" placeholder="调整原因" style="flex:1;min-width:120px;" />
          <button id="quick-add-btn" class="admin-btn-primary">确认调整</button>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label class="admin-label">积分记录列表（${records.length}条）</label>
      </div>
      <div style="max-height:280px;overflow-y:auto;">
        ${recordsHtml}
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="close-modal-btn">关闭</button>
      </div>
    `;

    showModal(html, function(modal) {
      modal.querySelector('#close-modal-btn').addEventListener('click', function() {
        closeModal();
        if (onClose) onClose();
      });
      
      modal.querySelector('#quick-add-btn').addEventListener('click', function() {
        const points = parseInt(modal.querySelector('#quick-points').value);
        const reason = modal.querySelector('#quick-reason').value || '管理员调整';
        if (isNaN(points)) {
          alert('请输入有效的积分数值');
          return;
        }
        adjustMemberPoints(member.id, points, reason);
        openScoreEditModal(member, onClose);
      });

      modal.querySelectorAll('.admin-edit-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const recordId = this.dataset.id;
          const record = records.find(r => r.id === recordId);
          if (!record) return;
          openRecordEditModal(record, function() {
            openScoreEditModal(member, onClose);
          });
        });
      });

      modal.querySelectorAll('.admin-delete-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const recordId = this.dataset.id;
          if (confirm('确定要删除这条积分记录吗？')) {
            deleteScoreRecord(recordId);
            openScoreEditModal(member, onClose);
          }
        });
      });
    });
  }

  function openRecordEditModal(record, onClose) {
    const html = `
      <h2 class="admin-modal-title">✏️ 编辑积分记录</h2>
      <div style="margin-bottom:16px;">
        <label class="admin-label">积分数值</label>
        <input type="number" id="edit-points" class="admin-input" value="${record.points}" />
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">原因/说明</label>
        <input type="text" id="edit-reason" class="admin-input" value="${escapeHtml(record.reason || '')}" />
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">类型</label>
        <input type="text" id="edit-type" class="admin-input" value="${escapeHtml(record.record_type || '')}" />
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="cancel-edit-btn">取消</button>
        <button class="admin-btn-primary" id="save-edit-btn">保存</button>
      </div>
    `;

    showModal(html, function(modal) {
      modal.querySelector('#cancel-edit-btn').addEventListener('click', closeModal);
      modal.querySelector('#save-edit-btn').addEventListener('click', function() {
        const points = parseInt(modal.querySelector('#edit-points').value);
        const reason = modal.querySelector('#edit-reason').value;
        const recordType = modal.querySelector('#edit-type').value;
        if (isNaN(points)) {
          alert('请输入有效的积分数值');
          return;
        }
        updateScoreRecord(record.id, { points, reason, record_type: recordType });
        closeModal();
        if (onClose) onClose();
      });
    });
  }

  function openMemberSelectModal(title, onSelect) {
    const members = getMembers();
    
    const html = `
      <h2 class="admin-modal-title">👤 ${escapeHtml(title)}</h2>
      <div style="margin-bottom:12px;">
        <input type="text" id="member-search" class="admin-input" placeholder="搜索成员昵称..." />
      </div>
      <div id="member-list" style="max-height:400px;overflow-y:auto;">
        ${members.map(m => `
          <div class="admin-member-item" data-id="${m.id}" data-name="${escapeHtml(m.nickname)}">
            <div class="admin-member-avatar">${escapeHtml(m.nickname.charAt(0))}</div>
            <div class="admin-member-info">
              <div class="admin-member-name">${escapeHtml(m.nickname)}</div>
              <div class="admin-member-score">⭐ ${calculateMemberPoints(m.id)} 积分</div>
            </div>
            <div class="admin-member-action">
              <button class="admin-btn-primary" style="padding:6px 12px;font-size:12px;">调整积分</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="close-modal-btn">关闭</button>
      </div>
    `;

    showModal(html, function(modal) {
      modal.querySelector('#close-modal-btn').addEventListener('click', closeModal);
      
      const searchInput = modal.querySelector('#member-search');
      const memberList = modal.querySelector('#member-list');
      
      searchInput.addEventListener('input', function() {
        const keyword = this.value.toLowerCase();
        memberList.querySelectorAll('.admin-member-item').forEach(item => {
          const name = item.dataset.name.toLowerCase();
          item.style.display = name.includes(keyword) ? '' : 'none';
        });
      });

      memberList.querySelectorAll('.admin-member-item').forEach(item => {
        item.addEventListener('click', function() {
          const memberId = this.dataset.id;
          const member = members.find(m => m.id === memberId);
          if (member) {
            closeModal();
            onSelect(member);
          }
        });
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
            const hasList = card.querySelector('[class*="space-y"], [class*="list"], .grid');
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
    if (!path.includes('/admin') && !path.includes('/user-management') && !path.includes('/dashboard')) return;
    
    if (document.querySelector('.admin-score-management-section')) return;

    const tryAddScoreSection = function() {
      if (document.querySelector('.admin-score-management-section')) return true;

      const members = getMembers();
      const totalScore = members.reduce((sum, m) => sum + calculateMemberPoints(m.id), 0);
      const topMembers = [...members]
        .map(m => ({ ...m, score: calculateMemberPoints(m.id) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const sectionHtml = `
        <div class="admin-score-management-section admin-animate-in" style="margin-bottom:24px;">
          <div class="admin-section-title">🎯 积分管理中心</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px;">
            <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:14px;text-align:center;">
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px;">成员总数</div>
              <div style="font-size:24px;font-weight:700;color:#fbbf24;">${members.length}</div>
            </div>
            <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:14px;text-align:center;">
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px;">总积分</div>
              <div style="font-size:24px;font-weight:700;color:#4ade80;">${totalScore}</div>
            </div>
          </div>
          
          <div class="admin-points-adjust-card">
            <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:12px;">⚡ 快速调整积分</div>
            <div style="margin-bottom:12px;">
              <button id="admin-select-member-btn" class="admin-btn-primary" style="width:100%;padding:12px;font-size:14px;">
                👤 选择成员调整积分
              </button>
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">
              点击按钮选择成员，查看并调整其积分记录
            </div>
          </div>

          <div class="admin-score-manage-section">
            <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:12px;">🏆 积分排行榜 TOP 5</div>
            <div style="max-height:240px;overflow-y:auto;">
              ${topMembers.length === 0 ? '<div class="admin-empty">暂无成员数据</div>' : topMembers.map((m, idx) => `
                <div class="admin-score-row" data-id="${m.id}">
                  <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                    <div style="width:28px;height:28px;border-radius:50%;background:${idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#f59e0b' : 'rgba(255,255,255,0.1)'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;flex-shrink:0;">${idx + 1}</div>
                    <div class="admin-score-row-info">
                      <div class="admin-score-row-name">${escapeHtml(m.nickname)}</div>
                    </div>
                  </div>
                  <span class="admin-score-row-points positive">${m.score}</span>
                  <div class="admin-score-row-actions">
                    <button class="admin-manage-member-btn" data-id="${m.id}" style="padding:5px 10px;font-size:11px;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.3);border-radius:6px;cursor:pointer;">管理</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      let insertTarget = null;
      let insertMethod = 'after';

      const pageSelectors = [
        '.user-management',
        '[class*="user-management"]',
        '[class*="admin"]',
        '.max-w-6xl',
        '[class*="container"]',
        'main',
        '#app > div'
      ];

      for (const selector of pageSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          if (selector.includes('user-management') || selector.includes('admin')) {
            insertTarget = el.firstElementChild;
            insertMethod = 'prepend';
          } else {
            insertTarget = el;
            insertMethod = 'prepend';
          }
          break;
        }
      }

      const headingSelectors = ['h1', 'h2', '.text-center', '[class*="text-center"]'];
      for (const selector of headingSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent && (el.textContent.includes('管理') || el.textContent.includes('用户'))) {
          insertTarget = el.parentElement;
          insertMethod = 'after';
          break;
        }
      }

      if (!insertTarget) return false;

      const section = document.createElement('div');
      section.innerHTML = sectionHtml;
      const scoreSection = section.firstElementChild;

      if (insertMethod === 'prepend') {
        insertTarget.insertBefore(scoreSection, insertTarget.firstChild);
      } else {
        insertTarget.parentNode.insertBefore(scoreSection, insertTarget.nextSibling);
      }

      const selectBtn = document.getElementById('admin-select-member-btn');
      if (selectBtn) {
        selectBtn.addEventListener('click', function() {
          openMemberSelectModal('选择要调整积分的成员', function(member) {
            openScoreEditModal(member, function() {
              const section = document.querySelector('.admin-score-management-section');
              if (section) section.remove();
              tryAddScoreSection();
            });
          });
        });
      }

      document.querySelectorAll('.admin-manage-member-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const memberId = this.dataset.id;
          const member = findMemberById(memberId);
          if (member) {
            openScoreEditModal(member, function() {
              const section = document.querySelector('.admin-score-management-section');
              if (section) section.remove();
              tryAddScoreSection();
            });
          }
        });
      });

      return true;
    };

    let attempts = 0;
    const maxAttempts = 10;
    
    function tryWithDelay() {
      if (attempts >= maxAttempts) return;
      if (tryAddScoreSection()) return;
      attempts++;
      setTimeout(tryWithDelay, 300 * attempts);
    }

    tryWithDelay();

    const observer = new MutationObserver(function() {
      clearTimeout(window._userMgmtObserverTimer);
      window._userMgmtObserverTimer = setTimeout(function() {
        tryAddScoreSection();
      }, 200);
    });
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function initPageEnhancements() {
    if (isAdmin()) {
      setupSpecialRecordsAutoRefresh();
      enhanceSpecialRecordsPage();
      enhanceUserManagementPage();
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
      console.log('%c1. 管理后台页面有积分管理中心', 'color: rgba(255,255,255,0.6); font-size: 12px;');
      console.log('%c2. 特殊榜单页面有查看被ban名单按钮', 'color: rgba(255,255,255,0.6); font-size: 12px;');
      console.log('%c3. 特殊榜单添加后自动刷新', 'color: rgba(255,255,255,0.6); font-size: 12px;');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AdminExtensions = {
    isAdmin,
    getMembers,
    getScoreRecords,
    getSpecialRecords,
    getCurrentUser,
    calculateMemberPoints,
    addScoreRecord,
    updateScoreRecord,
    deleteScoreRecord,
    adjustMemberPoints,
    openScoreEditModal,
    openMemberSelectModal,
    refreshPage: () => window.location.reload()
  };

})();
