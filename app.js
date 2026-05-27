/**
 * 할 일 목록 앱 (Todo List App) — v4
 * ✅ 기본 뷰: 캘린더
 * ✅ 날짜 셀 클릭 → 새 레이아웃(제목 목록 → 클릭 시 세부사항 아코디언)
 * ✅ 일기장 기능 (날짜별 작성·조회·수정·삭제)
 * ✅ 검색 (할 일·일기, 날짜 포함 결과)
 * ✅ 우선순위 / 서브태스크 / 프로그레스바 / 캘린더 뷰
 */

(function () {
  'use strict';

  // ============================================================
  // 상태
  // ============================================================
  let todos            = [];
  let diaries          = {};        // { 'YYYY-MM-DD': { date, title, content, createdAt, updatedAt } }
  let currentView      = 'calendar'; // 'list' | 'calendar' | 'diary'
  let currentFilter    = 'all';
  let currentPriority  = 'medium';
  let calendarYear     = new Date().getFullYear();
  let calendarMonth    = new Date().getMonth();
  let dayDetailDate    = null;      // 캘린더에서 선택된 날짜 (새 레이아웃 표시용)
  let expandedTodos    = new Set(); // 리스트 뷰 서브태스크 펼침
  let expandedDayItems = new Set(); // 날짜 상세 뷰 아코디언 펼침
  let searchQuery      = '';
  let editingDiaryDate = null;      // 현재 수정 중인 일기 날짜

  // ============================================================
  // 상수
  // ============================================================
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const PRIORITY_LABEL = { high: '높음', medium: '보통', low: '낮음' };
  const STORAGE_TODO   = 'todos_v2';
  const STORAGE_V1     = 'todos_v1';
  const STORAGE_DIARY  = 'diaries_v1';

  // ============================================================
  // DOM 참조
  // ============================================================
  const todoInput       = document.getElementById('todo-input');
  const dueDateInput    = document.getElementById('due-date-input');
  const addBtn          = document.getElementById('add-btn');
  const todoList        = document.getElementById('todo-list');
  const emptyMsg        = document.getElementById('empty-msg');
  const counter         = document.getElementById('counter');
  const filterBtns      = document.querySelectorAll('.filter-btn');
  const clearCompBtn    = document.getElementById('clear-completed-btn');
  const viewBtns        = document.querySelectorAll('.view-btn');
  const inputArea       = document.getElementById('input-area');
  const priorityBtns    = document.querySelectorAll('.prio-btn');
  const progressFill    = document.getElementById('progress-fill');
  const progressText    = document.getElementById('progress-text');
  const progressTrack   = document.getElementById('progress-track');
  // 뷰 패널
  const viewListEl      = document.getElementById('view-list');
  const viewCalendarEl  = document.getElementById('view-calendar');
  const viewDiaryEl     = document.getElementById('view-diary');
  const viewSearchEl    = document.getElementById('view-search');
  // 캘린더
  const calPrevBtn      = document.getElementById('cal-prev');
  const calNextBtn      = document.getElementById('cal-next');
  const calTitle        = document.getElementById('cal-title');
  const calGrid         = document.getElementById('cal-grid');
  const calMain         = document.getElementById('cal-main');
  const dayDetailEl     = document.getElementById('day-detail');
  // 검색
  const searchInput     = document.getElementById('search-input');
  const searchClear     = document.getElementById('search-clear');
  const searchLabel     = document.getElementById('search-result-label');
  const searchList      = document.getElementById('search-result-list');
  const searchEmpty     = document.getElementById('search-empty');
  // 일기
  const diaryNewBtn     = document.getElementById('diary-new-btn');
  const diaryForm       = document.getElementById('diary-form');
  const diaryDateInput  = document.getElementById('diary-date-input');
  const diaryTitleInput = document.getElementById('diary-title-input');
  const diaryContentInput = document.getElementById('diary-content-input');
  const diarySaveBtn    = document.getElementById('diary-save-btn');
  const diaryCancelBtn  = document.getElementById('diary-cancel-btn');
  const diaryListEl     = document.getElementById('diary-list');
  const diaryEmpty      = document.getElementById('diary-empty');

  // ============================================================
  // 유틸
  // ============================================================
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function todayStr() { return formatDate(new Date()); }
  function genId()    { return Date.now() + Math.random(); }
  function fmtKor(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
  }

  /** 타임스탬프 → 'YYYY.MM.DD HH:MM' 형식 */
  function fmtDateTime(ts) {
    const d  = new Date(ts);
    const y  = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}.${mo}.${dd} ${hh}:${mm}`;
  }

  function normalizeTodo(t) {
    return { priority: 'medium', subtasks: [], dueDate: null, ...t };
  }

  // ============================================================
  // 스토리지
  // ============================================================
  function loadAll() {
    // Todos
    try {
      const r2 = localStorage.getItem(STORAGE_TODO);
      if (r2) { todos = JSON.parse(r2).map(normalizeTodo); }
      else {
        const r1 = localStorage.getItem(STORAGE_V1);
        if (r1) {
          todos = JSON.parse(r1).map(t => normalizeTodo({ ...t, dueDate: t.dueDate ?? null }));
          saveTodos();
        }
      }
    } catch (e) { console.warn('todo 로드 오류:', e); todos = []; }

    // Diaries
    try {
      const rd = localStorage.getItem(STORAGE_DIARY);
      diaries = rd ? JSON.parse(rd) : {};
    } catch (e) { console.warn('diary 로드 오류:', e); diaries = {}; }
  }

  function saveTodos()   { try { localStorage.setItem(STORAGE_TODO,  JSON.stringify(todos));   } catch(e){} }
  function saveDiaries() { try { localStorage.setItem(STORAGE_DIARY, JSON.stringify(diaries)); } catch(e){} }

  // ============================================================
  // Todo CRUD
  // ============================================================
  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;
    todos.unshift({ id: genId(), text: trimmed, completed: false,
      createdAt: Date.now(), dueDate: dueDateInput.value || null,
      priority: currentPriority, subtasks: [] });
    saveTodos(); render(); dueDateInput.value = '';
    return true;
  }

  function toggleTodo(id) {
    const t = todos.find(t => t.id === id);
    if (!t) return;
    t.completed = !t.completed;
    saveTodos(); render();
  }

  function deleteTodo(id, itemEl) {
    expandedTodos.delete(id);
    if (itemEl) {
      itemEl.classList.add('removing');
      itemEl.addEventListener('animationend', () => {
        todos = todos.filter(t => t.id !== id);
        saveTodos(); render();
      }, { once: true });
    } else {
      todos = todos.filter(t => t.id !== id);
      saveTodos(); render();
    }
  }

  function clearCompleted() {
    todos.filter(t => t.completed).forEach(t => expandedTodos.delete(t.id));
    todos = todos.filter(t => !t.completed);
    saveTodos(); render();
  }

  // ============================================================
  // 서브태스크 CRUD
  // ============================================================
  function addSubtask(todoId, text) {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return false;
    todo.subtasks.push({ id: genId(), text: trimmed, completed: false });
    saveTodos(); render();
    return true;
  }

  function toggleSubtask(todoId, subId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    const sub = todo.subtasks.find(s => s.id === subId);
    if (!sub) return;
    sub.completed = !sub.completed;
    saveTodos(); render();
  }

  function deleteSubtask(todoId, subId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    todo.subtasks = todo.subtasks.filter(s => s.id !== subId);
    saveTodos(); render();
  }

  // ============================================================
  // 일기 CRUD
  // ============================================================
  function saveDiary(date, title, content) {
    const trimTitle   = title.trim();
    const trimContent = content.trim();
    if (!trimContent) return false;
    const existing = diaries[date];
    diaries[date] = {
      date,
      title:     trimTitle || '(제목 없음)',
      content:   trimContent,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
    saveDiaries();
    return true;
  }

  function deleteDiary(date) {
    delete diaries[date];
    saveDiaries();
    render();
  }

  // ============================================================
  // 검색
  // ============================================================
  function setSearch(q) {
    searchQuery = q.trim();
    searchInput.value = q;
    searchClear.hidden = !searchQuery;
    render();
  }

  function getSearchResults() {
    const q = searchQuery.toLowerCase();
    if (!q) return { todos: [], diaries: [] };

    const matchTodos = todos.filter(t =>
      t.text.toLowerCase().includes(q) ||
      (t.dueDate && t.dueDate.includes(q))
    );

    const matchDiaries = Object.values(diaries).filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      d.date.includes(q)
    );

    return { todos: matchTodos, diaries: matchDiaries };
  }

  // ============================================================
  // 필터 & 정렬
  // ============================================================
  function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
      const on = btn.dataset.filter === filter;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    render();
  }

  function getFilteredTodos() {
    let filtered = todos;
    if (currentFilter === 'active')    filtered = filtered.filter(t => !t.completed);
    if (currentFilter === 'completed') filtered = filtered.filter(t =>  t.completed);
    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
  }

  // ============================================================
  // 렌더링 진입점
  // ============================================================
  function render() {
    // 검색 중이면 검색 결과 패널만 표시
    if (searchQuery) {
      showOnlyPanel(viewSearchEl);
      inputArea.hidden = true;
      renderSearch();
      updateCounter();
      return;
    }

    inputArea.hidden = (currentView === 'diary');

    // 날짜 상세 뷰 (캘린더 뷰 내부)
    if (currentView === 'calendar' && dayDetailDate) {
      showOnlyPanel(viewCalendarEl);
      calMain.hidden    = true;
      dayDetailEl.hidden = false;
      renderDayDetail(dayDetailDate);
      updateCounter();
      return;
    }

    if (currentView === 'list') {
      showOnlyPanel(viewListEl);
      renderList();
      renderProgressBar();
    } else if (currentView === 'calendar') {
      showOnlyPanel(viewCalendarEl);
      calMain.hidden    = false;
      dayDetailEl.hidden = true;
      renderCalendar();
    } else if (currentView === 'diary') {
      showOnlyPanel(viewDiaryEl);
      renderDiary();
    }

    updateCounter();
  }

  /** 특정 패널만 보이게 */
  function showOnlyPanel(target) {
    [viewListEl, viewCalendarEl, viewDiaryEl, viewSearchEl].forEach(p => {
      p.hidden = (p !== target);
    });
  }

  // ============================================================
  // 프로그레스바
  // ============================================================
  function renderProgressBar() {
    const total     = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = `${completed} / ${total} 완료`;
    progressTrack.setAttribute('aria-valuenow', pct);
    progressFill.className = 'progress-fill';
    if (pct === 0)      progressFill.classList.add('pct-zero');
    else if (pct < 50)  progressFill.classList.add('pct-low');
    else if (pct < 80)  progressFill.classList.add('pct-mid');
    else                progressFill.classList.add('pct-high');
  }

  // ============================================================
  // 리스트 뷰
  // ============================================================
  function renderList() {
    const filtered = getFilteredTodos();
    todoList.innerHTML = '';
    emptyMsg.hidden = filtered.length !== 0;
    filtered.forEach(t => todoList.appendChild(createTodoItem(t)));
  }

  // ============================================================
  // Todo 아이템 DOM (리스트 뷰용)
  // ============================================================
  function createTodoItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.classList.add('prio-border-' + todo.priority);
    li.dataset.id = todo.id;

    const row = document.createElement('div');
    row.className = 'todo-row';

    const checkbox = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked   = todo.completed;
    checkbox.setAttribute('aria-label', `${todo.text} 완료 토글`);
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const prioBadge = document.createElement('span');
    prioBadge.className   = `prio-badge prio-badge-${todo.priority}`;
    prioBadge.textContent = PRIORITY_LABEL[todo.priority];

    const span = document.createElement('span');
    span.className   = 'todo-text';
    span.textContent = todo.text;

    row.append(checkbox, prioBadge, span);

    if (todo.dueDate) {
      const today   = todayStr();
      const dateTag = document.createElement('span');
      dateTag.className = 'todo-due-date' + (!todo.completed && todo.dueDate < today ? ' todo-due-date--overdue' : '');
      dateTag.textContent = (!todo.completed && todo.dueDate < today) ? `⚠️ ${todo.dueDate}` : `📅 ${todo.dueDate}`;
      row.appendChild(dateTag);
    }

    const subCount     = todo.subtasks.length;
    const subCompleted = todo.subtasks.filter(s => s.completed).length;
    const isExpanded   = expandedTodos.has(todo.id);

    const toggleBtn = document.createElement('button');
    toggleBtn.className   = 'subtask-toggle-btn';
    toggleBtn.textContent = subCount > 0 ? `${isExpanded ? '▲' : '▼'} ${subCompleted}/${subCount}` : '＋';
    toggleBtn.title       = subCount > 0 ? (isExpanded ? '접기' : '펼치기') : '서브태스크 추가';
    toggleBtn.addEventListener('click', () => {
      expandedTodos.has(todo.id) ? expandedTodos.delete(todo.id) : expandedTodos.add(todo.id);
      render();
    });

    const delBtn = document.createElement('button');
    delBtn.className   = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', `${todo.text} 삭제`);
    delBtn.addEventListener('click', () => deleteTodo(todo.id, li));

    row.append(toggleBtn, delBtn);
    li.appendChild(row);

    if (isExpanded)       li.appendChild(createSubtaskSection(todo));
    else if (subCount > 0) li.appendChild(createSubtaskMiniBar(subCompleted, subCount));

    return li;
  }

  function createSubtaskSection(todo) {
    const section = document.createElement('div');
    section.className = 'subtask-section';
    const { length: subCount } = todo.subtasks;
    const subCompleted = todo.subtasks.filter(s => s.completed).length;

    if (subCount > 0) {
      section.appendChild(createSubtaskMiniBar(subCompleted, subCount));
      const ul = document.createElement('ul');
      ul.className = 'subtask-list';
      todo.subtasks.forEach(sub => {
        const li  = document.createElement('li');
        li.className = 'subtask-item' + (sub.completed ? ' completed' : '');
        const cb  = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'subtask-checkbox'; cb.checked = sub.completed;
        cb.addEventListener('change', () => toggleSubtask(todo.id, sub.id));
        const txt = document.createElement('span');
        txt.className = 'subtask-text'; txt.textContent = sub.text;
        const del = document.createElement('button');
        del.className = 'subtask-del-btn'; del.textContent = '✕';
        del.addEventListener('click', () => deleteSubtask(todo.id, sub.id));
        li.append(cb, txt, del); ul.appendChild(li);
      });
      section.appendChild(ul);
    }

    const addRow = document.createElement('div');
    addRow.className = 'subtask-add-row';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'subtask-input'; inp.placeholder = '서브태스크 추가...'; inp.maxLength = 80;
    const addSubBtn = document.createElement('button');
    addSubBtn.className = 'subtask-add-btn'; addSubBtn.textContent = '추가';
    const doAdd = () => { if (addSubtask(todo.id, inp.value)) inp.value = ''; else inp.focus(); };
    addSubBtn.addEventListener('click', doAdd);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
    addRow.append(inp, addSubBtn);
    section.appendChild(addRow);
    return section;
  }

  function createSubtaskMiniBar(completed, total) {
    const wrap  = document.createElement('div');
    wrap.className = 'subtask-mini-bar-wrap';
    const pct   = total === 0 ? 0 : Math.round((completed / total) * 100);
    const label = document.createElement('span');
    label.className = 'subtask-mini-label'; label.textContent = `${completed}/${total}`;
    const track = document.createElement('div');
    track.className = 'subtask-mini-track';
    const fill  = document.createElement('div');
    fill.className = 'subtask-mini-fill'; fill.style.width = pct + '%';
    track.appendChild(fill);
    wrap.append(label, track);
    return wrap;
  }

  // ============================================================
  // 캘린더 뷰
  // ============================================================
  function renderCalendar() {
    calGrid.innerHTML = '';
    calTitle.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;

    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const lastDate = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const today    = todayStr();
    const todoMap  = buildTodoMap(calendarYear, calendarMonth);

    for (let i = 0; i < firstDay; i++) {
      const e = document.createElement('div');
      e.className = 'cal-cell cal-empty';
      calGrid.appendChild(e);
    }
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = formatDate(new Date(calendarYear, calendarMonth, d));
      calGrid.appendChild(createDateCell(d, dateStr, today, todoMap[dateStr]));
    }
  }

  function buildTodoMap(year, month) {
    const map = {};
    todos.forEach(todo => {
      if (!todo.dueDate) return;
      const d = new Date(todo.dueDate + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      if (!map[todo.dueDate]) map[todo.dueDate] = { active: 0, completed: 0 };
      todo.completed ? map[todo.dueDate].completed++ : map[todo.dueDate].active++;
    });
    return map;
  }

  function createDateCell(day, dateStr, today, counts) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');

    if (dateStr === today) cell.classList.add('cal-today');
    if (dateStr < today && counts && counts.active > 0) cell.classList.add('cal-overdue');
    if (diaries[dateStr]) cell.classList.add('cal-has-diary');

    const dayNum = document.createElement('span');
    dayNum.className   = 'cal-day-num';
    dayNum.textContent = day;
    cell.appendChild(dayNum);

    if (counts) {
      if (counts.active > 0) {
        const b = document.createElement('span');
        b.className = 'cal-badge cal-badge-active'; b.textContent = counts.active;
        b.title = `진행 중 ${counts.active}개`; cell.appendChild(b);
      }
      if (counts.completed > 0) {
        const b = document.createElement('span');
        b.className = 'cal-badge cal-badge-done'; b.textContent = counts.completed;
        b.title = `완료 ${counts.completed}개`; cell.appendChild(b);
      }
    }

    if (diaries[dateStr]) {
      const dot = document.createElement('span');
      dot.className = 'cal-diary-dot'; dot.title = '일기 있음';
      cell.appendChild(dot);
    }

    cell.addEventListener('click', () => openDayDetail(dateStr));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openDayDetail(dateStr);
    });
    return cell;
  }

  // ============================================================
  // 날짜 상세 뷰 (새 레이아웃: 제목 목록 → 클릭 시 세부사항)
  // ============================================================
  function openDayDetail(dateStr) {
    dayDetailDate    = dateStr;
    expandedDayItems = new Set(); // 날짜 바뀌면 아코디언 초기화
    render();
  }

  function closeDayDetail() {
    dayDetailDate = null;
    render();
  }

  function renderDayDetail(dateStr) {
    dayDetailEl.innerHTML = '';

    // ── 헤더 ──
    const header = document.createElement('div');
    header.className = 'day-detail-header';

    const backBtn = document.createElement('button');
    backBtn.className   = 'day-back-btn';
    backBtn.textContent = '← 캘린더';
    backBtn.addEventListener('click', closeDayDetail);

    const dateTitle = document.createElement('h2');
    dateTitle.className   = 'day-detail-date';
    dateTitle.textContent = fmtKor(dateStr);

    header.append(backBtn, dateTitle);
    dayDetailEl.appendChild(header);

    // ── 일기 섹션 ──
    const diarySection = document.createElement('div');
    diarySection.className = 'day-section';

    const diarySectionTitle = document.createElement('h3');
    diarySectionTitle.className   = 'day-section-title';
    diarySectionTitle.textContent = '📔 일기';
    diarySection.appendChild(diarySectionTitle);

    const entry = diaries[dateStr];
    if (entry) {
      const card = createDiaryCard(entry, true); // compact=true
      diarySection.appendChild(card);
    } else {
      const writeBtn = document.createElement('button');
      writeBtn.className   = 'day-diary-write-btn';
      writeBtn.textContent = '✏️ 이 날 일기 쓰기';
      writeBtn.addEventListener('click', () => {
        switchView('diary');
        openDiaryForm(dateStr);
      });
      diarySection.appendChild(writeBtn);
    }

    dayDetailEl.appendChild(diarySection);

    // ── 할 일 섹션 ──
    const todoSection = document.createElement('div');
    todoSection.className = 'day-section';

    const dayTodos = todos.filter(t => t.dueDate === dateStr)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      });

    const todoSectionTitle = document.createElement('h3');
    todoSectionTitle.className   = 'day-section-title';
    todoSectionTitle.textContent = `📋 할 일 (${dayTodos.length}개)`;
    todoSection.appendChild(todoSectionTitle);

    if (dayTodos.length === 0) {
      const none = document.createElement('p');
      none.className   = 'day-empty';
      none.textContent = '이 날짜에 등록된 할 일이 없습니다.';
      todoSection.appendChild(none);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'day-todo-list';
      dayTodos.forEach(todo => ul.appendChild(createDayTodoItem(todo)));
      todoSection.appendChild(ul);
    }

    dayDetailEl.appendChild(todoSection);
  }

  /**
   * 날짜 상세 뷰의 Todo 아이템
   * - 기본: 제목만 표시 (아코디언 닫힘)
   * - 클릭: 세부사항 펼침 (체크박스, 마감일, 서브태스크)
   */
  function createDayTodoItem(todo) {
    const li = document.createElement('li');
    li.className = 'day-todo-item' + (todo.completed ? ' completed' : '');
    li.classList.add('prio-border-' + todo.priority);

    const isExpanded = expandedDayItems.has(todo.id);

    // ── 제목 행 (클릭 가능) ──
    const titleRow = document.createElement('div');
    titleRow.className = 'day-todo-title-row';

    const arrow = document.createElement('span');
    arrow.className   = 'day-todo-arrow';
    arrow.textContent = isExpanded ? '▼' : '▶';

    const prioBadge = document.createElement('span');
    prioBadge.className   = `prio-badge prio-badge-${todo.priority}`;
    prioBadge.textContent = PRIORITY_LABEL[todo.priority];

    const titleText = document.createElement('span');
    titleText.className   = 'day-todo-title-text' + (todo.completed ? ' done' : '');
    titleText.textContent = todo.text;

    titleRow.append(arrow, prioBadge, titleText);
    titleRow.addEventListener('click', () => {
      isExpanded ? expandedDayItems.delete(todo.id) : expandedDayItems.add(todo.id);
      render();
    });

    li.appendChild(titleRow);

    // ── 세부사항 (펼쳤을 때) ──
    if (isExpanded) {
      const detail = document.createElement('div');
      detail.className = 'day-todo-detail';

      // 완료 토글
      const cbRow = document.createElement('div');
      cbRow.className = 'day-todo-detail-row';
      const cb  = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'todo-checkbox'; cb.checked = todo.completed;
      cb.addEventListener('change', () => toggleTodo(todo.id));
      const cbLabel = document.createElement('span');
      cbLabel.textContent = todo.completed ? '✅ 완료' : '⬜ 진행 중';
      cbLabel.className   = 'day-todo-status';
      cbRow.append(cb, cbLabel);
      detail.appendChild(cbRow);

      // 마감일
      if (todo.dueDate) {
        const dateRow = document.createElement('div');
        dateRow.className   = 'day-todo-detail-row';
        const today         = todayStr();
        const isOverdue = !todo.completed && todo.dueDate < today;
        // ✅ XSS 방지: innerHTML 대신 createElement + textContent 사용
        const dateSpanEl = document.createElement('span');
        dateSpanEl.className   = isOverdue ? 'todo-due-date--overdue' : 'todo-due-date';
        dateSpanEl.textContent = `${isOverdue ? '⚠️' : '📅'} 마감: ${todo.dueDate}`;
        dateRow.appendChild(dateSpanEl);
        detail.appendChild(dateRow);
      }

      // 서브태스크
      if (todo.subtasks.length > 0) {
        const subHeader = document.createElement('p');
        subHeader.className   = 'day-sub-header';
        const done = todo.subtasks.filter(s => s.completed).length;
        subHeader.textContent = `서브태스크 ${done}/${todo.subtasks.length}`;
        detail.appendChild(subHeader);

        const subUl = document.createElement('ul');
        subUl.className = 'day-subtask-list';
        todo.subtasks.forEach(sub => {
          const sli = document.createElement('li');
          sli.className = 'day-subtask-item' + (sub.completed ? ' done' : '');
          const scb = document.createElement('input');
          scb.type = 'checkbox'; scb.className = 'subtask-checkbox'; scb.checked = sub.completed;
          scb.addEventListener('change', () => toggleSubtask(todo.id, sub.id));
          const stxt = document.createElement('span');
          stxt.textContent = sub.text;
          sli.append(scb, stxt); subUl.appendChild(sli);
        });
        detail.appendChild(subUl);
      }

      li.appendChild(detail);
    }

    return li;
  }

  // ============================================================
  // 일기 뷰
  // ============================================================
  function openDiaryForm(date) {
    editingDiaryDate          = date || todayStr();
    diaryDateInput.value      = editingDiaryDate;
    diaryTitleInput.value     = diaries[editingDiaryDate]?.title.replace('(제목 없음)', '') || '';
    diaryContentInput.value   = diaries[editingDiaryDate]?.content || '';
    diaryForm.hidden          = false;
    diaryContentInput.focus();
  }

  function closeDiaryForm() {
    diaryForm.hidden     = true;
    editingDiaryDate     = null;
    diaryDateInput.value = '';
    diaryTitleInput.value = '';
    diaryContentInput.value = '';
  }

  function renderDiary() {
    const entries = Object.values(diaries).sort((a, b) => b.date.localeCompare(a.date));
    diaryListEl.innerHTML = '';
    diaryEmpty.hidden = entries.length !== 0;

    entries.forEach(entry => {
      diaryListEl.appendChild(createDiaryListItem(entry));
    });
  }

  function createDiaryListItem(entry) {
    const li = document.createElement('li');
    li.className = 'diary-entry';
    li.dataset.date = entry.date;

    const header = document.createElement('div');
    header.className = 'diary-entry-header';

    const dateSpan = document.createElement('span');
    dateSpan.className   = 'diary-entry-date';
    dateSpan.textContent = fmtKor(entry.date);

    const titleSpan = document.createElement('span');
    titleSpan.className   = 'diary-entry-title';
    titleSpan.textContent = entry.title;

    const actions = document.createElement('div');
    actions.className = 'diary-entry-actions';

    const editBtn = document.createElement('button');
    editBtn.className   = 'diary-action-btn';
    editBtn.textContent = '✏️';
    editBtn.title       = '수정';
    editBtn.addEventListener('click', e => { e.stopPropagation(); openDiaryForm(entry.date); renderDiary(); });

    const delBtn = document.createElement('button');
    delBtn.className   = 'diary-action-btn danger';
    delBtn.textContent = '🗑️';
    delBtn.title       = '삭제';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`"${entry.title}" 일기를 삭제할까요?`)) deleteDiary(entry.date);
    });

    actions.append(editBtn, delBtn);
    header.append(dateSpan, titleSpan, actions);

    // 작성/수정 시간 표시
    const timeRow = document.createElement('div');
    timeRow.className = 'diary-entry-timerow';

    const createdSpan = document.createElement('span');
    createdSpan.className   = 'diary-entry-time';
    createdSpan.textContent = `✍️ 작성 ${fmtDateTime(entry.createdAt)}`;

    timeRow.appendChild(createdSpan);

    // 수정된 경우 마지막 수정 시간 추가
    if (entry.updatedAt && entry.updatedAt !== entry.createdAt) {
      const updatedSpan = document.createElement('span');
      updatedSpan.className   = 'diary-entry-time diary-entry-time--updated';
      updatedSpan.textContent = `🔄 수정 ${fmtDateTime(entry.updatedAt)}`;
      timeRow.appendChild(updatedSpan);
    }

    // 내용 미리보기
    const preview = document.createElement('p');
    preview.className   = 'diary-entry-preview';
    preview.textContent = entry.content.length > 80 ? entry.content.slice(0, 80) + '...' : entry.content;

    li.append(header, timeRow, preview);
    return li;
  }

  function createDiaryCard(entry, compact) {
    const card = document.createElement('div');
    card.className = 'diary-card';

    const title = document.createElement('p');
    title.className   = 'diary-card-title';
    title.textContent = entry.title;

    // 작성/수정 시간
    const timeRow = document.createElement('div');
    timeRow.className = 'diary-card-timerow';
    const createdSpan = document.createElement('span');
    createdSpan.className   = 'diary-entry-time';
    createdSpan.textContent = `✍️ 작성 ${fmtDateTime(entry.createdAt)}`;
    timeRow.appendChild(createdSpan);
    if (entry.updatedAt && entry.updatedAt !== entry.createdAt) {
      const updatedSpan = document.createElement('span');
      updatedSpan.className   = 'diary-entry-time diary-entry-time--updated';
      updatedSpan.textContent = `🔄 수정 ${fmtDateTime(entry.updatedAt)}`;
      timeRow.appendChild(updatedSpan);
    }

    const content = document.createElement('p');
    content.className   = 'diary-card-content';
    content.textContent = compact && entry.content.length > 100
      ? entry.content.slice(0, 100) + '...'
      : entry.content;

    const editBtn = document.createElement('button');
    editBtn.className   = 'diary-card-edit-btn';
    editBtn.textContent = '✏️ 수정';
    editBtn.addEventListener('click', () => {
      switchView('diary');
      openDiaryForm(entry.date);
    });

    card.append(title, timeRow, content, editBtn);
    return card;
  }

  // ============================================================
  // 검색 결과 뷰
  // ============================================================
  function renderSearch() {
    const { todos: matchTodos, diaries: matchDiaries } = getSearchResults();
    const total = matchTodos.length + matchDiaries.length;

    searchLabel.textContent = `"${searchQuery}" 검색 결과 — ${total}건`;
    searchList.innerHTML    = '';
    searchEmpty.hidden      = total !== 0;

    // 할 일 결과
    matchTodos.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'search-result-item';

      const badge = document.createElement('span');
      badge.className   = `prio-badge prio-badge-${todo.priority}`;
      badge.textContent = PRIORITY_LABEL[todo.priority];

      const text = document.createElement('span');
      text.className   = 'search-result-text';
      text.textContent = todo.text;

      const meta = document.createElement('span');
      meta.className   = 'search-result-meta';
      meta.textContent = todo.dueDate ? `📅 ${todo.dueDate}` : '날짜 없음';
      if (todo.completed) meta.textContent += '  ✅';

      li.append(badge, text, meta);

      // 날짜 있으면 클릭 시 해당 날짜로 이동
      if (todo.dueDate) {
        li.classList.add('clickable');
        li.addEventListener('click', () => {
          const d = new Date(todo.dueDate + 'T00:00:00');
          calendarYear  = d.getFullYear();
          calendarMonth = d.getMonth();
          setSearch('');
          switchView('calendar');
          openDayDetail(todo.dueDate);
        });
      }

      searchList.appendChild(li);
    });

    // 일기 결과
    matchDiaries.forEach(diary => {
      const li = document.createElement('li');
      li.className = 'search-result-item search-result-diary clickable';

      const icon = document.createElement('span');
      icon.textContent = '📔';

      const text = document.createElement('span');
      text.className   = 'search-result-text';
      text.textContent = diary.title;

      const meta = document.createElement('span');
      meta.className   = 'search-result-meta';
      meta.textContent = fmtKor(diary.date);

      li.append(icon, text, meta);
      li.addEventListener('click', () => {
        setSearch('');
        switchView('diary');
        openDiaryForm(diary.date);
      });

      searchList.appendChild(li);
    });
  }

  // ============================================================
  // 카운터
  // ============================================================
  function updateCounter() {
    const activeCount = todos.filter(t => !t.completed).length;
    counter.textContent = `남은 할 일: ${activeCount}개`;
  }

  // ============================================================
  // 뷰 전환
  // ============================================================
  function switchView(view) {
    currentView   = view;
    dayDetailDate = null;
    searchQuery   = '';
    searchInput.value  = '';
    searchClear.hidden = true;

    viewBtns.forEach(b => b.classList.toggle('active', b.dataset.view === view));
    render();
  }

  // ============================================================
  // 우선순위 선택
  // ============================================================
  function setPriority(p) {
    currentPriority = p;
    priorityBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.priority === p));
  }

  // ============================================================
  // 이벤트 바인딩
  // ============================================================
  addBtn.addEventListener('click', () => { if (addTodo(todoInput.value)) todoInput.value = ''; });
  todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') { if (addTodo(todoInput.value)) todoInput.value = ''; } });
  filterBtns.forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
  clearCompBtn.addEventListener('click', clearCompleted);
  viewBtns.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  priorityBtns.forEach(btn => btn.addEventListener('click', () => setPriority(btn.dataset.priority)));

  calPrevBtn.addEventListener('click', () => {
    if (--calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    render();
  });
  calNextBtn.addEventListener('click', () => {
    if (++calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    render();
  });

  // 검색
  searchInput.addEventListener('input', () => setSearch(searchInput.value));
  searchClear.addEventListener('click', () => setSearch(''));

  // 일기 폼
  diaryNewBtn.addEventListener('click', () => {
    if (diaryForm.hidden) openDiaryForm(todayStr());
    else closeDiaryForm();
  });

  diarySaveBtn.addEventListener('click', () => {
    const date = diaryDateInput.value;
    if (!date) { alert('날짜를 선택해 주세요.'); return; }
    if (saveDiary(date, diaryTitleInput.value, diaryContentInput.value)) {
      closeDiaryForm();
      render();
    } else {
      alert('내용을 입력해 주세요.');
    }
  });

  diaryCancelBtn.addEventListener('click', () => { closeDiaryForm(); render(); });

  // ============================================================
  // 초기화 — 캘린더 뷰로 시작
  // ============================================================
  loadAll();
  switchView('calendar');

})();
