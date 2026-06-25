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
  }

  function updateScoreRecord(id, updates) {
    const records = getScoreRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx] = { ...records[idx], ...updates };
      setStore('score_records', records);
      return true;
    }
    return false;
  }

  function deleteScoreRecord(id) {
    const records = getScoreRecords();
    const filtered = records.filter(r => r.id !== id);
    setStore('score_records', filtered);
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
      .admin-btn-danger { padding:10px 20px;font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,#ef4444,#dc2626);border:none;border-radius:10px;cursor:pointer;transition:all 0.2s; }
      .admin-btn-danger:hover { transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,0.4); }
      .admin-score-row { display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:8px; }
      .admin-score-row-info { flex:1; }
      .admin-score-row-name { font-size:14px;font-weight:500;color:#fff;margin-bottom:2px; }
      .admin-score-row-reason { font-size:12px;color:rgba(255,255,255,0.5); }
      .admin-score-row-points { font-size:16px;font-weight:700;margin-right:12px;min-width:60px;text-align:right; }
      .admin-score-row-points.positive { color:#4ade80; }
      .admin-score-row-points.negative { color:#f87171; }
      .admin-score-row-actions { display:flex;gap:6px; }
      .admin-empty { text-align:center;padding:30px;color:rgba(255,255,255,0.4);font-size:14px; }
      .admin-score-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;font-size:12px;font-weight:600;color:#fbbf24;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:9999px; }
      .admin-float-panel { position:fixed;bottom:20px;right:20px;z-index:9999; }
      .admin-float-btn { padding:12px 18px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(34,197,94,0.4);transition:all 0.2s;font-size:14px; }
      .admin-float-btn:hover { transform:translateY(-2px);box-shadow:0 6px 16px rgba(34,197,94,0.5); }
      .admin-quick-panel { position:absolute;bottom:60px;right:0;background:#1a1d23;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;min-width:220px;box-shadow:0 10px 40px rgba(0,0,0,0.5);display:none; }
      .admin-quick-panel.show { display:block; }
      .admin-quick-item { padding:10px 12px;border-radius:8px;cursor:pointer;color:rgba(255,255,255,0.8);font-size:13px;transition:all 0.15s;display:flex;align-items:center;gap:8px; }
      .admin-quick-item:hover { background:rgba(255,255,255,0.05);color:#fff; }
      .admin-quick-item.disabled { opacity:0.4;cursor:not-allowed; }
      .admin-quick-divider { height:1px;background:rgba(255,255,255,0.1);margin:6px 0; }
      .admin-score-total-card { background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:14px;text-align:center;margin-bottom:16px; }
      .admin-score-total-label { font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px; }
      .admin-score-total-value { font-size:28px;font-weight:700;color:#fbbf24; }
      .admin-edit-icon-btn { display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);cursor:pointer;transition:all 0.2s; }
      .admin-edit-icon-btn:hover { background:rgba(74,222,128,0.2); }
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

  function openScoreEditModal(member) {
    const records = getScoreRecords().filter(r => r.member_id === member.id);
    
    let recordsHtml = '';
    if (records.length === 0) {
      recordsHtml = '<div class="admin-empty">暂无积分记录</div>';
    } else {
      recordsHtml = records.map(r => `
        <div class="admin-score-row" data-id="${r.id}">
          <div class="admin-score-row-info">
            <div class="admin-score-row-name">${r.reason || '未命名记录'}</div>
            <div class="admin-score-row-reason">${r.record_type || ''} · ${new Date(r.created_at).toLocaleDateString('zh-CN')}</div>
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
      <h2 class="admin-modal-title">✏️ 积分管理 - ${member.nickname}</h2>
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
      modal.querySelector('#close-modal-btn').addEventListener('click', closeModal);
      
      modal.querySelector('#quick-add-btn').addEventListener('click', function() {
        const points = parseInt(modal.querySelector('#quick-points').value);
        const reason = modal.querySelector('#quick-reason').value || '管理员调整';
        if (isNaN(points)) {
          alert('请输入有效的积分数值');
          return;
        }
        adjustMemberPoints(member.id, points, reason);
        openScoreEditModal(member);
        triggerVueRefresh();
      });

      modal.querySelectorAll('.admin-edit-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const recordId = this.dataset.id;
          const record = records.find(r => r.id === recordId);
          if (!record) return;
          openRecordEditModal(record, function() {
            openScoreEditModal(member);
            triggerVueRefresh();
          });
        });
      });

      modal.querySelectorAll('.admin-delete-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const recordId = this.dataset.id;
          if (confirm('确定要删除这条积分记录吗？')) {
            deleteScoreRecord(recordId);
            openScoreEditModal(member);
            triggerVueRefresh();
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
        <input type="text" id="edit-reason" class="admin-input" value="${record.reason || ''}" />
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">类型</label>
        <input type="text" id="edit-type" class="admin-input" value="${record.record_type || ''}" />
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
      <h2 class="admin-modal-title">👤 ${title}</h2>
      <div style="margin-bottom:12px;">
        <input type="text" id="member-search" class="admin-input" placeholder="搜索成员..." />
      </div>
      <div id="member-list" style="max-height:400px;overflow-y:auto;">
        ${members.map(m => `
          <div class="admin-member-item" data-id="${m.id}" data-name="${m.nickname}" style="padding:12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all 0.15s;">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;">${m.nickname.charAt(0)}</div>
            <div style="flex:1;">
              <div style="color:#fff;font-weight:500;">${m.nickname}</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.5);">积分: ${calculateMemberPoints(m.id)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="close-modal-btn">取消</button>
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
        item.addEventListener('mouseenter', function() {
          this.style.background = 'rgba(255,255,255,0.05)';
        });
        item.addEventListener('mouseleave', function() {
          this.style.background = '';
        });
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

  function triggerVueRefresh() {
    try {
      const e = new Event('storage');
      window.dispatchEvent(e);
    } catch(e) {}
  }

  function findMemberById(memberId) {
    return getMembers().find(m => m.id === memberId);
  }

  function enhanceScoreboardPage() {
    if (!isAdmin()) return;
    
    const pageKey = 'scoreboard-enhanced';
    if (document.body.dataset[pageKey]) return;
    document.body.dataset[pageKey] = 'true';

    const addEditButtons = function() {
      const allCards = document.querySelectorAll('.mc-card');
      const members = getMembers();
      
      allCards.forEach(card => {
        if (card.querySelector('.admin-edit-score-btn')) return;
        
        const link = card.querySelector('a[href*="/members/"], [to*="/members/"]');
        if (!link) {
          const text = card.textContent || '';
          let foundMember = null;
          for (const m of members) {
            if (text.includes(m.nickname) && text.includes('积分')) {
              foundMember = m;
              break;
            }
          }
          if (foundMember) {
            addButtonToCard(card, foundMember);
          }
          return;
        }
        
        const href = link.getAttribute('href') || link.getAttribute('to') || '';
        const match = href.match(/\/members\/([^/?#]+)/);
        if (match) {
          const memberId = match[1];
          const member = findMemberById(memberId);
          if (member) {
            addButtonToCard(card, member);
          }
        }
      });
    };

    function addButtonToCard(card, member) {
      const btn = document.createElement('button');
      btn.className = 'admin-edit-score-btn';
      btn.style.cssText = 'margin-top:8px;padding:8px 14px;font-size:13px;font-weight:500;color:#4ade80;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:8px;cursor:pointer;transition:all 0.2s;width:100%;';
      btn.textContent = '📝 编辑积分';
      btn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(74,222,128,0.2)';
      });
      btn.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(74,222,128,0.1)';
      });
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openScoreEditModal(member);
      });
      card.appendChild(btn);
    }

    setTimeout(addEditButtons, 600);
    setTimeout(addEditButtons, 1500);
    setTimeout(addEditButtons, 3000);
    
    const observer = new MutationObserver(function() {
      clearTimeout(window._scoreObsTimer);
      window._scoreObsTimer = setTimeout(addEditButtons, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function enhanceMembersPage() {
    const pageKey = 'members-enhanced';
    if (document.body.dataset[pageKey]) return;
    document.body.dataset[pageKey] = 'true';

    const addScoreInfo = function() {
      const memberCards = document.querySelectorAll('[class*="bg-gradient"], .mc-card, [class*="from-white"]');
      const members = getMembers();
      
      memberCards.forEach(card => {
        if (card.querySelector('.admin-score-badge-display')) return;
        
        const link = card.querySelector('a[href*="/members/"], [to*="/members/"]');
        if (!link) return;
        
        const href = link.getAttribute('href') || link.getAttribute('to') || '';
        const match = href.match(/\/members\/([^/?#]+)/);
        if (!match) return;
        
        const memberId = match[1];
        const member = findMemberById(memberId);
        if (!member) return;
        
        const score = calculateMemberPoints(member.id);
        
        const badge = document.createElement('div');
        badge.className = 'admin-score-badge admin-score-badge-display';
        badge.innerHTML = `⭐ ${score} 积分`;
        
        const nameEl = card.querySelector('h3, h4, [class*="font-bold"], [class*="font-semibold"]');
        if (nameEl && nameEl.textContent.trim() === member.nickname) {
          nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
          badge.style.marginTop = '4px';
        } else {
          card.appendChild(badge);
          badge.style.marginTop = '8px';
        }
        
        if (isAdmin()) {
          const editBtn = document.createElement('button');
          editBtn.style.cssText = 'margin-top:8px;padding:8px 14px;font-size:12px;font-weight:500;color:#4ade80;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:8px;cursor:pointer;transition:all 0.2s;width:100%;';
          editBtn.textContent = '🔧 调整积分';
          editBtn.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(74,222,128,0.2)';
          });
          editBtn.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(74,222,128,0.1)';
          });
          editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openScoreEditModal(member);
          });
          card.appendChild(editBtn);
        }
      });
    };

    setTimeout(addScoreInfo, 600);
    setTimeout(addScoreInfo, 1500);
    setTimeout(addScoreInfo, 3000);
    
    const observer = new MutationObserver(function() {
      clearTimeout(window._memberObsTimer);
      window._memberObsTimer = setTimeout(addScoreInfo, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function enhanceMemberDetailPage() {
    const pageKey = 'detail-enhanced';
    if (document.body.dataset[pageKey]) return;
    document.body.dataset[pageKey] = 'true';

    const addScoreInfo = function() {
      const pathParts = getCurrentPath().split('/');
      const memberId = pathParts[pathParts.length - 1];
      if (!memberId || memberId === 'members') return;

      const member = findMemberById(memberId);
      if (!member) return;

      if (document.querySelector('.admin-detail-score-box')) return;

      const score = calculateMemberPoints(member.id);
      
      const containers = document.querySelectorAll('[class*="bg-white"], .mc-card, [class*="p-6"], [class*="p-8"]');
      let targetContainer = null;
      
      for (const container of containers) {
        if (container.textContent.includes(member.nickname) && container.children.length >= 2) {
          targetContainer = container;
          break;
        }
      }
      
      if (!targetContainer) {
        targetContainer = document.querySelector('.mc-card') || document.querySelector('[class*="p-6"]');
      }
      
      if (!targetContainer) return;

      const scoreBox = document.createElement('div');
      scoreBox.className = 'admin-detail-score-box';
      scoreBox.style.cssText = 'margin-top:16px;padding:18px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;';
      scoreBox.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px;">🎯 总积分</div>
            <div style="font-size:26px;font-weight:700;color:#fbbf24;">⭐ ${score}</div>
          </div>
          ${isAdmin() ? '<button class="admin-detail-edit-btn" style="padding:10px 16px;font-size:13px;font-weight:600;color:#fff;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:10px;cursor:pointer;">调整积分</button>' : ''}
        </div>
      `;
      
      targetContainer.appendChild(scoreBox);

      const editBtn = scoreBox.querySelector('.admin-detail-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', function() {
          openScoreEditModal(member);
        });
      }
    };

    setTimeout(addScoreInfo, 600);
    setTimeout(addScoreInfo, 1500);
    setTimeout(addScoreInfo, 3000);
    
    const observer = new MutationObserver(function() {
      clearTimeout(window._detailObsTimer);
      window._detailObsTimer = setTimeout(addScoreInfo, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function createFloatPanel() {
    if (!isAdmin()) return;
    if (document.querySelector('.admin-float-panel')) return;

    const panel = document.createElement('div');
    panel.className = 'admin-float-panel';
    panel.innerHTML = `
      <div class="admin-quick-panel" id="admin-quick-panel">
        <div class="admin-quick-item" data-action="scoreboard">
          📊 积分榜管理
        </div>
        <div class="admin-quick-item" data-action="members">
          👥 成员库管理
        </div>
        <div class="admin-quick-item" data-action="special">
          🏆 特殊榜单管理
        </div>
        <div class="admin-quick-divider"></div>
        <div class="admin-quick-item" data-action="quick-adjust">
          ⚡ 快速调整积分
        </div>
        <div class="admin-quick-item" data-action="refresh">
          🔄 刷新页面
        </div>
      </div>
      <button class="admin-float-btn" id="admin-float-btn">⚙️ 管理员</button>
    `;
    
    document.body.appendChild(panel);

    const floatBtn = panel.querySelector('#admin-float-btn');
    const quickPanel = panel.querySelector('#admin-quick-panel');
    
    floatBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      quickPanel.classList.toggle('show');
    });

    document.addEventListener('click', function() {
      quickPanel.classList.remove('show');
    });
    
    quickPanel.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    quickPanel.querySelectorAll('.admin-quick-item').forEach(item => {
      item.addEventListener('click', function() {
        const action = this.dataset.action;
        quickPanel.classList.remove('show');
        
        switch(action) {
          case 'scoreboard':
            if (window.location.pathname.includes('/scoreboard')) {
              alert('当前就在积分榜页面，滚动查看各玩家编辑按钮');
            } else {
              window.location.href = BASE + 'scoreboard';
            }
            break;
          case 'members':
            if (window.location.pathname.includes('/members')) {
              alert('当前就在成员库页面，各成员卡片有积分显示和调整按钮');
            } else {
              window.location.href = BASE + 'members';
            }
            break;
          case 'special':
            if (window.location.pathname.includes('/special-records')) {
              alert('当前就在特殊榜单页面，使用页面自带的添加/删除功能');
            } else {
              window.location.href = BASE + 'special-records';
            }
            break;
          case 'quick-adjust':
            openMemberSelectModal('选择要调整积分的成员', function(member) {
              openScoreEditModal(member);
            });
            break;
          case 'refresh':
            window.location.reload();
            break;
        }
      });
    });
  }

  function initPageEnhancements() {
    const path = getCurrentPath();

    if (path.includes('/scoreboard')) {
      enhanceScoreboardPage();
    } else if (path.includes('/members/')) {
      enhanceMemberDetailPage();
    } else if (path.includes('/members')) {
      enhanceMembersPage();
    }
    
    createFloatPanel();
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
        
        const panel = document.querySelector('.admin-float-panel');
        if (panel) panel.remove();
        
        Object.keys(document.body.dataset).forEach(key => {
          if (key.endsWith('Enhanced') || key.endsWith('-enhanced')) {
            delete document.body.dataset[key];
          }
        });
        document.body.removeAttribute('data-scoreboard-enhanced');
        document.body.removeAttribute('data-members-enhanced');
        document.body.removeAttribute('data-detail-enhanced');
        
        initPageEnhancements();
      }
    }, 500);

    console.log('%c⚡ 管理员扩展已加载', 'color: #4ade80; font-weight: bold; font-size: 14px;');
    console.log('%c当前用户: ' + (getCurrentUser()?.nickname || '未登录') + ' | 角色: ' + (isAdmin() ? '管理员' : '普通用户'), 'color: ' + (isAdmin() ? '#4ade80' : '#fbbf24') + '; font-weight: 500;');
    console.log('%c右下角有「⚙️ 管理员」浮动按钮，点击查看可用功能', 'color: rgba(255,255,255,0.6); font-size: 12px;');
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
