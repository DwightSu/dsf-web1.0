(function() {
  'use strict';

  const BASE = '/dsf-web1.0/';
  const STORAGE_PREFIX = 'mc_activity_';

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
      const userData = localStorage.getItem('mc_activity_user');
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

  function updateSpecialRecord(id, updates) {
    const records = getSpecialRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx] = { ...records[idx], ...updates };
      setStore('special_records', records);
      return true;
    }
    return false;
  }

  function deleteSpecialRecord(id) {
    const records = getSpecialRecords();
    const filtered = records.filter(r => r.id !== id);
    setStore('special_records', filtered);
    return filtered.length !== records.length;
  }

  function addSpecialRecord(record) {
    const records = getSpecialRecords();
    records.unshift(record);
    setStore('special_records', records);
  }

  function updateMember(id, updates) {
    const members = getMembers();
    const idx = members.findIndex(m => m.id === id);
    if (idx !== -1) {
      members[idx] = { ...members[idx], ...updates };
      setStore('custom_members', members);
      return true;
    }
    return false;
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
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;backdrop-filter:blur(4px);';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1d23;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
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

  function createEditButton(label, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'admin-edit-btn';
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:12px;font-weight:500;color:#4ade80;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:8px;cursor:pointer;transition:all 0.2s;';
    btn.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(74,222,128,0.2)';
      this.style.borderColor = 'rgba(74,222,128,0.5)';
    });
    btn.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(74,222,128,0.1)';
      this.style.borderColor = 'rgba(74,222,128,0.3)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createDeleteButton(onClick) {
    const btn = document.createElement('button');
    btn.textContent = '删除';
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:12px;font-weight:500;color:#f87171;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:8px;cursor:pointer;transition:all 0.2s;';
    btn.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(248,113,113,0.2)';
    });
    btn.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(248,113,113,0.1)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  function injectGlobalStyles() {
    if (document.getElementById('admin-ext-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-ext-styles';
    style.textContent = `
      .admin-edit-btn:hover { background: rgba(74,222,128,0.2) !important; }
      .admin-score-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;font-size:12px;font-weight:600;color:#fbbf24;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:9999px; }
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
      .admin-score-row { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:8px; }
      .admin-score-row-info { flex:1; }
      .admin-score-row-name { font-size:14px;font-weight:500;color:#fff;margin-bottom:2px; }
      .admin-score-row-reason { font-size:12px;color:rgba(255,255,255,0.5); }
      .admin-score-row-points { font-size:16px;font-weight:700;margin-right:12px; }
      .admin-score-row-points.positive { color:#4ade80; }
      .admin-score-row-points.negative { color:#f87171; }
      .admin-score-row-actions { display:flex;gap:6px; }
      .admin-empty { text-align:center;padding:30px;color:rgba(255,255,255,0.4);font-size:14px; }
      .admin-member-card-score { display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08); }
    `;
    document.head.appendChild(style);
  }

  function getScoreboardMembers() {
    const members = getMembers();
    return members.map(m => ({
      ...m,
      score: calculateMemberPoints(m.id)
    })).sort((a, b) => b.score - a.score);
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
            <button class="admin-edit-record-btn" data-id="${r.id}" style="padding:4px 8px;font-size:11px;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.3);border-radius:6px;cursor:pointer;">编辑</button>
            <button class="admin-delete-record-btn" data-id="${r.id}" style="padding:4px 8px;font-size:11px;background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.3);border-radius:6px;cursor:pointer;">删除</button>
          </div>
        </div>
      `).join('');
    }

    const totalPoints = calculateMemberPoints(member.id);

    const html = `
      <h2 class="admin-modal-title">✏️ 编辑积分 - ${member.nickname}</h2>
      <div style="margin-bottom:20px;padding:16px;background:rgba(251,191,36,0.05);border:1px solid rgba(251,191,36,0.2);border-radius:12px;text-align:center;">
        <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px;">当前总积分</div>
        <div style="font-size:28px;font-weight:700;color:#fbbf24;">${totalPoints}</div>
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">快速调整积分</label>
        <div style="display:flex;gap:10px;">
          <input type="number" id="quick-points" class="admin-input" placeholder="输入积分数值（正数加分，负数扣分）" style="flex:1;" />
          <input type="text" id="quick-reason" class="admin-input" placeholder="调整原因" style="flex:1;" />
          <button id="quick-add-btn" class="admin-btn-primary">调整</button>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label class="admin-label">积分记录（${records.length}条）</label>
      </div>
      <div style="max-height:300px;overflow-y:auto;">
        ${recordsHtml}
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="close-modal-btn">关闭</button>
      </div>
    `;

    showModal(html, function(modal, overlay) {
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
      });

      modal.querySelectorAll('.admin-edit-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const recordId = this.dataset.id;
          const record = records.find(r => r.id === recordId);
          if (!record) return;
          openRecordEditModal(record, function() {
            openScoreEditModal(member);
          });
        });
      });

      modal.querySelectorAll('.admin-delete-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const recordId = this.dataset.id;
          if (confirm('确定要删除这条积分记录吗？')) {
            deleteScoreRecord(recordId);
            openScoreEditModal(member);
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

  function openSpecialRecordEditModal(record) {
    const members = getMembers();
    const memberOptions = members.map(m => 
      `<option value="${m.id}" ${record.member_id === m.id ? 'selected' : ''}>${m.nickname}</option>`
    ).join('');

    const html = `
      <h2 class="admin-modal-title">✏️ 编辑特殊记录</h2>
      <div style="margin-bottom:16px;">
        <label class="admin-label">标题</label>
        <input type="text" id="sr-title" class="admin-input" value="${record.title || ''}" />
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">描述</label>
        <textarea id="sr-description" class="admin-input" rows="3" style="resize:vertical;">${record.description || ''}</textarea>
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">类型</label>
        <select id="sr-type" class="admin-input">
          <option value="special" ${record.record_type === 'special' ? 'selected' : ''}>特殊成就</option>
          <option value="achievement" ${record.record_type === 'achievement' ? 'selected' : ''}>成就</option>
          <option value="record" ${record.record_type === 'record' ? 'selected' : ''}>记录</option>
          <option value="other" ${record.record_type === 'other' ? 'selected' : ''}>其他</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">关联成员</label>
        <select id="sr-member" class="admin-input">
          <option value="">无</option>
          ${memberOptions}
        </select>
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="cancel-sr-btn">取消</button>
        <button class="admin-btn-primary" id="save-sr-btn">保存</button>
      </div>
    `;

    showModal(html, function(modal) {
      modal.querySelector('#cancel-sr-btn').addEventListener('click', closeModal);
      modal.querySelector('#save-sr-btn').addEventListener('click', function() {
        const updates = {
          title: modal.querySelector('#sr-title').value,
          description: modal.querySelector('#sr-description').value,
          record_type: modal.querySelector('#sr-type').value,
          member_id: modal.querySelector('#sr-member').value || null
        };
        updateSpecialRecord(record.id, updates);
        closeModal();
        setTimeout(refreshPage, 100);
      });
    });
  }

  function openAddSpecialRecordModal() {
    const members = getMembers();
    const memberOptions = members.map(m => 
      `<option value="${m.id}">${m.nickname}</option>`
    ).join('');

    const html = `
      <h2 class="admin-modal-title">➕ 添加特殊记录</h2>
      <div style="margin-bottom:16px;">
        <label class="admin-label">标题 *</label>
        <input type="text" id="sr-title" class="admin-input" placeholder="输入记录标题" />
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">描述</label>
        <textarea id="sr-description" class="admin-input" rows="3" style="resize:vertical;" placeholder="输入详细描述"></textarea>
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">类型</label>
        <select id="sr-type" class="admin-input">
          <option value="special">特殊成就</option>
          <option value="achievement">成就</option>
          <option value="record">记录</option>
          <option value="other">其他</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label class="admin-label">关联成员</label>
        <select id="sr-member" class="admin-input">
          <option value="">无</option>
          ${memberOptions}
        </select>
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn-secondary" id="cancel-sr-btn">取消</button>
        <button class="admin-btn-primary" id="save-sr-btn">添加</button>
      </div>
    `;

    showModal(html, function(modal) {
      modal.querySelector('#cancel-sr-btn').addEventListener('click', closeModal);
      modal.querySelector('#save-sr-btn').addEventListener('click', function() {
        const title = modal.querySelector('#sr-title').value.trim();
        if (!title) {
          alert('请输入标题');
          return;
        }
        const record = {
          id: 'sp_' + Date.now(),
          title: title,
          description: modal.querySelector('#sr-description').value,
          record_type: modal.querySelector('#sr-type').value,
          member_id: modal.querySelector('#sr-member').value || null,
          created_at: new Date().toISOString()
        };
        addSpecialRecord(record);
        closeModal();
        setTimeout(refreshPage, 100);
      });
    });
  }

  function refreshPage() {
    window.location.reload();
  }

  function enhanceScoreboardPage() {
    if (!isAdmin()) return;
    
    const checkAndEnhance = function() {
      const scoreRows = document.querySelectorAll('[class*="scoreboard"], [class*="score"], table tr');
      
      const members = getScoreboardMembers();
      
      const allText = document.body.innerText;
      if (!allText.includes('积分') && !allText.includes('排行榜')) return;

      if (document.querySelector('.admin-score-enhanced')) return;

      const cards = document.querySelectorAll('[class*="mc-card"], [class*="score-item"], [class*="rank-item"], tr');
      
      members.forEach((member, index) => {
        setTimeout(() => {
          const elements = document.querySelectorAll('*');
          elements.forEach(el => {
            if (el.textContent.trim() === member.nickname && el.children.length === 0) {
              const parent = el.closest('[class*="card"], [class*="item"], tr, [class*="row"]');
              if (parent && !parent.querySelector('.admin-edit-btn')) {
                const btn = createEditButton('编辑积分', function() {
                  openScoreEditModal(member);
                });
                parent.appendChild(btn);
                parent.classList.add('admin-score-enhanced');
              }
            }
          });
        }, index * 50);
      });
    };

    setTimeout(checkAndEnhance, 500);
    setTimeout(checkAndEnhance, 1500);
    
    const observer = new MutationObserver(function() {
      clearTimeout(window._scoreEnhanceTimer);
      window._scoreEnhanceTimer = setTimeout(checkAndEnhance, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function enhanceSpecialRecordsPage() {
    if (!isAdmin()) return;

    const addButtons = function() {
      if (document.querySelector('.admin-sr-enhanced')) return;

      const allText = document.body.innerText;
      if (!allText.includes('特殊') && !allText.includes('成就')) return;

      const records = getSpecialRecords();
      
      records.forEach(record => {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          if (el.textContent.trim() === record.title && el.children.length === 0) {
            const parent = el.closest('[class*="card"], [class*="item"], [class*="record"], tr, [class*="row"]');
            if (parent && !parent.querySelector('.admin-sr-btns')) {
              const btnContainer = document.createElement('div');
              btnContainer.className = 'admin-sr-btns';
              btnContainer.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
              
              const editBtn = createEditButton('编辑', function() {
                openSpecialRecordEditModal(record);
              });
              
              const deleteBtn = createDeleteButton(function() {
                if (confirm('确定要删除这条特殊记录吗？')) {
                  deleteSpecialRecord(record.id);
                  setTimeout(refreshPage, 100);
                }
              });
              
              btnContainer.appendChild(editBtn);
              btnContainer.appendChild(deleteBtn);
              parent.appendChild(btnContainer);
              parent.classList.add('admin-sr-enhanced');
            }
          }
        });
      });

      const pageTitle = document.querySelector('h1, h2');
      if (pageTitle && !document.querySelector('.admin-add-sr-btn')) {
        const addBtn = createEditButton('+ 添加记录', openAddSpecialRecordModal);
        addBtn.className = 'admin-add-sr-btn';
        addBtn.style.cssText = 'padding:8px 16px;font-size:13px;';
        pageTitle.parentElement.appendChild(addBtn);
      }
    };

    setTimeout(addButtons, 500);
    setTimeout(addButtons, 1500);
    
    const observer = new MutationObserver(function() {
      clearTimeout(window._srEnhanceTimer);
      window._srEnhanceTimer = setTimeout(addButtons, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function enhanceMembersPage() {
    const addScoreInfo = function() {
      if (document.querySelector('.admin-member-enhanced')) return;

      const allText = document.body.innerText;
      if (!allText.includes('成员') && !allText.includes('成员库')) return;

      const members = getMembers();
      
      members.forEach(member => {
        const score = calculateMemberPoints(member.id);
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          if (el.textContent.trim() === member.nickname && el.children.length === 0) {
            const parent = el.closest('[class*="card"], [class*="item"], [class*="member"], tr, [class*="row"]');
            if (parent && !parent.querySelector('.admin-score-badge')) {
              const badge = document.createElement('div');
              badge.className = 'admin-score-badge';
              badge.innerHTML = `⭐ ${score} 积分`;
              
              const nameEl = parent.querySelector('[class*="name"], h3, h4, strong');
              if (nameEl) {
                nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
              } else {
                el.parentNode.insertBefore(badge, el.nextSibling);
              }
              
              if (isAdmin()) {
                const editBtn = createEditButton('调整积分', function() {
                  openScoreEditModal(member);
                });
                editBtn.style.marginTop = '8px';
                parent.appendChild(editBtn);
              }
              
              parent.classList.add('admin-member-enhanced');
            }
          }
        });
      });
    };

    setTimeout(addScoreInfo, 500);
    setTimeout(addScoreInfo, 1500);
    
    const observer = new MutationObserver(function() {
      clearTimeout(window._memberEnhanceTimer);
      window._memberEnhanceTimer = setTimeout(addScoreInfo, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function enhanceMemberDetailPage() {
    const addScoreInfo = function() {
      if (document.querySelector('.admin-detail-enhanced')) return;

      const pathParts = window.location.pathname.split('/');
      const memberId = pathParts[pathParts.length - 1];
      if (!memberId || memberId === 'members') return;

      const member = getMembers().find(m => m.id === memberId);
      if (!member) return;

      const score = calculateMemberPoints(member.id);
      
      const infoSections = document.querySelectorAll('[class*="info"], [class*="detail"], [class*="profile"]');
      infoSections.forEach(section => {
        if (section.querySelector('.admin-detail-score')) return;
        
        const scoreInfo = document.createElement('div');
        scoreInfo.className = 'admin-detail-score';
        scoreInfo.style.cssText = 'margin-top:16px;padding:16px;background:rgba(251,191,36,0.05);border:1px solid rgba(251,191,36,0.2);border-radius:12px;';
        scoreInfo.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px;">总积分</div>
              <div style="font-size:24px;font-weight:700;color:#fbbf24;">⭐ ${score}</div>
            </div>
            ${isAdmin() ? '<button class="admin-edit-score-btn" style="padding:8px 16px;font-size:12px;font-weight:500;color:#4ade80;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:8px;cursor:pointer;">调整积分</button>' : ''}
          </div>
        `;
        
        section.appendChild(scoreInfo);
        section.classList.add('admin-detail-enhanced');

        const editBtn = scoreInfo.querySelector('.admin-edit-score-btn');
        if (editBtn) {
          editBtn.addEventListener('click', function() {
            openScoreEditModal(member);
          });
        }
      });
    };

    setTimeout(addScoreInfo, 500);
    setTimeout(addScoreInfo, 1500);
    
    const observer = new MutationObserver(function() {
      clearTimeout(window._detailEnhanceTimer);
      window._detailEnhanceTimer = setTimeout(addScoreInfo, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    injectGlobalStyles();

    const path = window.location.pathname;

    if (path.includes('/scoreboard')) {
      enhanceScoreboardPage();
    } else if (path.includes('/special-records')) {
      enhanceSpecialRecordsPage();
    } else if (path.includes('/members/')) {
      enhanceMemberDetailPage();
    } else if (path.includes('/members')) {
      enhanceMembersPage();
    }

    let lastPath = window.location.pathname;
    setInterval(function() {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        if (currentPath.includes('/scoreboard')) {
          enhanceScoreboardPage();
        } else if (currentPath.includes('/special-records')) {
          enhanceSpecialRecordsPage();
        } else if (currentPath.includes('/members/')) {
          enhanceMemberDetailPage();
        } else if (currentPath.includes('/members')) {
          enhanceMembersPage();
        }
      }
    }, 500);
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
    calculateMemberPoints,
    addScoreRecord,
    updateScoreRecord,
    deleteScoreRecord,
    adjustMemberPoints,
    updateSpecialRecord,
    deleteSpecialRecord,
    addSpecialRecord,
    openScoreEditModal,
    openSpecialRecordEditModal,
    refreshPage
  };

})();
